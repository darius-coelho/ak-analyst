import React from 'react'
import { DraggableCore } from "react-draggable";
import * as d3 from 'd3'

import "../../../css/Spinners.css"

import { isNodeDualOutput, isNodeDualInput, ReadyStatus } from './Action.prototype';

import { collectNode } from '../../common/components/contextCollect'; 
import { ContextMenuTrigger } from "react-contextmenu";


const getTooltipText = (props) => {
  switch(props.type){
    case 'LOAD_FILE': return (    
      "Action: Load File\n" + 
      "File: " + props.config.name )
    default: return null
  }
}

// Get the in-port position based on a nodes overall position.
export const inPortPos = (pos, gridSide) => {
  const nodePos = {
    x: Math.max(pos.x, 1),
    y: Math.max(pos.y, 1)
  }

  return {
    x: nodePos.x,
    y: nodePos.y + gridSide 
  }
}

// Get the out-port position based on a nodes overall position.
export const outPortPos = (pos, gridSide) => {
    const nodePos = {
      x: Math.max(pos.x, 1),
      y: Math.max(pos.y, 1)
    }

    return {
      x: nodePos.x + 2*gridSide,
      y: nodePos.y + gridSide 
    }
  }

/** 
 * Renders the input ports where necessary.
 * @param {string} type - Action type.
 * @param {json} portProps - Port position info.
 * @param {fun} shape - Function which draws the port shape.
 */
function InPort(props) {
  const { type, portProps, shape } = props;

  // No input for load actions
  if (type == "LOAD_FILE" || type == "LOAD_CLOUD")  return null;

  if (isNodeDualInput(type)) {
    const transformTop = `translate(${portProps.x} ${portProps.y-10}) rotate(90)`;
    const transformBot = `translate(${portProps.x} ${portProps.y+10}) rotate(90)`;
    return (
	<g>            
          <g data-testid='in-port' id="in-port" key={1} transform={transformTop}>
            <path d={shape()} />   
          </g>
          <g data-testid='in-port' id="in-port" key={2} transform={transformBot}>
            <path d={shape()} />   
          </g>
        </g>
    );
  }
  
  const transform = `translate(${portProps.x} ${portProps.y}) rotate(90)`; 
  return (
      <g data-testid='in-port' id="in-port" transform={transform} >
        <path d={shape()} />
      </g>
  );
}

/** 
 * Renders the output ports where necessary.
 * @param {string} type - Action type.
 * @param {json} portProps - Port position info.
 * @param {fun} shape - Function which draws the port shape.
 * @param {fun} portMouseDown - Function handling clicking and dragging on a port.
 */
function OutPort(props) {
  const { type, portProps, shape, portMouseDown } = props;

  if (isNodeDualOutput(type)) {
    const transformTop = `translate(${portProps.x} ${portProps.y-10}) rotate(90)`;
    const transformBot = `translate(${portProps.x} ${portProps.y+10}) rotate(90)`;
    return (
	<g>            
        <g data-testid='out-port' id="out-port" key={1} transform={transformTop}
          onMouseDown={portMouseDown.bind(null, 0)}>
            <path d={shape()} />   
          </g>
        <g data-testid='out-port' id="out-port" key={2} transform={transformBot}
          onMouseDown={portMouseDown.bind(null, 1)}>
            <path d={shape()} />   
          </g>
        </g>
    );
  }
  
  const transform = `translate(${portProps.x} ${portProps.y}) rotate(90)`; 
  return (
      <g data-testid='out-port' id="out-port" transform={transform}
        onMouseDown={portMouseDown.bind(null, 0)}>
        <path d={shape()} />
      </g>
  );
}

export function Node(props) {  

  const { nodeSide, gridSide } = props
  
  // extract functions from props
  let { onStart, onDrag, onStop, portMouseDown, ...elProps} = props; 
  const {type, icon, ID, focus, pos, readyStatus, isLoading} = elProps;
  const mainBox = {...pos, width: 2*gridSide, height: 2*gridSide};
  
  onStart = onStart.bind(null, ID);
  onDrag = onDrag.bind(null, ID);
  onStop = onStop.bind(null, ID);  

  const inPortProps = inPortPos(mainBox, gridSide)
  const outPortProps = outPortPos(mainBox, gridSide)

  const iconPos = {
    x: pos.x + gridSide - nodeSide/2,
    y: pos.y + gridSide - nodeSide/2,
    width: nodeSide,
    height: nodeSide,
  }

  let fname = props.config ? props.config.name : null
  if(fname && fname.length > 8){
    fname = fname.slice(0, 7) + "..."
  }

  const fnameProps = {
    x: mainBox.x + mainBox.width/2,
    y: mainBox.y + 12,
    textAnchor: "middle",
    fontSize: 13
  }
  
  const toolTip = getTooltipText(props)
  
  // Spinner attributes
  const spinRad = nodeSide/2
  const spinX = iconPos.x + spinRad
  const spinY = iconPos.y + spinRad
  const arc = d3.arc()
    .innerRadius(spinRad)
    .outerRadius(spinRad+5)
    .startAngle(0)
    .endAngle(90 * (3.142/180));

  const triangle = d3.symbol().size(nodeSide).type(d3["symbolTriangle"])
  
  return (
    <ContextMenuTrigger id="action_context_menu" renderTag="g" nid={ID} type={type} collect={collectNode}>
      <DraggableCore data-testid='dragger' handle=".dragit" {...{onStart, onDrag, onStop}} >
        <g>
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#9790fe" />            
            </linearGradient>
          </defs>

          {
            isLoading
            ? <path data-testid='icon-spinner' d={arc()} fill="url(#gradient)" transform={`translate(${spinX},${spinY})`}>
                <animateTransform 
                  attributeType="xml"
                  attributeName="transform"
                  type="rotate"
                  from={`0 0 0`}
                  to={`360 0 0`}
                  dur="2.50s"
                  additive="sum"
                  repeatCount="indefinite" 
                />
              </path>
            : null
          }
          
          <foreignObject data-testid='akIcon' id="G2" x={iconPos.x} y={iconPos.y} width={iconPos.width} height={iconPos.height}>                
            {readyStatus === ReadyStatus.OK ? icon() : icon("100%", "100%", null, "#eaeaea", "#5f5f5f")}
          </foreignObject>
          

          { 
            type == "LOAD_FILE" || type == "LOAD_CLOUD"
            ? <text {...fnameProps} >                
                {fname}
              </text>
            : null
          }
          
          <rect data-testid='holder' className={`dragit ${ focus ? "holder-focus" : "holder"}`} key={0} {...mainBox} {...pos}>
            <title>{toolTip}</title>
          </rect>
          <InPort type={type} portProps={inPortProps} shape={triangle} />
          <OutPort type={type} portProps={outPortProps} shape={triangle}
            portMouseDown={portMouseDown.bind(null, ID)}
          />
        </g>        
      </DraggableCore>
    </ContextMenuTrigger>
  );
}

export default Node;
