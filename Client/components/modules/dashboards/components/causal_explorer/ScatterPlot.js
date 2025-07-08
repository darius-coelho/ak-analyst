import React from 'react';
import {scaleBand, scaleLinear, extent} from "d3";

import { collectChart } from '../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";

import XYAxis from '../../../charts/components/XYAxis';
import "../../../../css/Charts.css"


const xScale = (width, padding, data, X, type) => {
  if(type == 'Numerical'){
    return scaleLinear()
      .domain(extent(data, (d) => +d[X]))
      .range([padding, width - padding]).nice();
  }
  return scaleBand()
    .domain(data.map((d) => d[X]))
    .range([padding, width - padding]);
};

const yScale = (height, padding, data, Y, type) => {
  if(type == 'Numerical'){
    return scaleLinear()
      .domain(extent(data, (d) => +d[Y]))
      .range([height - padding, padding]).nice();
  }

  return scaleBand()
    .domain(data.map((d) => d[Y]))
    .range([height - padding, padding]);
};

const renderPoints = (xAx, yAx, X, Y) => {
  const xOff = typeof xAx.bandwidth === 'function' ? xAx.bandwidth()/2 : 0
  const yOff = typeof yAx.bandwidth === 'function' ? yAx.bandwidth()/2 : 0

  return (d, index) => {
    const circleProps = {
      cx: xAx(d[X]) + xOff,
      cy: yAx(d[Y]) + yOff,
      stroke: "#ffffff" ,
      strokeWidth: 1,
      opacity: 0.7,
      r: 3,
      className: "dataItem",
      key: index,
    }
    
    return <circle role="dataPoint" {...circleProps}/>;
  };
};

export function ScatterPlot(props) {  
  const { data, X, XType, Y, YType, width, height, padding } = props

  if(data.length < 1) {
    return null
  }
  
  const xAx = xScale(width, padding, data, X, XType); //Axis scale      
  const yAx = yScale(height, padding, data, Y, YType); //Axis scale

  /**
    * Checks if a data point is valid for rendering
    *  @param {object} d - data point.
    */
   const isPointValid = (d) => {
    if(d[X] == null || (XType == 'Numerical' && isNaN(d[X]))){
      return false
    }
    if(d[Y] == null || (YType == 'Numerical' && isNaN(d[Y]))){
      return false
    }
    return true
  }

  const dataClean = data.filter( d => isPointValid(d) )
  
  return (
    <div style={{display: "inline-block", width: width, height: height, margin: 10}}>
    <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.scattersvg'} name={`${X} vs ${Y}`} collect={collectChart}>
      <svg className='scattersvg' width={width} height={height}>
        {dataClean.map(renderPoints(xAx, yAx, X, Y))}
        <XYAxis
          {...props}
          xScale={xAx}
          yScale={yAx}
          XType={XType != "Numerical" ? "Cat" : "Num"}
          YType={YType != "Numerical" ? "Cat" : "Num"}
          txtFontSize={12}
        />
      </svg>
    </ContextMenuTrigger>
    </div>
  );  
}

export default ScatterPlot;
