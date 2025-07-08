
import React, { useState } from 'react';
import * as d3 from "d3";
import * as d3Col from 'd3-scale-chromatic'

export default function PatternBubbleLegend(props){
  if(!props.show) {
    return null
  }
  
  const rAx= props.rAx
  const labelTop = 25
  const offsetLeft = 10
  const qr0 = d3.min(props.stats, function(d) { return +d["size"] })
  const qr1 = d3.max(props.stats, function(d) { return +d["size"] })
  const qr50 = Math.floor(qr0 + (qr1 - qr0)/2)
  
  return (
    <div className='legendBox'>
      <svg width={props.width} height={props.height}>
        <foreignObject x={offsetLeft} y={labelTop-15} width="120" height="20">
          <div className="legendText" title={"Effect on "+props.Y}>{"Effect on "+props.Y}</div>
        </foreignObject>
        <text x={offsetLeft + 32} y={labelTop + 30} textAnchor={"middle"} fontSize="12">
          Pos
        </text>
        <circle cx={offsetLeft + 32} cy={labelTop + 45} r={10} fill={d3Col.interpolateRdYlGn(1)}/>
        <text x={offsetLeft + 88} y={labelTop + 30} textAnchor={"middle"} fontSize="12">
          Neg
        </text>
        <circle cx={offsetLeft + 88} cy={labelTop + 45} r={10} fill={d3Col.interpolateRdYlGn(0)}/>
        
        <foreignObject x={offsetLeft + 145} y={labelTop-15} width="145" height="20">
          <div className="legendText" title={`Importance of ${props.X}`}>{`Importance of ${props.X}`}</div>
        </foreignObject>
        
        <text x={offsetLeft + 220 - 50} y={labelTop + 45} textAnchor={"end"} fontSize="12">
          High
        </text>
        <text x={offsetLeft + 220 + 50} y={labelTop + 45} textAnchor={"start"} fontSize="12">
          Low
        </text>

        <circle cx={offsetLeft + 220 - 35} cy={labelTop + 30} r={10} fill={d3Col.interpolateRdYlGn(1)} />
        <circle cx={offsetLeft + 220} cy={labelTop + 30} r={10} fill={d3Col.interpolateRdYlGn(1)} opacity={0.5} />
        <circle cx={offsetLeft + 220 + 35} cy={labelTop + 30} r={10} fill={d3Col.interpolateRdYlGn(1)} opacity={0.07} />
        
        <circle cx={offsetLeft + 220 - 35} cy={labelTop + 55} r={10} fill={d3Col.interpolateRdYlGn(0)} />
        <circle cx={offsetLeft + 220} cy={labelTop + 55} r={10} fill={d3Col.interpolateRdYlGn(0)} opacity={0.5} />
        <circle cx={offsetLeft + 220 + 35} cy={labelTop + 55} r={10} fill={d3Col.interpolateRdYlGn(0)} opacity={0.07} />

        <foreignObject x={offsetLeft + 325} y={labelTop-15} width="120" height="20">
          <div className="legendText" title={`Group Count`}>{`Group Count`}</div>
        </foreignObject>

        <circle cx={offsetLeft + 375 - rAx(qr50) - rAx(qr0) - 10} cy={labelTop + 45} r={rAx(qr0)} fill={"#f7f7f7"} stroke={"#111111"}/>
        <text x={offsetLeft + 375 - rAx(qr50) - rAx(qr0) - 10} y={labelTop + 45 - rAx(qr0) - 5} textAnchor={"middle"} fontSize="10">
          {qr0}
        </text>
        <circle cx={offsetLeft + 375} cy={labelTop + 45} r={rAx(qr50)} fill={"#f7f7f7"} stroke={"#111111"}/>
        <text x={offsetLeft + 375} y={labelTop + 45 - rAx(qr50) - 5} textAnchor={"middle"} fontSize="10">
          {qr50}
        </text>
        <circle cx={offsetLeft + 375 + rAx(qr50) + rAx(qr1) + 10} cy={labelTop + 45} r={rAx(qr1)} fill={"#f7f7f7"} stroke={"#111111"}/>
        <text x={offsetLeft + 375 + rAx(qr50) + rAx(qr1) + 10} y={labelTop + 45 - rAx(qr1) - 5} textAnchor={"middle"} fontSize="10">
          {qr1}
        </text>          
      </svg>      
    </div>
  );
}
