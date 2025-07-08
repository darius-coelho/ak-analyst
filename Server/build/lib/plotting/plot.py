import pandas as pd
import numpy as np

def plot_scatter(x, y, threshold=1000, grid_dim=100):
    """ Returns (possibly sampled) scatter points. 
    
    Args:
        x: vector of x-axis data points
        y: vector of y-axis data points
        threshold: Min. size of points to show before sampling takes place.
        grid_dim: Dimension of the grid to sample with for binned aggregation.

    Returns:
        Dataframe of scatter points
    """

    if x.shape != y.shape:
        raise ValueError("x and y vectors must be aligned")

    N = x.shape[0]
    if N < threshold:
        return pd.DataFrame([x, y]).T

    # sample using binned aggregation
    xid = pd.cut(x, bins=grid_dim, labels=False)
    yid = pd.cut(y, bins=grid_dim, labels=False)

    sample_fun = lambda xlev: xlev.sample(grid_dim) if xlev.shape[0] > grid_dim else xlev[:]
    samp = pd.DataFrame([xid, yid]).T.groupby(x.name).apply(sample_fun)
    
    sid = samp.index.get_level_values(1)
    return pd.DataFrame([x[sid], y[sid]]).T

    
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


def plot_dual_hist(data):
    """ Returns data needed to compute the dual histograms. 

    Args: 
        data: 2D dataframe containing the x-value in the 
    first column and y-value in the second column.

    Returns:
        A dataframe containing count and divisions.
    """
    if data.shape[1] != 2:
        raise ValueError("Expected data to have 2 columns.")

    # TODO: Evaluate if there is a better way of representing this.
    xattr, yattr = data.columns
    
    uniq = data[yattr].unique()
    columns = [yattr, "count", "division"]
    summaryData = pd.DataFrame(columns=columns)
    row=0
    count, division = [], []
    for l in uniq:
        x = data[data[yattr] == l]                           
        if len(division) == 0:
            count, division = np.histogram(x[xattr].dropna(), bins=16)
        else:
            count, division = np.histogram(x[xattr].dropna(), division)
        summaryData.at[row, yattr] = l
        summaryData.at[row, "count"] = count
        summaryData.at[row, "division"] = division
        row+=1
            
    return summaryData


def plot_bar_chart(data):
    """ Returns data needed to compute the bar chart. 
    
    Args: 
        data: 2D dataframe containing the x-value in the 
    first column and y-value in the second column.

    Returns:
        A dataframe containing the y-values, x-values, and counts
    stratified on the x-axis.
    """
    if data.shape[1] != 2:
        raise ValueError("Expected data to have 2 columns.")
    
    xattr, yattr = data.columns    
    return data.groupby([yattr, xattr]).agg('size').reset_index().rename(columns={0: 'count'})
    
    
def plot_data(data, target=None, attribute=None,
              is_category=False, 
              targetType='numeric', shap=None,
              selectedFilters=None, **kwargs):
    """ Creates the necessary data to render the appropriate plot. 
    
    Args:
        data: Dataframe containing raw data.
        target: Target attribute (y-axis)
        attribute: Covarite attribute (x-axis)
        is_category: True if 'attribute' is categorical. False o.w.
        targetType: numeric or binary.
        shap: pattern description (keys include attribute, shap, range)
        selectedFilters: List of bools indicating if data should be filtered 
            based on the corresponding description.
    
    Returns:
        pandas Dataframe containing plot data.
    """
    
    if len(shap) != len(selectedFilters):
        raise ValueError("Mismatch between shap and selectedFilters")

    if target is None:
        raise TypeError("target must be specified")

    if attribute is None:
        raise TypeError("attribute must be specified")

    if targetType not in ['numeric', 'binary']:
        raise ValueError("targetType must be either numeric or binary.")
    
    # get the list of attribute along with the lower and upper bounds
    filtered = [[s['attribute'], *s['range']] for s, f in zip(shap, selectedFilters) if f]

    if filtered:
        # split them into separate lists.
        fattr, flb, fub = [list(l) for l in zip(*filtered)]  # convert to list
        flb = [float(el) for el in flb]  # convert to float
        fub = [float(el) for el in fub]  # convert to float
        data = data[((data[fattr] >= flb) & (data[fattr] <= fub)).all(axis=1)]

    if is_category and targetType == 'numeric':
        return plot_box_plot(data[[attribute, target]])

    if is_category and targetType == 'binary':
        return plot_bar_chart(data[[attribute, target]])

    if targetType == 'binary':
        # target is binary and attribute is numeric
        return plot_dual_hist(data[[attribute, target]])
        
    return plot_scatter(data[attribute], data[target])
