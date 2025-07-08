/**
 * Returns a list of chart options with options being disabled
 * if valid column types are not present
 * @param {array} cols - List of all columns
 * @param {array} numCols - List of numerical columns
 * @param {array} catCols - List of categorical/ordinal columns
 * @param {array} dateCols - List of date time columns
 */
export const getChartTypes = (cols, numCols, catCols, dateCols) => [
  { chart: "None", disabled: false},
  { chart: "Bar Chart", disabled: catCols.length < 1},
  { chart: "Pie Chart", disabled: catCols.length < 1},
  { chart: "Histogram", disabled: numCols.length < 1},
  { chart: "Line Chart", disabled: numCols.length < 1 || dateCols.length < 1},
  { chart: "Scatterplot", disabled: cols.length < 1},
  { chart: "Balloon Chart", disabled: catCols.length < 1},
  { chart: "Parallel Coordinates", disabled: cols.length < 2},
  { chart: "Correlation Plot", disabled: catCols.length < 1}
]


/**
 * Initializes the config of the bar chart.
 * @param {array} catCols - List of categorical/ordinal columns
 */
const initializeBarChart = (catCols) => {
  return {
    chart: 'Bar Chart',
    x: catCols[0],
    y: 'ak_none',
    color: "None",
    func: "Count",
    barColor: "#08519c",
  }
}

/**
 * Initializes the config of the bar chart.
 */
 const initializePieChart = (catCols) => {
  return {
    chart: 'Pie Chart',
    sAttr: catCols[0],
    sMap: 'Count',
    R: 'ak_none',
    aggFunc: "Mean",
    rSizeMin: 0,
    rSizeMax: 175
  }
}

/**
 * Initializes the config of the line chart.
 * @param {array} cols - List of all columns
 * @param {array} numCols - List of numerical columns
 * @param {array} dateCols - List of date time columns
 */
const initializeLineChart = (cols, numCols, dateCols) => {
  return {
    chart: 'Line Chart',
    x: dateCols[0],
    y: [{
      y: numCols[0],
      lineColor: "#08519c",
      showLineColor: false,
      lb: "None",
      ub: "None",
      marker: "None",
      markerColor: "#b92e2e",
      showMarkerColor: false,
      mkCond: [{
        cond: "EQ",
        attr: cols[0],
      }],
      mkCondJoin: "AND"
    }]
  }
}

/**
 * Initializes the config of the scatterplot.
 * @param {array} cols - List of all columns
 */
const initializeScatterPlot = (cols) => {
  return {
    chart: 'Scatterplot',
    x: cols[0],
    y: cols[0],
    pointColor: "#08519c",
    r: "None",
    rSizeMin: 4,
    rSizeMax: 25,
    color: "None",
  }
}

/**
 * Initializes the config of the balloon plot.
 * @param {array} catCols - List of categorical/ordinal columns
 */
const initializeBalloonPlot = (catCols) => {
  return {
    chart: 'Balloon Chart',
    x: catCols.length > 0 ? catCols[0] : 'None',
    y: catCols.length > 0 ? catCols[0] : 'None',
    pointColor: "#08519c",
    rSizeMax: 25,
  }
}

/**
 * Initializes the config of the correlation plot.
 * @param {array} numCols - List of numerical columns
 */
 const initializeCorrelationPlot = (numCols) => {
  return {
    chart: 'Correlation Plot',
    attrs: numCols.length > 1 ? [numCols[0], numCols[1]] : [],
    negColor: "#ff6347",
    posColor: "#4682b4",
  }
}

/**
 * Initializes the config of the bar chart.
 */
 const initializeHistogram = (numCols) => {
  return {
    chart: 'Histogram',
    X: numCols[0],
    N: 20,
    yFunc: 'Count',
    barColor: "#08519c"
  }
}

/**
 * Initializes the config of the parallell coordinates.
 * @param {array} cols - List of all columns
 */
const initializeParallelCoords = (cols) => {
  return {
    chart: 'Parallel Coordinates',
    attrs: cols.length > 1 ? [cols[0], cols[1]] : [],
    lineColor: "#08519c",
    lineThickness: 1,
  }
}

/**
 * Initializes the chart config based on chart type and available columns.
 * @param {string} chart - Chart type
 * @param {array} cols - List of all columns
 * @param {array} numCols - List of numerical columns
 * @param {array} catCols - List of categorical/ordinal columns
 * @param {array} dateCols - List of date time columns
 */
export const initializeConfig = (chart, cols, numCols, catCols, dateCols) => {
  switch(chart){
    case 'Bar Chart':
      return initializeBarChart(catCols)
    case 'Pie Chart':
      return initializePieChart(catCols)
    case 'Histogram':
        return initializeHistogram(numCols)
    case 'Line Chart':
      return initializeLineChart(cols, numCols, dateCols)
    case 'Scatterplot':
      return initializeScatterPlot(cols)
    case 'Balloon Chart':
      return initializeBalloonPlot(catCols)
    case 'Parallel Coordinates':
      return initializeParallelCoords(cols)
    case 'Correlation Plot':
        return initializeCorrelationPlot(numCols)
    default:
      return {
        chart: "None"
      };
  }
}

/**
 * Checks if the bar chart config is valid.
 * @param {Object} config - Configuration for bar chart.
 */
const isBarConfigAligned = (config) => {
  return true
}

/**
 * Checks if the histogram config is valid.
 * @param {Object} config - Configuration for bar chart.
 */
 const isHistogramConfigAligned = (config) => {
  if(config.N < 2) {
    return false
  }
  return true
}

/**
 * Checks if the pie chart config is valid.
 * @param {Object} config - Configuration for pie chart.
 */
 const isPieConfigAligned = (config) => {
  if(config.rSizeMin < 0) {
    return false
  }
  if(config.rSizeMax <= 0 || config.rSizeMax < config.rSizeMin) {
    return false
  }
  return true
}

/**
 * Checks if the line chart config is valid.
 * @param {Object} config - Configuration for line chart.
 */
const isLineConfigAligned = (config) => {
  if(config.y.length < 1){
    return false
  }
  return true
}

/**
 * Checks if the scatterplot config is valid.
 * @param {Object} config - Configuration for scatterplot.
 */
const isScatterConfigAligned = (config) => {
  if(config.rSizeMin <= 0) {
    return false
  }
  if(config.rSizeMax <= 0 || config.rSizeMax < config.rSizeMin) {
    return false
  }
  return true
}

/**
 * Checks if the parallel coordinates config is valid.
 * @param {Object} config - Configuration for parallel coordinates.
 */
const isParallelCoordConfigAligned = (config) => {
  if(config.attrs.length < 2) {
    return false
  }
  if(config.lineThickness <= 0) {
    return false
  }
  return true
}

/**
 * Checks if the balloon chart config is valid.
 * @param {Object} config - Configuration for balloon chart.
 */
const isBalloonConfigAligned = (config) => {
  if(config.x == 'None' || config.y == 'None') {
    return false
  }
  if(config.rSizeMax <= 2) {
    return false
  }
  return true
}

/**
 * Checks if the correlation plot config is valid.
 * @param {Object} config - Configuration for correlation plot.
 */
const isCorrelationConfigAligned = (config) => {
  if(config.attrs.length < 2) {
    return false
  }
  return true
}

/**
 * Checks if the chart config is aligned. 
 * @param {Object} config - Configuration for the current chart.
 */
export const isConfigAligned = (config) => {
  switch(config.chart) {
    case 'Bar Chart': return isBarConfigAligned(config);
    case 'Pie Chart': return isPieConfigAligned(config);
    case 'Histogram': return isHistogramConfigAligned(config);
    case 'Line Chart': return isLineConfigAligned(config);
    case 'Scatterplot': return isScatterConfigAligned(config);
    case 'Balloon Chart': return isBalloonConfigAligned(config);
    case 'Parallel Coordinates': return isParallelCoordConfigAligned(config);
    case 'Correlation Plot': return isCorrelationConfigAligned(config);
    default: return false;
  }
};


