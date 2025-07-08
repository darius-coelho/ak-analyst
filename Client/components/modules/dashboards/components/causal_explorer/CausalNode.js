import React, { useState, useEffect } from 'react';
import * as d3 from "d3"

import { DraggableCore } from "react-draggable";
import { ContextMenuTrigger } from "react-contextmenu";
import { collectCausalNode } from '../../../common/components/contextCollect';

export const nodeWidth = 80;
export const nodeHeight = 30;

export const getPortPos = (x, y, loc, influence) => {
  influence = (influence === undefined ? 1.0 : influence);
  const width = nodeWidth * influence;
  const height = nodeHeight * influence;
  switch(loc){
    case 'top': return { x: x, y: y-height/2 };
    case 'bottom':   return { x: x, y: y+height/2 };
    case 'left': return { x: x-width/2, y: y };
    case 'right': return { x: x+width/2, y: y };
    default: return {x: x, y: y};
  }
}

/**
* Renders the node in the causal network
* @param {string} name - The attribute being added to the causal graph
* @param {number} x - The x position of the causal node on the canvas
* @param {number} y - The y position of the causal node on the canvas
* @param {bool} inCycle - Indicates if a node is part of a cycle
* @param {function} onDragNode - Function that updates the node postion when it is being dragged
* @param {function} onDropNode - Function that fixes the node postion when it is dropped
* @param {function} onDragNode - Function called when trying to draw an edge from this node
*/
export function CausalNode(props) {
  const { name, x, y, type, inCycle, focusNode, scale, ate,
	  onDragNode, onDropNode, onStartDragEdge } = props

  const ateText = (
    type === 'latent' || ate === null || !(focusNode in ate)
      ? null
      : `${ate[focusNode].ate.toFixed(2)} (${ate[focusNode].ci[0].toFixed(2)}, ${ate[focusNode].ci[1].toFixed(2)})`
  );

  let ateTextStyle = {};
  if (ateText !== null) {
    ateTextStyle = {
      fontSize: '0.8rem',
      fill: ate[focusNode].ci[0] > 0 ? 'darkgreen' : (ate[focusNode].ci[1] < 0
						      ? 'darkred'
						      : 'darkgray')
    };
  }
  
  const influence = (props.influence === undefined ? 1.0 : props.influence);

  /**
   * Updates the node postion when it is being dragged
   * @param {object} evt - mouse event
   */
  const onDrag = (evt, ui) => {
    onDragNode(name, evt.offsetX / scale, evt.offsetY / scale)
  }

  /**
   * Function to handle stopping the drag
   */
  const onStop = () => {
    onDropNode(name)
  }

  const width = nodeWidth * influence;
  const height = nodeHeight * influence;

  const wPad = 16;
  const hPad = 12;

  
  const contextMenuID = (type === 'latent'
			 ? 'latent_node_context_menu'
			 : 'causal_node_context_menu');

  // port positions
  const tport = getPortPos(x, y, 'top', influence);
  const bport = getPortPos(x, y, 'bottom', influence);
  const lport = getPortPos(x, y, 'left', influence);
  const rport = getPortPos(x, y, 'right', influence);

  const textSize = d3.scaleLinear().domain([1,2]).range([1,1.5])(influence);
  const textStyle = {
    width: width,
    height: height,
    fontSize: `${textSize}rem`,
    lineHeight: `calc(${height+1}px - ${textSize/2}rem)`
  };
  
  return (
    <ContextMenuTrigger id={contextMenuID} renderTag="g" attr={name} collect={collectCausalNode}>
    <DraggableCore data-testid='dragger' handle=".dragit" {...{onDrag, onStop}} >
      <g className='causalNode'>
        <title>{name}</title>

      <foreignObject x={x-width/2} y={y-height/2} width={width} height={height}>
      <div className={`causalNodeOuterDiv ${ focusNode == name ? "inFocusOuter" : null}`} style={{width: width, height: height}}>
      <div className={`causalNodeDiv ${inCycle ? 'inCycle' : null} ${ focusNode == name ? "inFocus" : null} ${type === 'latent' ? 'latent': null}`} style={textStyle}>
              {name}
            </div>
          </div>
        </foreignObject>

      <rect role='node-holder' className={`dragit holder`} x={x-(width+wPad)/2} y={y-(height+hPad)/2} width={width+wPad} height={height+hPad}></rect>

        <rect
          {...tport}          
          className='causalNodeHotSpot'
          style={{transform:'translate(-4px, -8px)'}}
          onMouseDown={() => onStartDragEdge(name, 'top', tport)}
        />

        <rect
          {...bport}
          className='causalNodeHotSpot'
          style={{transform:'translate(-4px, 0px)'}}
          onMouseDown={() => onStartDragEdge(name, 'bottom', bport)}
        />

        <rect
          {...lport}
          className='causalNodeHotSpot'
          style={{transform:'translate(-8px, -4px)'}}
          onMouseDown={() => onStartDragEdge(name, 'left', lport)}
        />

        <rect
          {...rport}
          className='causalNodeHotSpot'
          style={{transform:'translate(0px, -4px)'}}
          onMouseDown={() => onStartDragEdge(name, 'right', rport)}
      />
      {
	ateText === null
	  ? null
	  : <text x={x-width/2} y={y} dx={-5} dy={-25} style={ateTextStyle}>{ateText}</text>
      }
      </g>
    </DraggableCore>
    </ContextMenuTrigger>
  )
}

export default CausalNode;
