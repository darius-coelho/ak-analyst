import React, { useState, useRef } from 'react';
import * as d3 from "d3"
import { ContextMenuTrigger } from "react-contextmenu";
import { connect } from 'react-redux';
import { isNodeDualOutput, isNodeDualInput } from './Action.prototype';
import { selectNodes, selectEdges, selectNotes } from '../graph.selectors';
import { setEdgeFocus, clearFocus, addNode, addEdge, setNodeFocus, setNoteFocus, setNoteConfig } from '../graph.actions';
import { inPortPos, outPortPos } from './Node';

import { DropTarget } from 'react-drag-drop-container';

import Action from './Action';
import Note from './Note';

/**
 * Renders the list of nodes added. 
 */
function NodeList(props) {
  const { portMouseDown, nodeSide, gridSide } = props;
  return props.nodes.map((node, index) =>
    <Action
      key={index}
      {...node}
      portMouseDown={portMouseDown}
      nodeSide={nodeSide}
      gridSide={gridSide} />
  );
}

/**
 * Renders a list of edges between nodes added.
 */
function EdgeList(props) {
  const { gridSide } = props
  const lineGen = d3.linkHorizontal();
  return props.edges.map((edge, index) => {    
    let posSrc = outPortPos(props.nodes.find(node=>node.ID===edge.src).pos, gridSide);
    let posDst = inPortPos(props.nodes.find(node=>node.ID===edge.dst).pos, gridSide);
    let typeSrc = props.nodes.find(node=>node.ID===edge.src).type;
    let typeDst = props.nodes.find(node=>node.ID===edge.dst).type;
    
    if(isNodeDualOutput(typeSrc) && edge.srcPort  == 0){
      posSrc.y -= 10
    }

    if(isNodeDualOutput(typeSrc) && edge.srcPort  == 1){
      posSrc.y += 10
    }

    if(isNodeDualInput(typeDst) && edge.dstPort  == 0){
      posDst.y -= 10
    }

    if(isNodeDualInput(typeDst) && edge.dstPort  == 1){
      posDst.y += 10
    }  
    
    let linkData = {source: [posSrc.x, posSrc.y], target: [posDst.x, posDst.y]};

    const onClick = () => {
      props.setEdgeFocus(index);
    };
    
    if (edge.focus) {
      return( 
        <g key={index}>
          <path data-testid='link2' className="flow-link-focus2" onClick={onClick} d={lineGen(linkData)}/>
          <path data-testid='link' className="flow-link-focus" onClick={onClick} d={lineGen(linkData)}/>
        </g>
      )
    }
    
    return(
      <g key={index}>
        <path data-testid='link' className="flow-link" onClick={onClick} d={lineGen(linkData)} />
      </g>
    )
  });
}

/**
 * Renders a temporary preview edge
 */
function MouseLink(props) {
  if (props.mouseLink === null || !props.isValid) {
    return null;
  }

  const lineGen = d3.linkHorizontal();
  let linkData = {
    source: [
      props.mouseLink.source[0], 
      props.mouseLink.source[1]
    ], 
    target: [
      props.mouseLink.target[0], 
      props.mouseLink.target[1]
    ]
  };

  return (
      <path data-testid='mouse-link' className="mouse-link" d={lineGen(linkData)} />
  );
}

/**
 * Renders the list of notes added. 
 */
 function NoteList(props) {  
  return props.notes.map((note, index) =>
    <Note
      key={index}
      id={index}
      {...note}
      isEdgeDrag={props.mouseLink !== null} // Indicate if edges are being dragged and pass pointer events through notes
      setNoteFocus={props.setNoteFocus}
      setNoteConfig={props.setNoteConfig} />
  );
}

/**
 * Renders the graph
 */
export function Graph({mouseLink=null, ...props}) {
  const containerRef = useRef(null);  
  const { nodeSide, gridSide } = props
  
  /**
   * Handles setting the dimensions of the svg/svg container
   * based on extreme positions of the nodes   
   */
  function getDims() {    
    if (containerRef.current === null) {
      return {width: "inherit", height: "inherit"};
    }

    const parentRect = containerRef.current.parentElement.getBoundingClientRect()
    const parentWidth = parentRect.width;
    const parentHeight = parentRect.height;    
    
    const maxX = props.nodes.reduce((acc, node)=>{
      return Math.max(acc, node.pos.x);
    }, -Infinity)

    const maxY = props.nodes.reduce((acc, node)=>{
      return Math.max(acc, node.pos.y);
    }, -Infinity)

    let newWidth = parentWidth - 1; 
    let newHeight = parentHeight - 1;
    
    if (maxX + 2*gridSide >= parentWidth) {
      newWidth = maxX + 4*gridSide;
    }
    
    if (maxY + 2*gridSide >= parentHeight) {
      newHeight = maxY + 4*gridSide;
    }

    return {width: newWidth, height: newHeight}
  }   
  
  // Clear focus on background click
  function backgroundClick(e) {
    const role = e.target.getAttribute('role')
    if (role !== 'Canvas')  return;  // do nothing
    props.clearFocus();
  } 

  const onHit = (evt) => {
    const rect = document.querySelector(".basic-container").getBoundingClientRect()    
    
    const offsetX = evt.x - rect.left
    const offsetY = evt.y - rect.top
    
    const x = Math.max(offsetX-nodeSide/2, 0)
    const y = Math.max(offsetY-nodeSide/2, 0)
          
    const x1 = gridSide * Math.floor(x/gridSide)
    const y1 = gridSide * Math.floor(y/gridSide)
          
    const xPos = x > (x1 + gridSide/2) ? (x1 + gridSide) : x1
    const yPos = y > (y1 + gridSide/2) ? (y1 + gridSide) : y1
    
    // Add dropped node
    props.addNode({
      'type': evt.dragData.type, 
      'pos': {
        x: xPos, 
        y: yPos 
      }
    });
    
    const inEdge = props.dragEdge.edgeInLoc
          ? {
	    src: props.dragEdge.edgeInID,
	    srcPort: props.dragEdge.edgeInPort.source,
	    dst: props.id,
	    dstPort: null,
	    dstPort: props.dragEdge.edgeInPort.target
	  }
                  : null
    const outEdge = props.dragEdge.edgeOutLoc
          ? {
	    src: props.id,
	    srcPort: props.dragEdge.edgeOutPort.source,
	    dst: props.dragEdge.edgeOutID,
	    dstPort: props.dragEdge.edgeOutPort.target
	  }
                    : null
    
    // Add valid snapped edges
    if(inEdge) {
      props.addEdge(inEdge);
      props.setNodeFocus(inEdge.dst)
    }
    if(outEdge) {
      props.addEdge(outEdge);
      props.setNodeFocus(outEdge.src)
    }    
    
    props.setDragEdge({
      ...props.dragEdge,      
      edgeInID: null,
      edgeInPort: null,
      edgeInLoc: null,
      edgeOutID: null,
      edgeOutPort: null,      
      edgeOutLoc: null
    })
    setGridColor("#d4d4d4")
  } 

  // Set grid color to blue if a node is being dragged over it 
  // and can be dropped
  const [gridColor, setGridColor] = useState("#d4d4d4")
  
  return (
    
    <div ref={containerRef} data-testid='graph-svg-container' style={{postion:'relative', ...getDims()}}>
      <ContextMenuTrigger id="canvas_context_menu" renderTag="div">
      <DropTarget 
        targetKey="actionDrop"     
        onHit={onHit}
        onDragEnter={() => setGridColor("#c39dff")}
        onDragLeave={() => setGridColor("#d4d4d4")}>
          <svg data-testid='graph-svg' role={'Canvas'}
          style={{width:"100%", height:"100%"}} onClick={backgroundClick}>
            <defs>
              <pattern id="grid" width={gridSide} height={gridSide} patternUnits="userSpaceOnUse" style={{pointerEvents: "none"}}>          
                <path d={`M ${gridSide} 0 L 0 0 0 ${gridSide}`} fill="none" stroke={gridColor} strokeWidth="0.5"/>
              </pattern>
              <marker id="arrowhead" markerWidth="10" markerHeight="4" refX="2" refY="2" orient="auto">
                <polygon points="0 2, 5 0, 5 4" fill="#b7b7b7"/>
              </marker>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" style={{pointerEvents: "none"}}/>
            
            <MouseLink mouseLink={mouseLink} isValid={true} />
            <MouseLink mouseLink={props.dragEdge.edgeInLoc} isValid={true}/>
            <MouseLink mouseLink={props.dragEdge.edgeOutLoc} isValid={true} />
            <NoteList {...props} mouseLink={mouseLink} />
            <EdgeList {...props} />
            <NodeList {...props} />
            {
              props.nodes.length < 1 && props.notes.length < 1
              ? <g className='jumbotron'>
                  <text>Drag in Actions to Get Started</text>
                  <line x1="-320px" y1="-10px" x2="-255px" y2="-10px" stroke="#b7b7b7" 
                  strokeWidth="5" markerStart="url(#arrowhead)" />
                </g>
              : null
            }        
          </svg>
      </DropTarget>
      </ContextMenuTrigger>
    </div>    
  );
}


const mapStateToProps = (state) => {
  return {
    id: state.graph.id,
    nodes: selectNodes(state.graph),
    edges: selectEdges(state.graph),
    notes: selectNotes(state.graph)
  };
};
			
const mapDispatchToProps = (dispatch) => {
  return {
    setEdgeFocus: (index) => dispatch(setEdgeFocus([index])),
    clearFocus: () => dispatch(clearFocus()),
    addNode: (node) => dispatch(addNode(node)),
    addEdge: (edge) => dispatch(addEdge(edge)),
    setNodeFocus: (id) => dispatch(setNodeFocus([id])),
    setNoteFocus: (id) => dispatch(setNoteFocus([id])),
    setNoteConfig: (id, params) => dispatch(setNoteConfig(id, params)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Graph);
