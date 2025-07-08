import React, { useState } from 'react';
import { connect } from 'react-redux';

import { selectNodes, selectEdges, selectDescendantIDs, selectValidSourceTypes } from '../graph.selectors';
import { DragDropContainer } from 'react-drag-drop-container';

import { uploadData, uploadCloudData,
         mergeData, transformData, aggregateData, splitData,
         minePatterns, modelBuilder, rollingRegression, predict,
         causalExtractor, browsePatterns, visualizer  } from './icons/akIcons';

import { inPortPos, outPortPos } from './Node';
import { actionTypes, isNodeDualInput, isTypeCompatible } from './Action.prototype';

const akIconMap = {
  LOAD_FILE: uploadData(),
  LOAD_CLOUD: uploadCloudData(),
  CLEANSE: transformData(),
  AGGREGATE: aggregateData(),
  JOIN: mergeData(),
  SPLITDATA: splitData(),
  AK_MINE: minePatterns(),
  AK_CAUSAL: causalExtractor(),
  SKLEARN: modelBuilder(),
  REGRESSION: rollingRegression(),
  PREDICT: predict(),
  AK_BROWSE: browsePatterns(),
  VISUALIZER: visualizer(),
}

// Extend the drop container class to that the drag image
// is always centered on the mouse position
export class CustomDragDropContainer extends DragDropContainer {
  startDrag = (clickX, clickY) => {
    document.addEventListener(`${this.props.targetKey}Dropped`, this.props.onDrop);
    const rect = this.containerElem.getBoundingClientRect();
    this.setState({
      clicked: true,
      leftOffset: -rect.width/2,
      topOffset: -rect.height/2,
      left: rect.left,
      top: rect.top,
    });
    this.props.onDragStart(this.props.dragData, );
  };
}

/**
 * Renders a draggable action node for the action box
 */
export function ActionListNode(props) {
  const { nodeSide, gridSide } = props

  /**
   * Checks if an edge is valid as input to a temporary
   * node being dragged i.e a node before it is added
   * @param {object} src - an object containing the properties of
   *                       a node that is already present in the graph
   * @param {string} dstType - the type of the temporary node
   */
  function isValidInputEdge(src, dstType){
    // Here there is no need to check that src and dst
    // are the same as dst is always a new node.
    // This also means that we don't need to check if the
    // input of dst is occupied
    
    const valid = actionTypes(dstType).input;
    const validArr = Array.isArray(valid) ? valid : [valid];
    const output = actionTypes(src.type).output;
    const outArr = Array.isArray(output) ? output : [output];
    // Check if dst node can accept input type
    if (!validArr.some(v=>v!==null && isTypeCompatible(outArr, v))) {
      return false;
    }
    return true
  }
  
  /**
   * Checks if an edge is valid as output from a temporary
   * node being dragged i.e a node before it is added
   * @param {object} srcType - the type of the temporary node
   * @param {string} dst - an object containing the properties of
   *                       a node that is already present in the graph
   */
  function isValidOutputEdge(srcType, dst){
    // Here there is no need to check that src and dst 
    // are the same as dst is always a new node.
    // This also means that we don't need to check if the 
    // input of dst is occupied
    
    const valid = props.validTypes(dst.ID) // Selecting unoccupied inputs
    const validArr = Array.isArray(valid) ? valid : [valid];
    const output = actionTypes(srcType).output;
    const outArr = Array.isArray(output) ? output : [output];
    // Check if dst node can accept input type
    if (!validArr.some(v=>v!==null && isTypeCompatible(outArr, v))) {
      return false;
    }

    return true
  }

  /**
   * Checks if a cycle will be formed by adding a node between
   * two existing nodes
   * @param {number} parentID - ID of the node that will be the parent of the added node
   * @param {number} childID - ID of the node that will be the child of the added node
   */
  function isCycle(parentID, childID){
    if( parentID !== null && childID !== null){
      return props.descendantIds(childID).includes(parentID);
    }
    return false
  }

  /**
   * Updates the snapping coordinates and IDs for temporary input and output edges
   * to a temporary node being dragged
   * @param {number} x - the x position of the temporary node
   * @param {number} y - the y position of the temporary node
   * @param {number} side - the width and height of the node
   * @param {string} nodeType - The type of the temporary node
   */
  function snapXY(x, y, nodeType) {
    let edges = { 
      inEdge: { id: null, srcPort: null, dstPort: null, loc: null}, 
      outEdge: { id: null, srcPort: null, dstPort: null, loc: null} 
    }

    if( x==null || y==null || nodeType==null ){
      return edges
    }
    
    const mouseInPos = {x: x, y: y}; // location for input connection
    const mouseOutPos = {x: x, y: y}; // location for output connection
    
    /**
     * Computes distance between 2 points
     * @param {object} ptA - the {x , y} position of point A
     * @param {object} ptB - the {x , y} position of point A
     */
    const distance = (ptA, ptB) => {
      return Math.sqrt((ptA.x - ptB.x) * (ptA.x - ptB.x) +
		       (ptA.y - ptB.y) * (ptA.y - ptB.y))
    }
    
    // get input node pos with minimum distance
    const snapInCoords = props.nodes.reduce((acc, node, index)=>{
      if (!isValidInputEdge(node, nodeType)) {
	return acc;
      }      
      let portPos = outPortPos(node.pos, gridSide);
      let srcPortNo = 0, dstPortNo = 0;
      const d = distance(mouseInPos, portPos);
      if(node.type == "SPLITDATA") {
        portPos.y = mouseInPos.y < portPos.y ? portPos.y-10 : portPos.y +10
        srcPortNo = mouseInPos.y < portPos.y ? 0 : 1;
      }

      if (isNodeDualInput(nodeType)) {
        const validInputs = actionTypes(nodeType).input;
        const output = actionTypes(node.type).output;

        dstPortNo = validInputs.indexOf(output);
        console.assert(dstPortNo >= 0, `${output} is not a valid input for ${node.predict}`);
      }
      
      if (d < acc.dist) {
	return {pos: portPos, dist: d, id: node.ID, srcPort: srcPortNo, dstPort: dstPortNo};
      }
      return acc;
    }, {'pos': null, 'dist': Infinity, 'id': null, 'srcPort': null, 'dstPort': null});
       
    if(snapInCoords.dist > 4*gridSide || snapInCoords.pos.x > mouseInPos.x) {
      // Don't show input edge if node too far or
      // node to the right of the temporary node
      edges.inEdge.id = null
      edges.inEdge.srcPort = null
      edges.inEdge.dstPort = null
      edges.inEdge.loc = null
    } 
    else if(snapInCoords.pos){
      // Show input edge to closest valid node
      edges.inEdge.id = snapInCoords.id
      edges.inEdge.srcPort = snapInCoords.srcPort
      edges.inEdge.dstPort = snapInCoords.dstPort 
      edges.inEdge.loc = {
        source: [snapInCoords.pos.x, snapInCoords.pos.y],
        target: [mouseInPos.x - nodeSide/2, mouseInPos.y]
      }
    }

    // get output node pos with minimum distance
    const snapOutCoords = props.nodes.reduce((acc, node, index)=>{
      if (!isValidOutputEdge(nodeType, node)) {
	      return acc;
      }
      
      let portPos = inPortPos(node.pos, gridSide);
      let srcPortNo = 0, dstPortNo = 0;
      const d = distance(mouseOutPos, portPos);
      if(nodeType == "SPLITDATA") {
        srcPortNo = mouseInPos.y < portPos.y ? 1 : 0
      }

      // The connecting node is predict
      if (isNodeDualInput(node.type)) {
        const validInputs = actionTypes(node.type).input;
        const output = actionTypes(nodeType).output;

        dstPortNo = validInputs.indexOf(output);
        console.assert(dstPortNo >= 0, `${output} is not a valid input for ${node.predict}`);

        portPos.y = (dstPortNo == 0 ? portPos.y - 10 : portPos.y + 10);
      }

      if (d < acc.dist) {
	      return {pos: portPos, dist: d, id: node.ID, srcPort: srcPortNo, dstPort: dstPortNo};
      }      
      return acc;
    }, {'pos': null, 'dist': Infinity, 'id': null, 'srcPort': null, 'dstPort': null});
    

    // Determine if the temporary edge should be shown
    if(snapOutCoords.dist > 4*gridSide 
      || mouseOutPos.x > snapOutCoords.pos.x 
      || isCycle(edges.inEdge.id, snapOutCoords.id)){
        // Don't show output edge if node too far or
        // node to the left of the temporary node  or
        // if node addition will cause a cycle
        edges.outEdge.id = null
        edges.outEdge.srcPort = null
        edges.outEdge.dstPort = null
        edges.outEdge.loc = null
    } 
    else if(snapOutCoords.pos){
      // Show output edge to closest valid node
      edges.outEdge.id = snapOutCoords.id
      edges.outEdge.srcPort = snapOutCoords.srcPort
      edges.outEdge.dstPort = snapOutCoords.dstPort // Should change in the future for dual input nodes
      edges.outEdge.loc = {
        source: [mouseOutPos.x + nodeSide/2, mouseOutPos.y],
        target: [snapOutCoords.pos.x, snapOutCoords.pos.y]
      }
    }
    return edges
  } 

  const [dragXY, setDragXY] = useState({x: null, y: null, isDragging: false, type: props.type})
  
  const onDrag = (dragData, currentTarget, x, y) => {
    if(x != dragXY.x || y != dragXY.y){
      const targetRect = document.querySelector(".basic-container").getBoundingClientRect()
      const snapEdges = snapXY(x-targetRect.left, y-targetRect.top, props.type)
      setDragXY({
        ...dragXY,
        x: x, 
        y: y, 
        isDragging: true,
        type: props.type
      })
      props.setDragEdge({
        edgeInID: snapEdges.inEdge.id,
        edgeInPort: {
          source: snapEdges.inEdge.srcPort,
          target: snapEdges.inEdge.dstPort,
        },
        edgeInLoc: snapEdges.inEdge.loc,
        edgeOutID: snapEdges.outEdge.id,
        edgeOutPort: {
          source: snapEdges.outEdge.srcPort,
          target: snapEdges.outEdge.dstPort,
        },
        edgeOutLoc: snapEdges.outEdge.loc
      })
    }
  }  

  const onDrop = () => {
    setDragXY({
      ...dragXY,
      x: null, 
      y: null, 
      isDragging: false, 
      type: props.type,
    })
  }
  
  return (
    <div style={{display: "block", margin: "0.5em"}}>
    <CustomDragDropContainer
      targetKey="actionDrop"
      dragData={{type: props.type}}
      dragClone={true}
      onDrag={onDrag}
      onDrop={onDrop}
      onDragEnd={onDrop} >
        <div 
          className='actionListNode' 
          data-testid='action-list-node' 
          style={{width: nodeSide, height: nodeSide, opacity: dragXY.isDragging ? 0.5 : 1}} >
            {akIconMap[props.type]}
        </div>
    </CustomDragDropContainer>
    </div>
  );
}

const mapStateToProps = (state) => {
  return {
    id: state.graph.id,
    nodes: selectNodes(state.graph),
    edges: selectEdges(state.graph),
    validTypes: (id) => selectValidSourceTypes(state.graph, id),
    descendantIds: (id) => selectDescendantIDs(state.graph, id)
  };
};

const mapDispatchToProps = null;

export default connect(mapStateToProps, mapDispatchToProps)(ActionListNode);
