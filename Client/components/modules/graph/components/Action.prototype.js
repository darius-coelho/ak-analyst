import { xor, isEqual, sortBy } from "lodash";
import { isInRange, isInRangeInt } from "../../utilities/utilities";
import { LOAD_FILE, LOAD_CLOUD, CLEANSE, JOIN, AGGREGATE,
	 SPLITDATA, SKLEARN, AK_MINE, REGRESSION, PREDICT,
	 AK_BROWSE, VISUALIZER, AK_CAUSAL } from "../../config/components/Config";

export const FILE = 'action.type/FILE';
export const FILELIST = 'action.type/FILELIST';
export const PATTERNLIST = 'action.type/PATTERNLIST';
export const MODEL = 'action.type/MODEL';
export const SELECTED_PATTERNS = 'action.type/SELECTED_PATTERNS';

export const ReadyStatus = {
  Error: 0,
  OK: 1,
  PrevMissing: 2,
  PrevUnready: 3,
  PrevNoOutput: 4,
  Unready: 5,
}

const dualInputActions = [
  PREDICT,
  AK_BROWSE,
  AK_CAUSAL
]

const dualOutputActions = [
  SPLITDATA
]

export const actionTypes = (type) => {
  switch(type) {
    case LOAD_FILE: return {
      input: null,
      output: FILE
    }
    case LOAD_CLOUD: return {
      input: null,
      output: FILE
    }
    case CLEANSE: return {
      input: FILE,
      output: FILE
    }
    case AGGREGATE: return {
      input: FILE,
      output: FILE
    }
    case JOIN: return {
      input: FILELIST,
      output: FILE
    }
    case SPLITDATA: return {
      input: FILE,
      output: FILE
    }
    case AK_MINE: return {
      input: FILE,
      output: PATTERNLIST
    }
    case AK_CAUSAL: return {
      input: [FILE, SELECTED_PATTERNS],
      output: null
    }
    case SKLEARN: return {
      input: FILE,
      output: MODEL
    }
    case REGRESSION: return {
      input: FILE,
      output: FILE
    }
    case PREDICT: return {
      input: [FILE, MODEL],
      output: FILE
    }
    case AK_BROWSE: return {
      input: [FILE, PATTERNLIST],
      output: SELECTED_PATTERNS
    }
    case VISUALIZER: return {
      input: FILE,
      output: null
    }
    default: return { input: null, output: null}
  }
};

/**
 * Re-aligns the config of the CLEANSE node based on the output of its predecessor.
 * @param {Object} input - Input to the current cleanse action.
 * @param {Object} config - Configuration for the current cleanse action.
 */
const reAlignCleanse = (input, config) => {
  // Check if input is provided
  if(input.length < 1){
    return config
  }

  // Check if input has an output
  if(!input[0].output || !input[0].output[0]) {
    return config;
  }

  // Set output based on output port number
  const output = input[0].output[input[0].outPort]

  /**
   * Checks if an attribute is valid
   * @param {string} attr - The attribute to be tested.
   * @param {array} inputCols - Original input columns.
   * @param {array} addedCols -  New columns created by other transfroms.
   * @param {array} toRemoveCols - Columns that were removed.
   */
  const isAttrValid = (attr,  inputCols, addedCols, toRemoveCols) => {
    return (
      (inputCols.includes(attr) || addedCols.includes(attr))
      && !toRemoveCols.includes(attr)
    )
  }

  /**
   * Checks if an transform is valid
   * @param {object} t - The transform to be tested.
   * @param {array} inputCols - Original input columns.
   * @param {array} addedCols - Input to the current cleanse action.
   * @param {array} toRemoveCols - Columns that were removed.
   */
  const isTransformValid = (t, inputCols, addedCols, toRemoveCols) => {
    // check if attribute present in input columns or derived list
    const attrPresent =  isAttrValid(t.attr, inputCols, addedCols, toRemoveCols)
    // check if dependency present in input columns or derived list
    const depPresent = t.dependency_list.every(d => isAttrValid(d, inputCols, addedCols,
								toRemoveCols))
    return attrPresent && depPresent
  }

  /**
   * Checks if a derived attribute transform is valid based on its dependent transforms
   * @param {object} t - The derived attribute transform to be tested.
   * @param {array} inputCols - Original input columns.
   * @param {array} addedCols - Input to the current cleanse action.
   * @param {array} toRemoveCols - Columns that were removed.
   */
  const isDerivedValid = (t, inputCols,  addedCols, toRemoveCols) => {
    // Check derived attribute transforms
    return t.dependency_list.every(d => isAttrValid(d, inputCols, addedCols, toRemoveCols))
  }

  // Keep transforms that are associated with
  // attributes in the input
  const inputCols = output.columns // List of input columns
  let addedCols = [] // List columns names derived from renaming, OHE, rank or derived transforms
  let toRemoveCols = [] // List of input columns that become invalid after a transform
  let validTransforms = [] // List of valid transforms

  for(let i=0; i<config.transformations.length; i++){
    const t = config.transformations[i]
    if(t.tType == 'Derived'){
      if(isDerivedValid(t, inputCols, addedCols, toRemoveCols)){
        // Keep valid derived attribute transforms
        validTransforms.push(t)
        // Keep track of valid derived attributes
        addedCols.push(t.attr)
      }
    }
    else{
      if(isTransformValid(t, inputCols, addedCols, toRemoveCols)){
        // Keep valid transforms
        validTransforms.push(t)
        if(t.tType == "ColNameChange"){
          addedCols.push(t.name)
        }
        if(t.tType == "OHE" || t.tType == "Rank" || t.tType == "CellSplit"){
          addedCols = addedCols.concat(t.new_cols)
        }
      }
      else{
        // if the current attribute is dependent on a missing attribute
        // future transforms dependent on it must be removed
        toRemoveCols.push(t.attr)
      }
    }
  }

  // Keep attributes in the deleted list that
  // are in the columnns of the input
  const allCols = inputCols.concat(addedCols)
  const dels = config.deleted.filter(d => {
    return allCols.includes(d)
  })

  // Return updated config
  return {
    ...config,
    transformations: validTransforms,
    deleted: dels
  }
}

/**
 * Re-aligns the config of the AGGREGATE node based on the output of its predecessor.
 * @param {Object} input - Input to the current aggregate action.
 * @param {Object} config - Configuration for the current aggregate action.
 */
const reAlignAggregate = (input, config) => {
  // Check if input is provided
  if(input.length < 1){
    return config
  }
  // Check if input has an output
  if(!input[0].output || !input[0].output[0]) {
    return config
  }

  // Set output based on single- or multi-output input node
  const output = input[0].output[input[0].outPort]

  const inputCols = output.columns;

  const key = inputCols.includes(config.aggKey) ? config.aggKey : null

  // Setup attributes that have an aggregation associated with it
  let newAggMap = config.aggMap.map( d => ({
                        aggFunc: d.aggFunc,
                        attrs: d.attrs.filter( v => inputCols.includes(v.value)),
                        bind: d.bind.filter(v => inputCols.includes(v.attr.value) || v.attr.value == "None")
                      })
                    );

  return {
    ...config,
    aggKey: key,
    aggMap: newAggMap
  }
}

/**
 * Re-aligns the config of the JOIN node based on the output of its predecessor.
 * @param {int} ID - unique ID of the node.
 * @param {Object} input - Input to the current join action.
 * @param {Object} config - Configuration for the current join action.
 */
const reAlignJoin = (ID, input, config) => {
  // Check if there are at least 2 inputs
  if(input.length < 2){
    return config
  }

  // Check if inputs provide an output
  if (input.some((iput)=>!iput.output || !iput.output[0])) {
    return config;
  }
  
  const join = config.join.map((arr) => {
    return input.map((iput, fid)=>{
      const output = iput.output[iput.outPort];
      return output.columns.includes(arr[fid]) ? arr[fid] : null;
    })
  });

  // Set default suffix for inputs that have not yet been set.
  let suffix = [
    ...config.suffix,
    ...input.filter((s,i)=>i>=config.suffix.length).map(iput=>`_${iput.ID}`)
  ];
  
  // if the predecessors contain the same default suffix, then
  // append this node's unique ID to avoid name collisions.
  if(config.isDefaultSuffix) {
    for (let i = 0; i < input.length; ++i) {
      if (input[i].type === 'JOIN') {
	for (let j = 0; j < suffix.length; ++j) {
	  if (input[i].config.suffix.some(s=>s.includes(suffix[j]))) {
	    suffix[j] = `${suffix[j]}_${ID}`;
	  }
	} // end for j
      }
    } // end for i    
  }
  
  // Return updated config
  return {
    ...config,
    suffix: suffix,
    join: join
  }
}

/**
 * Re-aligns the config of the AK_MINE node based on the output of its predecessor.
 * @param {Object} input - Input to the current pattern mine action.
 * @param {Object} config - Configuration for the current pattern mine action.
 */
const reAlignAKMine = (input, config) => {
  // Check if input is provided
  if(input.length < 1){
    return config
  }
  // Check if input has an output
  if(!input[0].output || !input[0].output[0]) {
    return config
  }

  // Set output based on single- or multi-output input node
  const output = input[0].output[input[0].outPort]

  // Reset config if target in config is not in input
  if(config.target !== undefined){
    const inputCols = output.columns;
    // Reset if target is not an array
    if(!Array.isArray(config.target)){
      return {
        ...config,
        target: [],
      };
    }
    // Reset if every target element is not in the input
    if(!config.target.every(d => inputCols.includes(d))){
      return {
        ...config,
        target: [],
      };
    }
  }
  // Otherwise return the original config
  return config;
}

/**
 * Re-aligns the config of the REGRESSION node based on the output of its predecessor.
 * @param {Object} input - Input to the current regression action.
 * @param {Object} config - Configuration for the current regression action.
 */
const reAlignRegression = (input, config) => {
  // Check if input is provided
  if(input.length < 1){
    return config
  }
  // Check if input has an output
  if(!input[0].output || !input[0].output[0]) {
    return config
  }

  // Set output based on single- or multi-output input node
  const output = input[0].output[input[0].outPort]

  // Reset config if target in config is not in input
  if(config.target){
    const inputCols = output.columns;
    const target = inputCols.includes(config.target) ? config.target : null
    const predictors = config.predictors.filter(d => {
      return inputCols.includes(d)
    })
    // Return updated config
    return {
      ...config,
      target: target,
      predictors: predictors
    }
  }
  // Otherwise return the original config
  return config;
}

/**
 * Re-aligns the config of the VISUALIZER node based on the output of its predecessor.
 * @param {Object} input - Input to the current visualizer action.
 * @param {Object} config - Configuration for the current visualizer action.
 */
 const reAlignVisualizer = (input, config) => {
  // Check if input is provided
  if(input.length < 1){
    return config
  }
  // Check if input has an output
  if(!input[0].output || !input[0].output[0]) {
    return config
  }

  /**
   * Checks if a scatter plot config is valid based on input colums.
   * @param {array} cols - list of input attributes.
   * @param {Object} chartConfig - Configuration for the scatterplot.
   */
  const isValidScatter = (cols, chartConfig) => {
    const { x, y, color, r }  = chartConfig
    if(!cols.includes(x)){
      return false
    }
    if(!cols.includes(y)){
      return false
    }
    if(r != "None" && !cols.includes(r)){
      return false
    }
    if(color != "None" && !cols.includes(color)){
      return false
    }
    return true
  }

  /**
   * Checks if a balloon plot config is valid based on input colums.
   * @param {array} cols - list of input attributes.
   * @param {Object} colTypes - mapping of attributes names to their types.
   * @param {Object} chartConfig - Configuration for the balloon plot.
   */
   const isValidBalloon = (cols, colTypes, chartConfig) => {
    const { x, y, rSizeMin, rSizeMax }  = chartConfig
    if(!cols.includes(x) || (colTypes[x] != 'Nominal' && colTypes[x] != 'Ordinal')){
      return false
    }
    if(!cols.includes(y) || (colTypes[y] != 'Nominal' && colTypes[y] != 'Ordinal')){
      return false
    }
    if(+rSizeMin < 0 || +rSizeMax < +rSizeMin){
      return false
    }
    return true
  }

  /**
   * Checks if a bar chart config is valid based on input colums.
   * @param {array} cols - list of input attributes.
   * @param {Object} colTypes - mapping of attributes names to their types.
   * @param {Object} chartConfig - Configuration for the bar chart.
   */
   const isValidBar = (cols, colTypes, chartConfig) => {
    const { x, y, color }  = chartConfig
    if(!cols.includes(x) || (colTypes[x] != 'Nominal' && colTypes[x] != 'Ordinal')){
      return false
    }
    if(y !== 'ak_none' && (!cols.includes(y) || colTypes[y] != 'Numerical')){
      return false
    }
    if(color !== 'None' && (!cols.includes(color) || (colTypes[color] != 'Nominal' && colTypes[color] != 'Ordinal'))) {
      return false
    }
    return true
  }

  /**
   * Checks if a histogram config is valid based on input colums.
   * @param {array} cols - list of input attributes.
   * @param {Object} colTypes - mapping of attributes names to their types.
   * @param {Object} chartConfig - Configuration for the histogram.
   */
   const isValidHistogram = (cols, colTypes, chartConfig) => {
    const { X, N }  = chartConfig
    if(!cols.includes(X) || colTypes[X] != 'Numerical'){
      return false
    }
    if(+N < 2){
      return false
    }
    return true
  }

  /**
   * Checks if a pie chart config is valid based on input colums.
   * @param {array} cols - list of input attributes.
   * @param {Object} colTypes - mapping of attributes names to their types.
   * @param {Object} chartConfig - Configuration for the pie chart.
   */
   const isValidPie = (cols, colTypes, chartConfig) => {
    const { sAttr, R, rSizeMin, rSizeMax }  = chartConfig
    if(!cols.includes(sAttr) || (colTypes[sAttr] != 'Nominal' && colTypes[sAttr] != 'Ordinal')){
      return false
    }
    if(R !== 'ak_none' && (!cols.includes(R) || colTypes[R] != 'Numerical')){
      return false
    }
    if(+rSizeMin < 0 || +rSizeMax < +rSizeMin){
      return false
    }
    return true
  }

  /**
   * Checks if a line chart config is valid based on input colums.
   * @param {array} cols - list of input attributes.
   * @param {Object} chartConfig - Configuration for the scatterplot.
   */
  const isValidLine = (cols, chartConfig) => {
    const { x, y }  = chartConfig
    if(!cols.includes(x)){
      return false
    }
    for(let j=0; j < y.length; j++){
      if(!cols.includes(y[j].y)){
        return false
      }
      if(y[j].lb != "None" && !cols.includes(y[j].lb)){
        return false
      }
      if(y[j].ub != "None" && !cols.includes(y[j].ub)){
        return false
      }
      for(let k=0; k < y[j].mkCond.length; k++){
        if(!cols.includes(y[j].mkCond[k].attr)){
          return false
        }
      }
    }
    return true
  }

  /**
   * Checks if a parallel coordinates config is valid based on input colums.
   * @param {array} cols - list of input attributes.
   * @param {Object} chartConfig - Configuration for the parallel coordinates.
   */
   const isValidParallelCoords = (cols, chartConfig) => {
    const attrs = chartConfig.attrs

    if(attrs.length < 2){
      return false
    }
    
    for(let j=0; j < attrs.length; j++){
      if(!cols.includes(attrs[j])){
        return false
      }
    }
    return true
  }

  /**
   * Checks if a correlation plot is valid based on input colums.
   * @param {array} cols - list of input attributes.
   * @param {Object} colTypes - mapping of attributes names to their types.
   * @param {Object} chartConfig - Configuration for the correlation plot.
   */
   const isValidCorrelationPlot = (cols, colTypes, chartConfig) => {
    const attrs = chartConfig.attrs

    if(attrs.length < 2){
      return false
    }
    
    for(let j=0; j < attrs.length; j++){
      if(!cols.includes(attrs[j]) || colTypes[attrs[j]] != 'Numerical'){
        return false
      }
    }
    return true
  }

  // Set output based on single- or multi-output input node
  const output = input[0].output[input[0].outPort]
  const columns = output.columns
  const colTypes = output.colTypes

  let newCharts = []
  for(let i=0; i < config.charts.length; i++){
    if(config.charts[i].chart == "Scatterplot" && isValidScatter(columns, config.charts[i])) {
      newCharts.push(config.charts[i])
    }
    if(config.charts[i].chart == "Line Chart" && isValidLine(columns, config.charts[i])) {
      newCharts.push(config.charts[i])
    }
    if(config.charts[i].chart == "Balloon Chart" && isValidBalloon(columns, colTypes, config.charts[i])) {
      newCharts.push(config.charts[i])
    }
    if(config.charts[i].chart == "Bar Chart" && isValidBar(columns, colTypes, config.charts[i])) {
      newCharts.push(config.charts[i])
    }
    if(config.charts[i].chart == "Histogram" && isValidHistogram(columns, colTypes, config.charts[i])) {
      newCharts.push(config.charts[i])
    }
    if(config.charts[i].chart == "Parallel Coordinates" && isValidParallelCoords(columns, config.charts[i])) {
      newCharts.push(config.charts[i])
    }
    if(config.charts[i].chart == "Pie Chart" && isValidPie(columns, colTypes, config.charts[i])) {
      newCharts.push(config.charts[i])
    }
    if(config.charts[i].chart == "Correlation Plot" && isValidCorrelationPlot(columns, colTypes, config.charts[i])) {
      newCharts.push(config.charts[i])
    }
  }

  return {
    ...config,
    charts: newCharts
  };
}


/**
 * Re-aligns the config of the CAUSAL node based on the output of its predecessor.
 * @param {Object} input - Input to the current causal explorer action.
 * @param {Object} config - Configuration for the current causal explorer action
 */
 const reAlignCausalExplorer = (input, config) => {
  // Check if input is provided
  if(input.length < 1){
    return config
  }
  // Check if input has an output
  if(!input[0].output || !input[0].output[0]) {
    return config
  }

  // Set output based on single- or multi-output input node
  const output = input[0].output[input[0].outPort]

  if(config.nodes){
    const inputCols = output.columns;
    const nodes = Object.entries(config.nodes).reduce((acc, [k,v])=> {
      if(inputCols.includes(k)){
        return {
          ...acc,
          [k]: v
        }
      }
      return acc
    }, {})
    const edges = config.edges.filter((d,i) => inputCols.includes(d.sourceAttr) && inputCols.includes(d.targetAttr))
    // Return updated config
    return {
      ...config,
      nodes: nodes,
      edges: edges
    }
  }
  // Otherwise return the original config
  return config;
}

/**
 * Re-aligns the config of the AK_BROWSE node based on the output of its predecessor.
 * @param {Object} input - Input to the current browse action.
 * @param {Object} config - Configuration for the current browse action.
 */
const reAlignPatternBrowse = (input, config) => {
  // Check if input is provided
  if(input.length < 1){
    return config
  }
  // Check if input has an output
  if (input.some(iput=>!iput.output || !iput.output[iput.outPort])) {
    return config
  }

  // Check if targets and their mine type match
  const inputTargets = input[input.length == 1 ? 0 : 1].output[0].target
  const inputTargetType = input[input.length == 1 ? 0 : 1].output[0].targetType
  const configTargets = config.target
  const configTargetType = config.targetType
  if(!isEqual(sortBy(inputTargets), sortBy(configTargets)) || inputTargetType != configTargetType){
    return {
      ...config,
      target: null,
      targetType: null,
      patternSet: []
    }
  }

  const inputPatterns = input[input.length == 1 ? 0 : 1].output[0].patterns

  if(inputPatterns && config.patternSet){
    const isPatternInInput = (constraints) => {

      for(let i=0; i<inputPatterns.length; i++) {
        const inCstr = inputPatterns[i].constraints
        if(Object.keys(inCstr).length != Object.keys(constraints).length){
          continue
        }

        // Check if constraints match
        let isMatch = true
        for(const attr in inCstr) {
          // Check if constraint in both patterns, break if there is a mismatch
          if(!constraints.hasOwnProperty(attr)) {
            isMatch = false
            break
          }
          // Check for matches between constraints
          if(constraints[attr].hasOwnProperty('in')) {
            // Check categorical constriants, break if there is a mismatch
            if(xor(constraints[attr].in, inCstr[attr].in).length > 0 ){
              isMatch = false
              break
            }
          }
          else {
            // Check continuous constriants, break if there is a mismatch
            if(constraints[attr].lb != inCstr[attr].lb ||  constraints[attr].ub != inCstr[attr].ub) {
              isMatch = false
              break
            }
          }
        }

        // If pattern matches return true
        if(isMatch) {
          return i
        }
      }
      return -1
    }

    let updatedPatternSet = []
    for(let i=0; i<config.patternSet.length; i++) {
      const patterns = config.patternSet[i].patterns
      let updatedPatterns = []
      for(let j=0; j<patterns.length; j++) {
        const pattern = patterns[j]
        const constraints = pattern.core.reduce((acc, v) => {
                              if(pattern.attributes[v].hasOwnProperty('categories')){
                                return {
                                  ...acc,
                                  [v]: { in: pattern.attributes[v]['categories']}
                                }
                              }
                              return {
                                ...acc,
                                [v]: { lb: pattern.attributes[v]['min'], ub: pattern.attributes[v]['max']}
                              }
                            }, {})

        const inpIdx = isPatternInInput(constraints)
        if(inpIdx > -1) {
          updatedPatterns.push({
            ...pattern,
            ID: inputPatterns[inpIdx].ID
          })
        }
      }

      if(updatedPatterns.length > 0) {
        updatedPatternSet.push({
          ...config.patternSet[i],
          patterns: updatedPatterns
        })
      }
    }
    
    return {
      ...config,
      patternSet: updatedPatternSet
    }
  }

  // Otherwise reset config
  return {
    ...config,
    target: null,
    targetType: null,
    patternSet: []
  };
}

/**
 * Re-aligns the input of the VISUALIZER node based on the output of its predecessor.
 * @param {Object} node - Onbject containing the nodes attributes - type, config, input, etc.
 */
export const reAlignConfig = (node) => {
  switch(node.type){
    case 'CLEANSE':
      return reAlignCleanse(node.input, node.config)
    case 'AGGREGATE':
      return reAlignAggregate(node.input, node.config)
    case 'JOIN':
      return reAlignJoin(node.ID, node.input, node.config)
    case 'AK_MINE':
      return reAlignAKMine(node.input, node.config)
    case 'REGRESSION':
      return reAlignRegression(node.input, node.config)
    case 'VISUALIZER':
      return reAlignVisualizer(node.input, node.config)
    case 'AK_CAUSAL':
      return reAlignCausalExplorer(node.input, node.config)
    case 'AK_BROWSE':
      return reAlignPatternBrowse(node.input, node.config)
    case 'LOAD_FILE':
    default:
      return node.config;
  }
}

/**
 * Tests if sampling options are valid
 * @param {Object} sampleOptions - object containing a flag and number of samples
 */
const isSampleValid = (sampleOptions) => {
  if(sampleOptions) {
    if(sampleOptions.is_sample && !isInRangeInt(sampleOptions.nsamples, 1, 'inf', 'include')) {
      return false
    }
  }
  return true
}

/**
 * Checks if the load local config is valid. 
 * @param {Object} config - Configuration for LOAD_FILE Action.
 */
const isLoadLocalAligned = (config) => {
  if (!config.path) {
    // empty path
    return ReadyStatus.Unready;
  }
  if(config.path.length == 0) {
    return ReadyStatus.Unready;    
  }
  return (config.isAvailable ? ReadyStatus.OK : ReadyStatus.Unready);
}

/**
 * Checks if the load cloud config is valid. 
 * @param {Object} config - Configuration for LOAD_CLOUD Action.
 */
const isLoadCloudAligned = (config) => {
  if (!config.ipAddr || !config.uname || !config.secretKey
    || !config.bucket || !config.filepath) {
    // empty path
    return ReadyStatus.Unready
  }
  if(config.ipAddr.length == 0 || config.uname.length == 0 ||
    config.secretKey.length == 0 || config.bucket.length == 0 ||
    config.filepath.length == 0) {
    return ReadyStatus.Unready
  }
  return ReadyStatus.OK
}

/**
 * Checks if the cleanse input and config is valid. 
 * @param {Array} inputs - Predecessors connecting to the node corresponding to config.
 * @param {Object} config - Configuration for CLEANSE Action.
 */
const isCleanseAligned = (inputs, config) => {  
  // Check if input present
  if(inputs.length < 1){
    return ReadyStatus.PrevMissing;
  }

  // Check if input node is ready
  if (inputs[0].readyStatus !== ReadyStatus.OK) {
    return ReadyStatus.PrevUnready;
  }

  // Check if input node is ouputing data
  const port = inputs[0].outPort
  const portInput = inputs[0].output[+port]
  const isFileAvailable = portInput.columns.length > 0
  if (!isFileAvailable) {
    return ReadyStatus.PrevUnready;
  }

  if (!isSampleValid(config.options)) {
    return ReadyStatus.Unready;
  }

  return ReadyStatus.OK;
}

/**
 * Checks if the aggregate input and config is valid. 
 * @param {Array} inputs - Predecessors connecting to the node corresponding to config.
 * @param {Object} config - Configuration for AGGREGATE Action.
 */
const isAggregateAligned = (inputs, config) => {  
  // Check if input present
  if(inputs.length < 1){
    return ReadyStatus.PrevMissing;
  }

  // Check if input node is ready
  if (inputs[0].readyStatus !== ReadyStatus.OK) {
    return ReadyStatus.PrevUnready;
  }

  // Check if input node is ouputing data
  const port = inputs[0].outPort
  const portInput = inputs[0].output[+port]
  const isFileAvailable = portInput.columns.length > 0

  if (!isFileAvailable) {
    return ReadyStatus.PrevUnready;
  }
  
  return ReadyStatus.OK;
}

/**
 * Checks if the split data input and config is valid. 
 * @param {Array} inputs - Predecessors connecting to the node corresponding to config.
 * @param {Object} config - Configuration for SPLITDATA Action.
 */
const isSplitAligned = (inputs, config) => {  
  // Check if input present
  if(inputs.length < 1){
    return ReadyStatus.PrevMissing;
  }

  // Check if input node is ready   
  if (inputs[0].readyStatus !== ReadyStatus.OK) {
    return ReadyStatus.PrevUnready;
  }    
  
  // Check if input node is ouputing data
  const port = inputs[0].outPort
  const portInput = inputs[0].output[+port]
  const isFileAvailable = portInput.columns.length > 0

  if (!isFileAvailable) {
    return ReadyStatus.PrevUnready;
  }
  
  // Check config valid
  if(config.method != 'Random' && config.method != 'InOrder') {
    return ReadyStatus.Unready;
  }
  if(config.method == 'Random' && !isInRange(config.sizeValue, 0, 100, 'exclude')) {
    return ReadyStatus.Unready;
  }
  if(config.method == 'InOrder') {
    if(config.sizeType == "Percentage" && !isInRange(config.sizeValue, 0, 100, 'exclude')){
      return ReadyStatus.Unready;
    }
    if(config.sizeType != "Percentage" && !isInRangeInt(config.sizeValue, 1, 'inf', 'include')){
      return ReadyStatus.Unready;
    }    
  }

  return ReadyStatus.OK;
}

/**
 * Checks if the join data input and config is valid. 
 * @param {Array} inputs - Predecessors connecting to the node corresponding to config.
 * @param {Object} config - Configuration for JOIN Action.
 */
const isJoinAligned = (inputs, config) => {  
  if (!('how' in config)) {
    return ReadyStatus.Unready;
  }

  if (inputs.length < 2) {
    return ReadyStatus.PrevMissing;
  }
  
  // aligned if all columns in config are in inputs
  const isAligned = config.join.every(arr => {
    return inputs.every((iput, fid) => {
      const cols = iput.output[iput.outPort].columns;
      return cols.includes(arr[fid]);
    });
  });

  if (!isAligned) {
    return ReadyStatus.Unready;
  }
  
  return ReadyStatus.OK;
}

/**
 * Checks if the mine action input and config is valid. 
 * @param {Array} inputs - Predecessors connecting to the node corresponding to config.
 * @param {Object} config - Configuration for AK_MINE Action.
 */
const isMineAligned = (inputs, config) => {    
  if (!('target' in config) || !('mineType' in config)) {
    return ReadyStatus.Unready;
  }

  if (config.target === null) {
    return ReadyStatus.Unready;
  }
  
  // Check that at least one target as been set
  if(config.target.length < 1){
    return ReadyStatus.Unready;
  }


  // Get columns based on type of input - multi-input or single-input
  const mineColumns = inputs[0].output[inputs[0].outPort].columns

  // Check if config valid
  const validTargets = config.target.every(d => mineColumns.includes(d))
  const validMethod = ["fpminer", "bayesian"].includes(config.method)
  const validMineType = ["numeric", "binary"].includes(config.mineType)

  if(!(validTargets && validMethod && validMineType)) return ReadyStatus.Unready;

  if(config.method == 'fpminer'){
    const validParams = isInRangeInt(config.maxPattern, 1, 'inf', 'include')
                        && (
                            config.mineType == 'numeric' 
                            ? isInRange(config.threshold, 0.5, 1, 'include')
                            : isInRange(config.threshold, 1, 'inf', 'include')
                        )
	                && isInRange(config.alpha, 0, 1, 'exclude')
                        && isInRangeInt(config.holdout, 0, 'inf', 'include')
                        && isInRange(config.minsup, 0, 1, 'include')
    if(!validParams) return ReadyStatus.Unready;
  }
  if(config.method == 'bayesian'){
    const validParams = isInRangeInt(config.maxPattern, 1, 'inf', 'include')
                        && isInRangeInt(config.nmodels, 1, 'inf', 'include')
                        && isInRangeInt(config.niter, 1, 'inf', 'include')
                        && isInRangeInt(config.niter, 1, 'inf', 'include')
    if(!validParams) return ReadyStatus.Unready;
  }

  return (isSampleValid(config.options) ? ReadyStatus.OK : ReadyStatus.Unready);
}


/**
 * Checks if the SKLearn action input and config is valid. 
 * @param {Array} inputs - Predecessors connecting to the node corresponding to config.
 * @param {Object} config - Configuration for AK_MINE Action.
 */
const isSkLearnAligned = (inputs, config) => {  
 // if output of parent node is null then input not aligned
 if (!('target' in config)) {
   return ReadyStatus.Unready;
  }

  if (!('predictors' in config) || config.predictors.length == 0) {
    return ReadyStatus.Unready;
  }

  if (config.model !== null && isSampleValid(config.options)) {
    return ReadyStatus.OK;
  }
  
  return ReadyStatus.Unready;
}

/**
 * Checks if the regression action input and config is valid. 
 * @param {Array} inputs - Predecessors connecting to the node corresponding to config.
 * @param {Object} config - Configuration for AK_MINE Action.
 */
const isRegressionAligned = (inputs, config) => {  
  if (!('target' in config)) {
    return ReadyStatus.Unready;
  }

  // Check if input present
  if(inputs.length < 1){
    return ReadyStatus.PrevMissing;
  }

  const validSample = isSampleValid(config.options)
  const validWindow = isInRangeInt(config.windowSize, 1, 10000, 'include')
  const validCI = isInRange(config.confidInterval, 1, 100, 'include')
  const linColumns = inputs[0].output[inputs[0].outPort].columns
  const validTarget = linColumns.includes(config.target)    
  
  if (validSample && validWindow && validCI && validTarget) {
    return ReadyStatus.OK;
  }
  return ReadyStatus.Unready;
}

/**
 * Checks if the predict action input and config is valid. 
 * @param {Array} inputs - Predecessors connecting to the node corresponding to config.
 * @param {Object} config - Configuration for PREDICT Action.
 */
const isPredictAligned = (inputs, config) => {
  const isPredReady = !inputs.some((iput)=>{
    return (iput===null || iput.readyStatus !== ReadyStatus.OK || !(0 in iput.output) || iput.output[0] === null);
  });

  return (isPredReady ? ReadyStatus.OK : ReadyStatus.PrevUnready);
}

/**
 * Checks if the causal explorer action input and config is valid. 
 * @param {Array} inputs - Predecessors connecting to the node corresponding to config.
 * @param {Object} config - Configuration for CAUSAL Action.
 */
const isCausalExplorerAligned = (inputs, config) => {  
  // Check if input present
  if(inputs.length < 1){
    return ReadyStatus.PrevMissing;
  }

  if (actionTypes(inputs[0].type).output !== FILE) {
    return ReadyStatus.PrevMissing;    
  }
    
  return ReadyStatus.OK;
}

/**
 * Checks if the pattern browse action input and config is valid. 
 * @param {Array} inputs - Predecessors connecting to the node corresponding to config.
 * @param {Object} config - Configuration for AK_BROWSE Action.
 */
const isBrowserAligned = (inputs, config) => {
  return ReadyStatus.OK;
}

/**
 * Checks if the visualizer action input and config is valid. 
 * @param {Array} inputs - Predecessors connecting to the node corresponding to config.
 * @param {Object} config - Configuration for VISUALIZER Action.
 */
const isVisualizerAligned = (inputs, config) => {
  return (isSampleValid(config.options) ? ReadyStatus.OK : ReadyStatus.Unready);
}

/**
 * Checks if the config and inputs are aligned.
 * @param {String} type - Action type
 * @param {Array} inputs - Predecessors connecting to the node corresponding to config.
 * @param {Object} config - Configuration for the current Action.
 */
export const isInputAligned = (type, inputs, config) => {
  switch(type) {
    case LOAD_FILE: return isLoadLocalAligned(config);
    case LOAD_CLOUD: return isLoadCloudAligned(config);
    case CLEANSE: return isCleanseAligned(inputs, config);
    case AGGREGATE: return isAggregateAligned(inputs, config);
    case SPLITDATA: return isSplitAligned(inputs, config);
    case JOIN: return isJoinAligned(inputs, config);
    case AK_MINE: return isMineAligned(inputs, config);
    case SKLEARN: return isSkLearnAligned(inputs, config);
    case REGRESSION: return isRegressionAligned(inputs, config);
    case PREDICT: return isPredictAligned(inputs, config);
    case AK_CAUSAL: return isCausalExplorerAligned(inputs, config);
    case AK_BROWSE: return isBrowserAligned(inputs, config);
    case VISUALIZER: return isVisualizerAligned(inputs, config);
    default: return ReadyStatus.Error;
  }
};

/**
 * Checks if the isReady flag in all nodes in a path is true
 * @param {object} path - path containing all the nodes with inputs and outputs
 */
export const isPathReady = (path) => {
  if(path){
    let isReady = path.readyStatus === ReadyStatus.OK;
    for(let i= 0; i<path.input.length; i++){
      isReady = isReady && isPathReady(path.input[i])
    }
    return isReady;
  }
  return true;
};

export const isNodeTypeMultiInput = (type) => {
  return type === SELECTED_PATTERNS || type === FILELIST;
}

export const isNodeDualInput = (type) => {
  if(dualInputActions.includes(type)){
    return true
  }
  return false
}

export const isNodeDualOutput = (type) => {
  if(dualOutputActions.includes(type)){
    return true
  }
  return false
}

/**
 * Factory for creating a plain object for FILE types.
 * @param {object} fileData - object containing information about the file
 */
export const createFileOutput = (fileData) => {
  return {
    type: FILE,
    ...fileData,
    preview: fileData.preview
  };
};

/**
 * Returns the appropriate function to parse the output
 * @param {String} actionType - the current action type.
 */
 export const parseOutputFun = (actionType) => {
  switch(actionType) {
    case LOAD_FILE:
    case CLEANSE:
    case AGGREGATE:
    case JOIN: return createFileOutput;
  }
  // default to identity function
  return (data)=>data;
};


/** 
 * Returns true if outputType is compatible with inputType. False o.w. 
 * @param {array / string} outputType - The output type of a source node.
 * @param {string} inputType - The input type of a target node.
 */
export const isTypeCompatible = (outputType, inputType) => {
  const outputTypeArr = Array.isArray(outputType) ? outputType : [outputType];

  if (outputTypeArr.includes(inputType)) {
    return true;
  }

  if (outputTypeArr.includes(FILE) && inputType === FILELIST) {
    return true;
  }

  return false;
};

export default actionTypes;

