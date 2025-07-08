import numpy as np
from numerize import numerize
import math

e10 = math.sqrt(50)
e5 = math.sqrt(10)
e2 = math.sqrt(2)

def tick_spec(start, stop, count):
    """ A reproduction of the d3 tickSpec function to compute step based on inc returned by tick_spec.
        Args:
            start: The start value or leading edge of the first bin
            stop: The stop value or trailing edge of the last bin
            count: The number of desired bins

        Returns:
            a number - step value    
    """

    step = (stop - start) / max(0, count)
    power = math.floor(math.log10(step))
    error = step / pow(10, power)

    factor = 1
    if error >= e10:
        factor = 10
    elif error >= e5:
        factor = 5
    elif error >= e2:
        factor = 2
    else:
        factor = 1

    i1 = 0
    i2 = 0
    inc = 0
    if power < 0:
        inc = pow(10, -power) / factor
        i1 = round(start * inc)
        i2 = round(stop * inc)
        if (i1 / inc) < start:
            i1+=1
        if (i2 / inc) > stop:
            i2-=1
        inc = -inc
    else:
        inc = pow(10, power) * factor
        i1 = round(start / inc)
        i2 = round(stop / inc)
        if (i1 * inc) < start:
            i1+=1
        if (i2 * inc) > stop:
            i2-=1
    if i2 < i1 and 0.5 <= count and count < 2:
        return tick_spec(start, stop, count * 2)

    return [i1, i2, inc]

def tick_step(reverse, step):
    """ A reproduction of the d3 tickStep function to compute step based on inc returned by tick_spec.
        Args:
            reverse: Flag indicating if the range is descending
            step: Step or inc computed by tick_spec

        Returns:
            a number - step value    
    """
    if step < 0:
        step = 1 / -step
    if reverse:
        step = -step
    return step

def nice_range(start, stop, nbins=10):
    """ Computes the 'nice' or 'rounded' range.

    Args:
        start: The start value or leading edge of the first bin
        stop: The stop value or trailing edge of the last bin
        nbins: The number of desired bins

    Returns:
        start (nice), stop (nice), step based on the number of bins
    """

    prestep=0
    step=0
    maxIter = 10

    reverse = stop < start
    if reverse:
        start, stop = stop, start

    while maxIter > 0:
        step = tick_spec(start, stop, nbins)[2]
        if step == prestep:
            if reverse:
                    start, stop = stop, start
            step = tick_step(reverse, step)
            return start, stop, step
        elif step > 0:
            start = math.floor(start / step) * step
            stop = math.ceil(stop / step) * step
        elif step < 0:
            start = math.ceil(start * step) / step
            stop = math.floor(stop * step) / step
        else:
            break
        prestep = step
        maxIter-=1

    step = tick_step(reverse, step)
    return start, stop, step

def get_nice_division(start, stop, nbins):
    """ Computes the bin 'nice' or 'rounded' edges for a histogram.

    Args:
        start: The start value or leading edge of the first bin
        stop: The stop value or trailing edge of the last bin
        nbins: The number of desired bins

    Returns:
        A list of bin edges
    """
    nice_start, nice_stop, step = nice_range(start, stop, nbins)
    new_nbins = int((nice_stop - nice_start) / step)
    return np.linspace(nice_start, nice_stop, new_nbins).tolist()

def filter_data(data, filters):
    # Apply filters to dataframe
    for f in filters:
        filt_type = "Include" if f['type'] == 'In' else "Exclude"
        if f['isCat']:
            data.apply_nominal_filter(f['attr'], include=f['range'], ftype=filt_type)
        else:
            lb = -np.inf if np.isnan(float(f['range'][0])) else float(f['range'][0])
            ub = np.inf if np.isnan(float(f['range'][1])) else float(f['range'][1])
            data.apply_filter(f['attr'], lb=lb, ub=ub, ftype=filt_type)

def plot_scatter(data, filters, x, y):
    """ Computes data needed to display a scatterplot.

    Args:
        data: AK dataframe
        filters: filters that are applied to the data
        x: the attribute plotted on the x-axis
        y: the attribute plotted on the y-axis

    Returns:
        Dataframe of scatter points
    """

    data.create_checkpoint()
    xcats = []
    outDesc = data.describe(columns=[x,y])
    if x in data.get_catcols():
        xcats = list(data.unique(x))
        if x in data.orderings and type(data.orderings[x]) is list:
            xcats = data.orderings[x] + [i for i in xcats if i not in data.orderings[x]]
    filter_data(data, filters)
    inDesc = data.describe(columns=[x,y])

    inExtent = {
        "x":  xcats if x in data.get_catcols() else [inDesc[x]["min"], inDesc[x]["max"]],
        "y":  [inDesc[y]["min"], inDesc[y]["max"]] if inDesc[y]["count"] > 0 else [0, 0]
    }
    
    outExtent = {
        "x":  xcats if x in data.get_catcols() else [outDesc[x]["min"], outDesc[x]["max"]],
        "y":  [outDesc[y]["min"], outDesc[y]["max"]] if outDesc[y]["count"] > 0 else [0, 0]
    }

    inData = data.to_pandas(filtered=True, data_columns=[x,y]).to_json(orient='records')
    # Note: if using the Data Class inverse_filter=True will cause issues when using the Data Class
    #       as inverting the filter will include points outside all filters including filetered out in the transformer
    #       The current solution is use the DataSample class with nsamples set to the full dataset length in the pattern_browser_api.py
    outData = data.to_pandas(filtered=True, inverse_filter=True, data_columns=[x,y]).to_json(orient='records')

    data.restore_checkpoint()
    return { 'inData': inData, 'outData': outData, 'inExtent': inExtent, 'outExtent': outExtent }

def plot_box_plot(data):
    """ Returns data needed to compute the box plot.

    Args:
        data: 2D dataframe containing the x-value in the
    first column and y-value in the second column.

    Returns:
        A dataframe containing the label, min, max, median, q1 and q3
    values stratified on the x-axis.
    """
    if data.shape[1] != 2:
        raise ValueError("Expected data to have 2 columns.")

    xattr, yattr = data.columns

    boxdata = data.groupby(xattr)[yattr].agg(
        min='min',
        max='max',
        median='median',
        mean='mean',
        q1=lambda v: v.quantile(.25),
        q3=lambda v: v.quantile(.75)
    )

    return boxdata.reset_index().sort_values(by='mean').rename(columns={xattr: 'label'})

def plot_dual_hist(data, filters, x, y):
    """ Computes data needed to display a categorized histograms.

    Args:
        data: AK dataframe
        filters: filters that are applied to the data
        x: The X attribute for the bar chart
        y: The Y attribute or the attribute by which each X attribute is divided

    Returns:
        A dataframe containing count and divisions.
    """

    classes = list(data.unique(y))
    desc = data.describe_col(x, drop_inf=True)
    div = get_nice_division(desc['min'], desc['max'], 25)

    data.create_checkpoint()

    # Get histograms for all data
    counts, bins = data.histogram_by(x, y, div)
    outData = {}
    for c in classes:
        outCount = counts.get(c,[0]*(len(div)-1))
        outData[str(c)] = [int(val) for val in outCount]

    # Filter data based
    filter_data(data, filters)

    # Get histograms for filtered data
    counts, bins = data.histogram_by(x, y, div)
    inData = {}
    for c in classes:
        inCount = counts.get(c,[0]*(len(div)-1))
        inData[str(c)] = [int(val) for val in inCount]

    data.restore_checkpoint()

    # Format bin edges to ranges for display
    bins = []
    for i in range(len(div)-1):
        bins.append(numerize.numerize(div[i], 2) + "-" + numerize.numerize(div[i+1], 2))


    return {
        "categories": [str(c) for c in bins],
        "classes": [str(c) for c in classes],
        "inData": inData,
        "outData": outData
    }

def plot_bar_chart(data, filters, x, y):
    """ Computes data needed to display a bar chart.

    Args:
        data: AK dataframe
        filters: filters that are applied to the data
        x: The X attribute for the bar chart
        y: The Y attribute or the attribute by which each X category is divided

    Returns:
        A dataframe containing the y-values, x-values, and counts
    stratified on the x-axis.
    """
    data.create_checkpoint()
    
    groupAll = data.group_by([x,y]).fillna("nan")
    filter_data(data, filters)
    groupFilt = data.group_by([x,y]).fillna("nan")
    
    data.restore_checkpoint()

    
    categories = list(groupAll[x].unique())
    classes = list(groupAll[y].unique())

    if x in data.orderings and type(data.orderings[x]) is list:
        categories = data.orderings[x] + [i for i in categories if i not in data.orderings[x]]

    outData = {}
    inData = {}
    for c in classes:
        dfAll = groupAll[groupAll[y] == c]
        dfFilt = groupFilt[groupFilt[y] == c]

        outCounts = dict(zip(dfAll[x], dfAll["counts"]))
        inCounts = dict(zip(dfFilt[x], dfFilt["counts"]))

        cls = str(c)
        outData[cls] = []
        inData[cls] = []

        for cat in categories:
            outData[cls].append(int(outCounts.get(cat, 0)))
            inData[cls].append(int(inCounts.get(cat, 0)))

    result = {
        "categories": [str(c) for c in categories],
        "classes": [str(c) for c in classes],
        "inData": inData,
        "outData": outData
    }

    return result

def plot_data(data, target, attribute, filters=[], plot='Scatterplot', targetType='numeric',  **kwargs):
    """ Computes the necessary data to render a plot.

    Args:
        data: AK Dataframe
        target: Target attribute (y-axis)
        attribute: Covarite attribute (x-axis)
        filters: Covarite attribute (x-axis)
        plot: The type of plot or chart
        targetType: numeric or binary

    Returns:
        Dict/Object required by the frontend for the plot.
    """

    if target is None:
        raise TypeError("target must be specified")

    if attribute is None:
        raise TypeError("attribute must be specified")

    if targetType not in ['numeric', 'binary']:
        raise ValueError("targetType must be either numeric or binary.")

    
    result = "Plot Data"
    if plot == 'Scatterplot':
        result = plot_scatter(data, filters, attribute, target)
    else:
        result = plot_bar_chart(data, filters, attribute, target)\
                 if attribute in data.get_catcols() else\
                 plot_dual_hist(data, filters, attribute, target)

    return result
