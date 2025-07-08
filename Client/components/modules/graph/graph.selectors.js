import { actionTypes, isNodeTypeMultiInput } from './components/Action.prototype';

/**
  * Nodes selector which transforms the nodes dictionary 
  * to a list to faciliatate rendering.
  * @param {Object} state - The redux state.
  * @param {String} type - The type of node. If 'All' then all nodes are selected
  */
export const selectNodes = (state, type="All") => {
  const nodes = Object.keys(state.nodes).map((key, index)=>{
    const node = state.nodes[key];
    return {...node, ID: +key, focus: state.focusNodes.includes(+key)};
  });
  if(type != "All"){
    return nodes.filter(node => node.type == type)  
  }
  return nodes
};

/**
  * Edges selector which transforms the edges dictionary 
  * to a list to faciliatate rendering.
  * @param {Object} state - The redux state.  
  */
export const selectEdges = (state) => {
  return state.edges.map((edge, eid) => {
    return {...edge, focus: state.focusEdges.includes(eid)};
  });
};

/**
  * Notes selector which transforms the edges dictionary 
  * to a list to faciliatate rendering.
  * @param {Object} state - The redux state.  
  */
 export const selectNotes = (state) => {
  return state.notes.map((note, nid) => {
    return {...note, focus: state.focusNotes.includes(nid)};
  });
};

/**
  * Selector for getting an individual node.
  * @param {Object} state - The redux state.
  * @param {Number} type - The unique node ID.
  */
export const selectNodeByID = (state, nodeId) => {
  return {...state.nodes[+nodeId], ID: +nodeId, focus: state.focusNodes.includes(+nodeId)};
};

/**
  * Selector for getting the focused node info 
  * needed for rendering the config panel.
  * @param {Object} state - The redux state.
  */
export const selectFocusNodeOrNull = (state) => {
  if (state.focusNodes.length != 1)  return null;

  const nodeId = +state.focusNodes[0];
  const focusNode = state.nodes[state.focusNodes[0]];

  // Get the configurations of all input nodes.
  const input = state.edges.filter(edge=>edge.dst === nodeId)
	.map(edge=>({
	  ...state.nodes[edge.src].output,
	  srcId: edge.src,
	  outPort: edge.srcPort,
	  readyStatus: state.nodes[edge.src].readyStatus
	}));
  
  return {
    ID: nodeId, 
    type: focusNode.type, 
    config: focusNode.config,
    input: input, 
    output: focusNode.output, 
    readyStatus: focusNode.readyStatus
  };
};

/**
  * Selector for getting the path up to and including the node at nodeId.
  * @param {Object} state - The redux state.
  * @param {Number} nodeId - The unique node ID.  
  * @param {Number} nodeOutPort - The node's output port ID.
  */
export const selectPathTo = (state, nodeId, nodeOutPort) => {
  const node = state.nodes[+nodeId];  
  // recursively select the path and store relevant data
  return {
    ID: +nodeId,    
    outPort: nodeOutPort,
    type: node.type,
    config: node.config,
    readyStatus: node.readyStatus,
    output: node.output,
    input: state.edges.filter(edge=>edge.dst === +nodeId).sort((l,r)=>l.dstPort - r.dstPort)
      .map(edge=>selectPathTo(state, edge.src, edge.srcPort))
  };
};

/**
  * Selector for getting a list of all descendant IDs
  * @param {Object} state - The redux state.
  * @param {Number} type - The unique parent node ID.
  */
export const selectDescendantIDs = (state, nodeId) => {
  const { edges } = state;
  const nodeEdges = edges.filter(edge=>edge.src === +nodeId);
  
  return [...new Set(nodeEdges.reduce((acc, edge)=> {
    return [...acc, edge.dst, ...selectDescendantIDs(state, edge.dst)]
  }, []))];
};


/**
  * Selector for getting the list of valid source node types when
  * considering valid edges.
  * @param {Object} state - The redux state.
  * @param {Number} type - The unique destination node ID.
  */
export const selectValidSourceTypes = (state, nodeId) => {
  const dstType = state.nodes[+nodeId].type;

  // Get input nodes.
  const srcNodeIds = state.edges.filter(edge=>edge.dst === +nodeId).map(e=>e.src);
  const srcTypes = srcNodeIds.map(id=>{
    return actionTypes(state.nodes[+id].type).output;
  }).flat();  

  
  const input = actionTypes(dstType).input;

  // convert to array if necessary
  let requiredInputs = Array.isArray(input) ? input : [input];

  // remove all current inputs
  for (var i = 0; i < srcTypes.length; ++i) {
    if (isNodeTypeMultiInput(srcTypes[i])) {
      continue;
    }
    
    let rem = requiredInputs.indexOf(srcTypes[i]);

    if (rem >= 0) {
      requiredInputs.splice(rem, 1);
    }    
  }  // end for i

  return requiredInputs;
};
