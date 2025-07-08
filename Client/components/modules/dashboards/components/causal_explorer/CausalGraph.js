import React, { useState, useEffect } from 'react';
import * as d3 from "d3"

import CausalNode from './CausalNode';
import { collectCausalEdge } from '../../../common/components/contextCollect';
import { getPortPos, nodeWidth, nodeHeight } from './CausalNode';

import { DropTarget } from 'react-drag-drop-container';
import { ContextMenuTrigger } from "react-contextmenu";

/**
* Renders the nodes in the graph
* @param {object} nodes - Object containing the list of nodes in the causal graph
* @param {int} focusNode - name of the focused  node
* @param {function} onDragNode - function called when dragging a node - updates node position
* @param {function} onDropNode - function called when dragging a node ends - fixes node position
* @param {function} onStartDragEdge - function called when drawiong an edge from a node
*/
const NodeList = (props) => {
  const { nodes, focusNode, scale, onDragNode, onDropNode, onStartDragEdge } = props

  return Object.entries(nodes).map(([k, v], i) => {
    return (
      <CausalNode
        key={"node-"+i}
        {...v}
        focusNode={focusNode}
        scale={scale}
        influence={(v.type === 'observed' ? v.influence[focusNode] : 1.0)}
        onDragNode={onDragNode}
        onDropNode={onDropNode}
        onStartDragEdge={onStartDragEdge}
        name={k}
      />
    );
  })
}

/**
* Renders the edges in the graph
* @param {array} edges - List of edges between nodes
* @param {object} nodes - Object containing the list of nodes in the causal graph
* @param {int} focusEdge - index of the focused edge
* @param {function} changeFocusEdge - function to set the focused edge
*/
const EdgeList = (props) => {
  const { edges, nodes, focusNode, focusEdge, changeFocusEdge } = props

  return edges.map((d, i) => {
    let twidth = nodeWidth;
    let theight = nodeHeight;
    let swidth = nodeWidth;
    let sheight = nodeHeight;
    
    if (focusNode in nodes[d.targetAttr].influence) {
      // get adjusted width and height of target node
      twidth = nodeWidth * nodes[d.targetAttr].influence[focusNode];
      theight = nodeHeight * nodes[d.targetAttr].influence[focusNode];
    } 

    if (focusNode in nodes[d.sourceAttr].influence) {
      // get adjusted width and height of source node
      swidth = nodeWidth * nodes[d.sourceAttr].influence[focusNode];
      sheight = nodeHeight * nodes[d.sourceAttr].influence[focusNode];
    }
       
    const src = nodes[d.sourceAttr]
    const tgt = nodes[d.targetAttr]

    const dy = tgt.y - src.y
    const dx = tgt.x - src.x
    const theta = Math.atan2(dy, dx) * 180/Math.PI     

    const lineVertical = (theta >= 45 && theta <= 135) || (theta >= -135 && theta <= -45) 

    const lineGen = lineVertical ? d3.linkVertical(): d3.linkHorizontal();
    const diffX = lineVertical ? 0 : (src.x < tgt.x ? swidth/2 : -swidth/2)
    const diffY = lineVertical ? (src.y < tgt.y ? sheight/2 : -sheight/2) : 0
    
    const offX = lineVertical ? 0 : (src.x < tgt.x ? twidth/2 + 14 : -(twidth/2) - 14)
    const offY = lineVertical ? (src.y < tgt.y ? theight/2 + 14 : -(theight/2) - 14) : 0

    const linkData = {
      source: [src.x, src.y],
      target: [tgt.x-offX, tgt.y-offY]
    }
    const wScale = d3.scaleLinear().domain([0,0.8]).range([1, 10]);

    const edgeStyle = {
      strokeWidth: ('weight' in d ? wScale(d.weight) : 2),
      stroke: ('weight' in d ? 'black' : 'gray'),
      strokeDasharray: ('weight' in d ? 0 : 6)
    };

    return( 
      <ContextMenuTrigger key={"edge-"+i} id="causal_edge_context_menu" renderTag="g" edgeID={i} collect={collectCausalEdge}>
        <g>
          {
            focusEdge == i
            ? <path data-testid='link2' className="flow-link-focus2" onClick={() => changeFocusEdge(i)} d={lineGen(linkData)}/>
            : null
          }
        <path data-testid='dlink' className="flow-link" d={lineGen(linkData)} style={edgeStyle}/>
        <path data-testid='link' className="flow-link" onClick={() => changeFocusEdge(i)} d={lineGen(linkData)} markerEnd={'url(#arrowhead1)'} style={{stroke: 'transparent'}}/>
        </g>
      </ContextMenuTrigger>
    )        
  })
}

/**
 * Renders a temporary preview edge
 */
 function MouseLink(props) {
  const lineGen = d3.linkHorizontal();
  return (
    <path data-testid='mouse-link' className="mouse-link" d={lineGen(props.linkData)} />
  );
}

/**
* Renders the Causal graph 
*/
export function CausalGraph(props) {
  const { style, gridSide, nodes, edges, focusNode, focusEdge,
	  addNode, setNodes, onDragNode, onDropNode, changeFocusNode,
	  changeFocusEdge, onKeyPress } = props

  // Set grid color to blue if a node is being dragged over it
  // and can be dropped
  const [gridColor, setGridColor] = useState("#d4d4d4")

  const [activeNode, setActiveNode] = useState(null)
  const [neighborNode, setNeighborNode] = useState(null)
  const [dragEdge, setDragEdge] = useState(null)
  const [panStart, setPanStart] = useState(null);
  const [scale, setScale] = useState(1.0);
  
  const onStartDragEdge = (attr, port, pos) => {
    setActiveNode({attr: attr, port: port})
    const startPos = getPortPos(nodes[attr].x, nodes[attr].y, nodes[attr].influence[focusNode])
    setDragEdge({
      source: [
        pos.x,
        pos.y
      ], 
      target: [
        startPos.x,
        startPos.y
      ]
    })
  }


  /** Detects mouse down event to trigger panning action. */
  const mouseDown = (evt) => {
    if (evt.button != 0)  return;  // ignore right clicks
    const x = evt.nativeEvent.offsetX || evt.clientX;	
    const y = evt.nativeEvent.offsetY || evt.clientY;

    setPanStart({x,y});
  }

  /** Handles panning when moving the mouse. */
  const onPan = (evt) => {
    const x = evt.nativeEvent.offsetX || evt.clientX;	
    const y = evt.nativeEvent.offsetY || evt.clientY;

    const xDist = (x - panStart.x) / scale;
    const yDist = (y - panStart.y) / scale;
    
    setNodes(Object.assign({}, ...Object.entries(nodes)
			   .map(([k,v])=>({
			     [k]: {...v, x: v.x+xDist, y: v.y+yDist}				 
			   }))));
    
    setPanStart({x, y});
  }

  /** Set the zoom level via wheel scrolling*/
  const wheelZoom = (evt) => {
    setScale(Math.min(Math.max(0.2, scale + -evt.deltaY*0.001), 2.0));
  }
  
  const mouseMove = (dragEdge !== null ? ( (evt) => {
    evt.stopPropagation();
    // use clientX/Y in testing because offsetX is not passed
    const x = evt.nativeEvent.offsetX || evt.clientX;	
    const y = evt.nativeEvent.offsetY || evt.clientY;

    const newPos = snapEdge(x/scale, y/scale)


    setDragEdge({
      source: [
        dragEdge.source[0], 
        dragEdge.source[1]
      ], 
      target: [
        newPos.x,
        newPos.y
      ]
    })

  }) : (panStart !== null ? onPan : undefined));
  
  const snapEdge = (x, y) => {

    const distance = (ptA, ptB) => {
      return Math.sqrt((ptA.x - ptB.x) * (ptA.x - ptB.x) +
		       (ptA.y - ptB.y) * (ptA.y - ptB.y))
    }

    const mousePos = {x: x, y: y};

    // get node pos with minimum distance
    let snapCoords = Object.keys(nodes).reduce((acc, attr, index) => {

      if(attr == activeNode.attr){
        return acc
      }

      const node = nodes[attr];      
      const portPos = ['top', 'bottom', 'left', 'right'].reduce(function(acc, port) {
        const pos = getPortPos(node.x, node.y, port, node.influence[focusNode])
          const d = distance(mousePos, pos)
          if(d < acc.dist){
            return {dist: d, port: port}
          }
          return acc
      }, {dist: Infinity, port: null});      

      
      if (portPos.dist < acc.dist) {
	return {pos: getPortPos(node.x, node.y, portPos.port, node.influence[focusNode]), dist: portPos.dist, attr: attr, port: portPos.port};
      }      
      return acc;
    }, {'pos': null, 'dist': Infinity, 'attr': null, 'port': null});   

    if (snapCoords.dist > 50) {
      setNeighborNode(null);
      return mousePos;
    }

    setNeighborNode({attr: snapCoords.attr, port: snapCoords.port});
    return snapCoords.pos;
  }

  /**
  * Removes the temporary edge rendered when trying to draw an edge
  */
  const disableEdgeDraw = () => {
    if(neighborNode){
      props.addEdge(
        {
          sourceAttr: activeNode.attr,
          //sourcePort: activeNode.port,
          targetAttr: neighborNode.attr,
          //targetPort: neighborNode.port
        }
      )
    }
    setDragEdge(null);
    setNeighborNode(null);
    setPanStart(null);
  }

  /**
  * Highlights the graph canvas when an un added node is dragged over it
  */
  const onHit = (evt) => {
    const rect = evt.target.getBoundingClientRect()
    addNode(evt.dragData.attr, (evt.x-rect.left)/scale, (evt.y-rect.top)/scale)
    setGridColor("#d4d4d4")
  }

  /**
   * Clears focus from nodes or edges when the background/svg is clicked
   */
  const backgroundClick = (e) => {
    const role = e.target.getAttribute('role')    
    if (role !== 'Canvas')  return;  // do nothing
    changeFocusNode(null);
    changeFocusEdge(null);
  }  

  const canvasStyle = {
    transform: `scale(${scale})`
  }
  
  return (
      <div className="contentdiv content-container"
        style={{...style, position: "absolute"}}
        onKeyDown={onKeyPress}
        tabIndex="0"
      >
      <DropTarget 
        targetKey="causalNodeDrop"
        onHit={onHit}
        onDragEnter={() => setGridColor("#c39dff")}
        onDragLeave={() => setGridColor("#d4d4d4")}>
        <svg width="100%" height="100%" role={'Canvas'}
          onMouseMove={mouseMove}
          onMouseDown={mouseDown}
          onMouseUp={disableEdgeDraw}
          onWheel={wheelZoom}
          onClick={backgroundClick}
        >
      <defs>
        <pattern id="grid" width={gridSide*scale} height={gridSide*scale}
          patternUnits="userSpaceOnUse" style={{pointerEvents: "none"}}>
          <path d={`M ${gridSide*scale} 0 L 0 0 0 ${gridSide*scale}`}
            fill="none" stroke={gridColor} strokeWidth="0.5"/>
        </pattern>
        <marker id="arrowhead1" markerWidth="5" markerHeight="4" refX="0" refY="2" orient="auto">
          <polygon points="0 0, 5 2, 0 4" fill="#00000"/>
        </marker>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" style={{pointerEvents: "none"}}/>
      <g style={canvasStyle}>
        <EdgeList {...{edges, nodes, focusNode, focusEdge, changeFocusEdge}}/>
        <NodeList {...{nodes, focusNode, scale, onDragNode, onDropNode, onStartDragEdge}} />
          
      {
        dragEdge 
          ? <MouseLink linkData={dragEdge} />
          : null
      }
      </g>
      </svg>
      </DropTarget>
    </div>
  )
}

export default CausalGraph;
