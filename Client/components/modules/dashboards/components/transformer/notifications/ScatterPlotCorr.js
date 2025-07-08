import React from 'react';
import * as d3 from "d3";
import XYAxis from '../../../../charts/components/XYAxis';

import "../../../../../css/Charts.css"

/**
 * Creates a d3 scale and returns a wrapper which 
 * converts a data value to an X position  
 * @param: {number} width - length of the axis.
 * @param: {number} padding - padding around the axis.
 * @param: {array} data - Array containing the data objects.
 * @param: {string} X - X attribute.
 * @param: {string} type - type of X attribute.
 * @param: {array} order - the ordered categories for ordinal attributes.
*/
const xScale = (width, padding, data, X, type, order) => {  
  if(type == 'Numerical'){
    return d3.scaleLinear()
      .domain([d3.min(data, function(d) { return +d[X] }), d3.max(data, function(d) { return +d[X] })])
      .range([padding, width - padding]);
  }
  const cats = order == null ? data.map((d) =>  d[X] ) : order
  return d3.scaleBand()
    .domain(cats)
    .range([padding, width - padding]);
};

/**
 * Creates a d3 scale and returns a wrapper which 
 * converts a data value to a Y position  
 * @param: {number} height - length of the axis.
 * @param: {number} padding - padding around the axis.
 * @param: {array} data - Array containing the data objects.
 * @param: {string} Y - Y attribute.
 * @param: {string} type - type of Y attribute.
 * @param: {array} order - the ordered categories for ordinal attributes.
*/
const yScale = (height, padding, data, Y, type, order) => {
  
  if(type == 'Numerical'){
    return d3.scaleLinear()
      .domain([d3.min(data, function(d) { return +d[Y] }), d3.max(data, function(d) { return +d[Y] })])
      .range([height - padding, padding]);
  }
  const cats = order == null ? data.map((d) =>  d[Y] ) : order
  return d3.scaleBand()
    .domain(cats)
    .range([height - padding, padding]);
};

const renderPoints = (xAx, yAx, X, Y) => {
  return (d, index) => {
    const xOff = typeof xAx.bandwidth === 'function' ? xAx.bandwidth()/2 : 0
    const yOff = typeof yAx.bandwidth === 'function' ? yAx.bandwidth()/2 : 0

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
    
    return <circle {...circleProps}/>;
  };
};

export function ScatterPlotCorr(props){
  const {width, height, padding, opacity, data, filter, attrTypes, orderings, X, Y} = props
  
  if(data.length < 1 || X == null || Y == null) {
    return null
  }

  const xAx= xScale(width, padding, data, X, attrTypes[X], orderings[X]); //Axis scale      
  const yAx= yScale(height, padding, data, Y, attrTypes[Y], orderings[Y]); //Axis scale

  /**
   * Checks if a data point is valid for rendering
   *  @param {object} d - data point.
   */
   const isPointValid = (d) => {
    if(d[X] == null || isNaN(d[X])){
      return false
    }
    if(d[Y] == null || isNaN(d[Y])){
      return false
    }
    return true
  }

  const dataClean = data.filter( d => isPointValid(d) )
  
  return (
    <svg width={width} height={height} style={{verticalAlign: "top", opacity: opacity}}>
      {dataClean.map(renderPoints(xAx, yAx, X, Y, filter))}
      <XYAxis 
        width={width} 
        height={height} 
        padding={padding}
        X={X}
        Y={Y}
        XType={attrTypes[X] != "Numerical" ? "Cat" : "Num"}
        YType={attrTypes[Y] != "Numerical" ? "Cat" : "Num"}
        xScale={xAx}
        yScale={yAx}
        txtFontSize={12}/>
    </svg>
  );  
}

export default ScatterPlotCorr;