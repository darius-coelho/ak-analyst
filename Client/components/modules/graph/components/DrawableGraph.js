import React, { useState } from 'react';
import { connect } from 'react-redux';
import { addEdge } from '../graph.actions';
import { selectValidSourceTypes, selectDescendantIDs } from '../graph.selectors';

import { actionTypes, isNodeDualOutput,
	 isNodeDualInput, isTypeCompatible } from './Action.prototype';
import { inPortPos, outPortPos } from './Node';
import Graph from './Graph';

import './css/FlowGraph.css';

export function DrawableGraph(props) {
  const { gridSide } = props

  const [mouseDownID, setMouseDownID] = useState(null);
  const [mouseDownPort, setMouseDownPort] = useState(null);
  const [mouseLink, setMouseLink] = useState(null);
  const [neighborID, setNeighborID] = useState(null);
  const [neighborPort, setNeighborPort] = useState(null);
  
  function enableEdgeDraw(ID, port) {
    setMouseDownID(ID);    
    setMouseDownPort(port)
  }

  function isValidEdge(sourceId, destId) {
    if (sourceId === destId) {
      return false;
    }

    if (props.edges.filter(e=>e.src === +sourceId && e.dst === +destId).length > 0) {
      // edge already exists
      return false;
    }
    
    const valid = props.validTypes(destId);
    
    const output = actionTypes(props.nodes[sourceId].type).output;
    const outArr = Array.isArray(output) ? output : [output];
    if (!valid.some(v=>v!==null && isTypeCompatible(outArr, v))) {
      return false;
    }

    // prevent cycles
    return !props.descendantIds(destId).includes(sourceId);
  }
  
  // handles determining if the mouse link should snap to an acceptable node
  // and updates the internal data accordingly.
  // evt: Event containing mouse screen position.
  // returns: possibly snapped X, Y coordinates for the end of mouse link.
  function snapXY(evt, outputType) {
    // use clientX/Y in testing because offsetX is not passed
    const x = evt.nativeEvent.offsetX || evt.clientX;	
    const y = evt.nativeEvent.offsetY || evt.clientY;

    const mousePos = {x: x, y: y};
    
    const distance = (ptA, ptB) => {
      return Math.sqrt((ptA.x - ptB.x) * (ptA.x - ptB.x) +
		       (ptA.y - ptB.y) * (ptA.y - ptB.y))
    }
    
    // get node pos with minimum distance
    let snapCoords = Object.keys(props.nodes).reduce((acc, ID, index)=>{
      ID = +ID;  // convert to number

      if (!isValidEdge(mouseDownID, ID)) {
	return acc;
      }

      const node = props.nodes[ID];
      
      let portPos = inPortPos(node.pos, gridSide);
      let dstPort = 0;
      
      // Handle snap selection for dual input nodes.
      if (isNodeDualInput(node.type)) {
	const validInputPorts = actionTypes(node.type).input;
	const portNum = validInputPorts.indexOf(outputType);
	if (portNum == 0) {
	  portPos.y -= 10;
	}

	if (portNum == 1) {
	  portPos.y += 10;
	  dstPort = 1;
	}
      }
      
      const d = distance(mousePos, portPos);
      if (d < acc.dist) {
	return {pos: portPos, dist: d, id: ID, dstPort: dstPort};
      }      
      return acc;
    }, {'pos': null, 'dist': Infinity, 'id': null, 'dstPort': null});    

    if (snapCoords.dist > 50) {
      setNeighborID(null);
      setNeighborPort(null);
      return mousePos;
    }

    setNeighborID(snapCoords.id);
    setNeighborPort(snapCoords.dstPort); // Should change in the future for dual input nodes
    return snapCoords.pos;
  }

  
  const mouseMove = (mouseDownID !== null ? ((evt) => {
    evt.stopPropagation();

    const outputType = actionTypes(props.nodes[mouseDownID].type).output;
    const {x, y} = snapXY(evt, outputType);
    let destPos = {x: x, y: y};
    let sourcePos = outPortPos(props.nodes[mouseDownID].pos, gridSide);

    if(isNodeDualOutput(props.nodes[mouseDownID].type) && mouseDownPort == 0){
      sourcePos.y -= 10
    }

    if(isNodeDualOutput(props.nodes[mouseDownID].type) && mouseDownPort == 1){
      sourcePos.y += 10
    }
        
    setMouseLink({source: [sourcePos.x, sourcePos.y],
		  target: [destPos.x, destPos.y]});          
    
  }) : undefined);

  
  function disableEdgeDraw() {
    if (neighborID != null) {
      props.addEdge({
	src: mouseDownID,
	srcPort: mouseDownPort,
	dst: neighborID,
	dstPort: neighborPort
      });
    }
    setMouseDownID(null);
    setNeighborID(null);
    setNeighborPort(null);
    setMouseLink(null);
  }
  
  return (    
      <div className="basic-container" onMouseMove={mouseMove} onMouseUp={disableEdgeDraw}>
        <Graph 
          portMouseDown={enableEdgeDraw} 
          mouseLink={mouseLink} 
          size={props.size}
          nodeSide={props.nodeSide}
          gridSide={props.gridSide}
          dragEdge={props.dragEdge}
          setDragEdge={props.setDragEdge} />
      </div>
  );
}

const mapStateToProps = (state) => {
  return {    
    nodes: state.graph.nodes,
    edges: state.graph.edges,
    validTypes: (id) => selectValidSourceTypes(state.graph, id),
    descendantIds: (id) => selectDescendantIDs(state.graph, id)
  };
};
			
const mapDispatchToProps = (dispatch) => {
  return {
    addEdge: (edge) => dispatch(addEdge(edge))
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DrawableGraph);
