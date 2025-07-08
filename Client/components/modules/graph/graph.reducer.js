import _ from 'lodash';
import { ADD_NODE, ADD_EDGE, ADD_NOTE, SET_NODE_POS, SET_NODE_FOCUS,
    SET_EDGE_FOCUS, SET_NOTE_FOCUS, CLEAR_FOCUS, DELETE_FOCUS, COPY_FOCUS, PASTE_FOCUS,
    SET_CONFIG, SET_OUTPUT, SET_IS_LOADING, SET_NOTE_CONFIG, SET_FILE_AVAILABLE,
	  SET_STATE_FROM_FILE, RESET_STATE, VALIDATE_CURRENT_STATE,
	  HANDLE_NODE_ERROR } from "./graph.actions"

import { selectDescendantIDs, selectPathTo } from './graph.selectors';
import { actionTypes, isInputAligned, reAlignConfig, isNodeTypeMultiInput,
	 isNodeDualOutput, FILE, ReadyStatus } from './components/Action.prototype';

const initialState = {
  id: 0, // unique ID counter for nodes
  nodes: {}, // map from unique id to node info.
  edges: [], // list of edges of the form {src: id, dst: id}
  notes: [],// map from unique id to note.
  focusNodes: [], // list of node IDs that are focused.
  focusEdges: [], // list of edge indices that are focused.
  focusNotes: [], // list of note IDs that are focused.
}

export const graphReducer = (state = initialState, action) => {
  switch(action.type) {
    case ADD_NODE: return {
      ...state,
      nodes: {
        ...state.nodes,
        [state.id]: {
	        ...action.node,
          config: initializeConfig(action.node.type),
          output: [null],
	  readyStatus: (actionTypes(action.node.type).input === null
			? ReadyStatus.Unready
		        : ReadyStatus.PrevMissing),
          isLoading: false,
      }},
      focusNodes: [state.id],
      focusEdges: [],
      focusNotes: [],
      id: state.id + 1
    }
    case ADD_EDGE: return {
      ...state,
      edges: [...state.edges, action.edge],
      nodes: updateNodeReadyStatus({...state.nodes},
				   [...state.edges, action.edge],
				   +action.edge.dst, ADD_EDGE),
      focusNodes: [],
      focusEdges: [state.edges.length],
      focusNotes: []
    }
    case ADD_NOTE: return {
      ...state,
      notes: [ ...state.notes, action.note ],
      focusNodes: [],
      focusEdges: [],
      focusNotes: [state.notes.length]
    }
    case SET_NODE_FOCUS: return {
      ...state,
      focusEdges: [],
      focusNodes: [...action.focusList],
      focusNotes: []
    }
    case SET_NODE_POS: return {
      ...state,
      nodes: {...state.nodes, [action.id]: {...state.nodes[action.id], pos: {...action.pos}}}
    }
    case SET_EDGE_FOCUS: return {
      ...state,
      focusNodes: [],
      focusEdges: [...action.focusList],
      focusNotes: []
    }
    case SET_NOTE_FOCUS: return {
      ...state,
      focusNodes: [],
      focusEdges: [],
      focusNotes: [...action.focusList]
    }
    case CLEAR_FOCUS: return {
      ...state,
      focusNodes: [],
      focusEdges: [],
      focusNotes: [],
      notes: state.notes.map( n => ({...n, isEditing: false}) )
    }
    case DELETE_FOCUS: return {
      ...state,
      ...deleteFocus(state),
      focusNodes: [],
      focusEdges: [],
      focusNotes: []
    }
    case COPY_FOCUS: return {
      ...state,
      focusCopy: [...state.focusNodes]
    }
    case PASTE_FOCUS: return {
      ...state,
      nodes: (()=>{
        let nodes = {
          ...state.nodes,
          ...Object.assign({}, ...state.focusCopy.map((nid, ct)=>{
            // Get the unique id for a new node
            const id = state.id + ct;
            const osScaler = window.navigator.userAgent.indexOf("Mac")!=-1 ? 0.66 : 1
            const yOffset = 2 * 40 * 1/(window.devicePixelRatio*osScaler)
            return { [id]:
              {
                ...state.nodes[nid],
                pos: {x: state.nodes[nid].pos.x, y:
                state.nodes[nid].pos.y+yOffset}
              }
            };
          }))
        }

        for (let i = 0; i < state.focusCopy.length; ++i) {
          const copyId = state.id + i;
          nodes[copyId].readyStatus = isActionReady(nodes, state.edges, +copyId);
        }  // end for
        
        return nodes;
      })(),
      id: state.id + state.focusCopy.length
    }        
    case SET_CONFIG: return {
      ...state,
      nodes: updateNodeReadyStatus(Object.keys(state.nodes).reduce((result, key)=>{
	        result[+key] = {...state.nodes[+key]};  // copy the initial state
	        if (+key === action.id) {
	          result[+key].config = action.params;  // add the config params.
		  result[+key].output = updateInitialOutput(state.nodes, state.edges, +key);
	        }
	        return result;
      }, {}), state.edges, action.id, SET_CONFIG,
				   hasConfigChanged(state.nodes[action.id].config,
						    action.params, state.nodes[action.id].type))
    }
    case SET_OUTPUT: return {
      ...state,
      nodes: updateNodeReadyStatus(Object.keys(state.nodes).reduce((result, key)=>{
	        result[+key] = {...state.nodes[+key]};  // copy the initial state
	        if (+key === action.id) {
	          result[+key].output = action.output;  // add the config params.
	        }
	        return result;
      }, {}), state.edges, action.id, SET_OUTPUT)
    }
    case SET_NOTE_CONFIG : return {
      ...state,
      notes: state.notes.map( (n, i) => {
        if(i == action.id) {
         return {...n, ...action.params}
        }
        return n
      })
    }
    case SET_FILE_AVAILABLE: return {
      ...state,
      nodes: updateNodeReadyStatus(Object.keys(state.nodes).reduce((result, key)=>{
        result[+key] = {...state.nodes[+key]};  // copy the initial state
        if (+key === action.id) {
          result[+key].config.isAvailable = action.isAvailable;  // set the isAvailabale flag.
        }
        return result;
      }, {}), state.edges, action.id, SET_FILE_AVAILABLE)
    }
    case SET_STATE_FROM_FILE: return{
      ...state,
      ...action.state,
      nodes: validateLoadedNodesStatus(action.state.nodes,
				       action.state.edges,
				       /*resetLoading=*/true)
    }
    case VALIDATE_CURRENT_STATE: return{
      ...state,
      nodes: validateLoadedNodesStatus(state.nodes, state.edges)
    }
    case SET_IS_LOADING: return {
      ...state,
      nodes: Object.keys(state.nodes).reduce((result, key)=>{
        result[+key] = {...state.nodes[+key]};  // copy the initial state
        if (+key === action.id) {
          result[+key].isLoading = action.status;  // set the isLoading flag.
        }
        return result;
      }, {})
    }
    case HANDLE_NODE_ERROR: return {
      ...state,
      nodes: updateNodeReadyStatus(Object.keys(state.nodes).reduce((result, key)=>{
        result[+key] = {...state.nodes[+key]};  // copy the initial state
        if (+key === action.id) {
          result[+key].config = updateConfigOnError(action.action, action.err, result[+key].config);
        }
        return result;
      }, {}), state.edges, action.id, HANDLE_NODE_ERROR)
    }
    case RESET_STATE: return initialState

    default: return state
  }
}

/**
  * Initialize the node config base on type
  * @param {String} type - The type of node.
  */
export const initializeConfig = (type) => {
  switch(type){
    case 'LOAD_FILE':
      return {
        isAvailable: false,
	      inMemory: true,
        options:{
          encoding: 'utf_8',
          delim: ",",
          lineDelim: "",
          headerRow: 0,
          startLine: 0,
          escapechar: "",
          comment: "",
          thousands: "",
          decimal: ".",
          skipEmpty: true,
          naOptions: []
        }
      };
    case 'JOIN':
      return {
        how: "left",
        join: [[null, null]],
        suffix: [],
	isDefaultSuffix: true
      };
    case 'LOAD_CLOUD':
      return {
        ipAddr: "",
        uname: "",
        secretKey: "",
        bucket: "", 
        filepath: "",
	inMemory: true,
        options:{
          encoding: 'utf_8',
          delim: ",",
          lineDelim: "",
          headerRow: 0,
          startLine: 0,
          escapechar: "",
          comment: "",
          thousands: "",
          decimal: ".",
          skipEmpty: true,
          naOptions: []
        }
      };
    case 'CLEANSE':
      return {
        transformations: [],
        deleted: [],
        options: { is_sample: true, nsamples: 1000}
      };
    case 'AGGREGATE':
      return {
        aggKey: null,
        aggMap: []
      };
    case 'SPLITDATA':
      return {
        sizeType: "Percentage",
        sizeValue: 30,
        method: "Random"
      };
    case 'REGRESSION':
      return { 
        options: {is_sample: true, nsamples: 1000 },
        target: null,
        predictors: [],
        windowSize: 1,
        confidInterval: 95,
        featureSel: false
      };
    case 'AK_MINE': 
      return { 
        options: {is_sample: true, nsamples: 1000 },
	method: "fpminer",
        target: [],
        mineType: 'numeric',
        maxPattern : 100,
        threshold : 0.6,
	alpha: 0.05,
        holdout: 1,
        minsup: 0.01,
        nmodels: 15,
        niter: 500,
        nburn: 100,
	fdr: 'fast'
      };
    case 'SKLEARN':
      return { 
        options: {is_sample: true, nsamples: 1000 },
	      predictors: [],
        model: null,
        paramList: [],
        isCVEnabled: false,
        cvMethod: "RandomizedSearchCV",
        numCVFolds: 5,
        numIter: 10,
      };
    case 'PREDICT':
      return {
        includeResiduals: false,
        includeProbability: false,
        missingPredictors: {},
	outputColumns: []
      };
    case 'AK_CAUSAL': return {
      nodes: {},
      edges: [],
    };
    case 'AK_BROWSE': return {
      browseType: 'card',
      target: null,
      targetType: null,
      patternSet: [],
      allTags: {}
    };
    case 'VISUALIZER': return {
      options: {is_sample: true, nsamples: 1000 },
      charts: []
    };
  }
  return null
}

/**
  * Updates the node config base on the error that occurs
  * @param {String} type - The type of node.
  * @param {String} err - The python error message.
  * @param {Object} config - The node's configuration
  */
 export const updateConfigOnError = (type, err, config) => {
  switch(type){
    case 'LOAD_FILE':
      if(err.includes("No such file or directory")){
        config.isAvailable = false
        return config
      }
      return initializeConfig(type);
    case 'LOAD_CLOUD':
        if(err.includes("No such file or directory")){
          config.isAvailable = false
          return config
        }
        return initializeConfig(type);
    case 'JOIN':
    case 'CLEANSE':
    case 'AGGREGATE':
    case 'SPLITDATA':
    case 'AK_MINE':
    case 'AK_CAUSAL':
    case 'REGRESSION':
    case 'AK_BROWSE':
    case 'VISUALIZER':
    case 'SKLEARN':
    case 'PREDICT':
      return initializeConfig(type);
    default:
      return config;
  }
}

/**
  * Update the nodes ready status and propagate the potential changes.
  * @param {[object]} nodes - List of nodes in the flowgraph.
  * @param {[object]} edges - List of edges in the flowgraph.
  * @param {number} nid - The ID of the selected node (i.e. root node).
  * @param {string} action - The reducer action triggering this function.
  */
const updateNodeReadyStatus = (nodes, edges, nodeId, action, resetOutput=false) => {
  let affectedIds = [+nodeId, ...selectDescendantIDs({nodes, edges}, nodeId)];
  const newNodes = Object.keys(nodes).reduce((acc, nid)=>{
    if (affectedIds.includes(+nid)) {
      nodes[nid].readyStatus = isActionReady(nodes, edges, +nid);
      // if a node is ready based on its input and predecessors output 
      // and if its output is null, initialize the output
      if(
          nodes[nid].readyStatus === ReadyStatus.OK  // If the node is ready AND :
          && (
              (action == SET_OUTPUT && +nid !== +nodeId) // On output change of nodeId update all descendant outputs OR:
              || action == ADD_EDGE // On adding edge to nodeId update nodeId and all descendants
            )
          && nodes[nid].output == null // Only initialize if output is null
        ){
          nodes[nid].output = updateInitialOutput(nodes, edges, nid)
      } else if (nodes[nid].readyStatus === ReadyStatus.OK && resetOutput) {
	nodes[nid].output = updateInitialOutput(nodes, edges, nid);
      }
    }
    
    return {...acc, [nid]: {...nodes[nid]}};
  }, {});
  
  // Updated configs if neccessary
  return Object.keys(newNodes).reduce((acc, nid)=>{
          if (affectedIds.includes(+nid)) {
            newNodes[nid].config = reAlignConfig(selectPathTo({nodes:newNodes, edges}, nid))
          }
          return {...acc, [nid]: {...newNodes[nid]}};
        }, {});
}

/**
  * Selects the appropriate function to initialize an output for a node
  * @param {[object]} nodes - List of nodes in the flowgraph.
  * @param {[object]} edges - List of edges in the flowgraph.
  * @param {number} nid - The ID of the selected node (i.e. root node).
  */
const updateInitialOutput = (nodes, edges, nid) => {
  switch(nodes[nid].type) {
    case 'CLEANSE':
      if (nodes[nid].output === null || nodes[nid].output[0] === null) {
        return initializeFileOutput(nodes, edges, nid, "Cleanse");
      }
      return nodes[nid].output;
    case 'AGGREGATE': return initializeFileOutput(nodes, edges, nid, "Aggregate")
    case 'REGRESSION': return initializeFileOutput(nodes, edges, nid, "Regression")
    case 'SPLITDATA': return [null, null]
  }
  return [null]
}

/** Returns true if the config has changed, False o.w. */
const hasConfigChanged = (oldConfig, newConfig, type) => {
  /** Removes the 'uid' key from the list of transforms. */
  function removeUIDfromTransform(transformations) {
    return transformations.map(d=>Object.assign({}, ...Object.keys(d)
						.filter(k=>!['uid', 'idx'].includes(k))
						.map(k=>({[k]: d[k]}))));
  }
  
  switch(type) {
  case 'CLEANSE': 
    oldConfig = {...oldConfig, transformations:
		 removeUIDfromTransform(oldConfig.transformations)};
    newConfig = {...newConfig, transformations:
		 removeUIDfromTransform(newConfig.transformations)};
  }
  return !_.isEqual(oldConfig, newConfig);
};


/**
  * Initializes the output of a CLEANSE node to be the same as the input
  * @param {[object]} nodes - List of nodes in the flowgraph.
  * @param {[object]} edges - List of edges in the flowgraph.
  * @param {number} nid - The ID of the selected node (i.e. root node).
  * @param {String} type - The type of action.
  */
const initializeFileOutput = (nodes, edges, nid, type) => {
  const pathTo = selectPathTo({nodes, edges}, nid)
  if (pathTo.input.length == 0) {
    return [null];
  }
  
  // Select input based on parent output port
  const input = pathTo.input[0].output[pathTo.input[0].outPort]
  if (input === null) {
    return [null];
  }
  
  return [{
    columns: input.columns,
    colTypes: input.colTypes,
    name: type + "Data" + nid,
    path: null,
    lastModified: null,
    preview: input.preview,
  }]
}

/**
  * validates the ready status of all nodes when
  * a flow graph is loaded from a file.
  * @param {[object]} nodes - List of nodes in the flowgraph.
  * @param {[object]} edges - List of edges in the flowgraph.
  */
const validateLoadedNodesStatus = (nodes, edges, resetLoading=false) => {
  
  // get a list of all LOAD nodes and their descendants in order
  let affectedIds = []
  const nodeIds = Object.keys(nodes) 
  for(var i=0; i < nodeIds.length; i++){
    const nid = nodeIds[i]
    if(nodes[nid].type == "LOAD_FILE" || nodes[nid].type == "LOAD_CLOUD"){
      affectedIds.push(+nid)
      affectedIds = affectedIds.concat(selectDescendantIDs({nodes, edges}, nid))
    }
  }
  // append any other nodes 
  for(var i=0; i < nodeIds.length; i++){
    const nid = nodeIds[i]
    if (!affectedIds.includes(+nid)) {
      affectedIds.push(+nid)
    }
  }   
  
  // update the ready status and output of the nodes
  return affectedIds.reduce((acc, nid)=>{
    nodes[nid].readyStatus = isActionReady(nodes, edges, +nid);
    if(nodes[nid].readyStatus !== ReadyStatus.OK){
      nodes[nid].output = null
    }

    if (resetLoading) {
      nodes[nid].isLoading = false;
    }
    
    return {...acc, [nid]: {...nodes[nid]}};
  }, {});
};

/** 
 * Returns true if the action requires its predecessors output 
 * for the configuration. Returns False o.w.
 * @param {string} nodeType - Action type.
 */
function actionRequiresInput(nodeType) {
  // These actions don't require input for their configuration
  const exclude = ['AK_BROWSE', 'VISUALIZER'];
  return !(exclude.includes(nodeType));
}

/**
  * Determines if the nodeId is ready to be executed.
  * @param {[object]} nodes - List of nodes in the flowgraph.
  * @param {[object]} edges - List of edges in the flowgraph.
  * @param {number} nid - The ID of the selected node (i.e. root node).
  */
export const isActionReady = (nodes, edges, nodeId) => {
  // is config set
  if (nodes[nodeId].config === null) {
    return ReadyStatus.Unready;
  }

  const nodeType = nodes[nodeId].type;
  
  // Are predecessors ready
  const predecessors = edges.filter(edge=>+edge.dst===+nodeId)
	.sort((l,r)=>l.dstPort - r.dstPort)
	.map(edge => ({
	  ...nodes[+edge.src],
	  outPort: edge.srcPort
	}));

  if (predecessors.some(p=>p.readyStatus !== ReadyStatus.OK)) {
    return ReadyStatus.PrevUnready;
  }

  // get the input type
  let input = actionTypes(nodeType).input;
  if (input !== null) {
    if (predecessors.length == 0) {
      return ReadyStatus.PrevMissing;
    }

    if (actionRequiresInput(nodeType) &&
	predecessors.some(iput=>!iput.output || !iput.output[iput.outPort])) {
      return ReadyStatus.PrevNoOutput;
    }
    
    // convert to array for convenience
    input = (Array.isArray(input) ? input : [input]);

    // Are all file slots filled.
    if (predecessors.length !== input.length) {

      if (nodeType === 'AK_BROWSE') {
        // Default to training data if no file provided.
        if (predecessors[0].type !== 'AK_MINE') {
          return ReadyStatus.PrevMissing;
        }
      } else if (nodeType === 'AK_CAUSAL') {
	// Browser is optional
	if (actionTypes(predecessors[0].type).output !== FILE) {
	  return ReadyStatus.PrevMissing;
	}
      }
      else if (!input.some(iput=>isNodeTypeMultiInput(iput))) {
	return ReadyStatus.PrevMissing;
      }
    }
  }

  // if any other node check if their inputs (i.e. ancestors output) are ready
  // and check if configuration is properly set
  return isInputAligned(nodeType, predecessors, nodes[nodeId].config);
};

/**
  * Handles logic for deleting the focused nodes and edges.
  * Returns an object with the leftover nodes and edges.
  * @param {object} state - redux state
  */
const deleteFocus = (state) => {
  let {nodes, edges, notes, focusNodes, focusEdges, focusNotes} = state;

  // Use reduce to copy the node (key, values) except those in focusNodes.
  let keepNodes = Object.keys(nodes).reduce((result, key) => {
    if (!(focusNodes.includes(+key))) {
      result[key] = nodes[key];
    }
    return result;
  }, {});

  // update ready status
  let affectedIds = edges.filter((edge, eid)=>{
    return (focusEdges.includes(eid)
	    || (focusNodes.includes(edge.src) && !focusNodes.includes(edge.dst)));
  }).map(edge=>edge.dst);


  // add propagated nodes
  affectedIds = affectedIds.reduce((acc, nid) => {
    return [...acc, nid, ...selectDescendantIDs(state, nid)];
  }, []);

  let keepEdges = edges.filter((edge, eid)=>{
    const {src, dst} = edge;

    // keeps edge if:
    return !(focusEdges.includes(eid))  // it is not focused
      && !(focusNodes.includes(+src))  // the src node is not focused
      && !(focusNodes.includes(+dst));  // the dst node is not focused
  });

  keepNodes = {...keepNodes, ...affectedIds.reduce((acc, nodeId)=>{
    if (focusNodes.includes(+nodeId))  return acc;
    
    return {...acc, [nodeId]: {...state.nodes[nodeId],
			       readyStatus: isActionReady(keepNodes, keepEdges, nodeId)}};
  }, {})};
  
  // Use reduce to copy the notes except those in focusNotes.
  const keepNotes = Object.keys(notes).reduce((result, idx) => {
    if (focusNotes.includes(+idx)) {
      return result;
    }
    return [...result, notes[idx]];
  }, []);
  
  return {nodes: keepNodes, edges: keepEdges, notes: keepNotes};
};

export default graphReducer;
