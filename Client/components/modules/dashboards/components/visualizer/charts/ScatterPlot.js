import React from 'react';

import { collectChart  } from '../../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";

import * as d3 from "d3";
import * as d3Col from 'd3-scale-chromatic'
import XYAxis from '../../../../charts/components/XYAxis';

/**
 * Creates a d3 scale and returns a wrapper which 
 * converts a data value to an X position  
 * @param: {number} width - length of the axis.
 * @param: {number} padding - padding around the axis.
 * @param: {array} data - Array containing the data objects.
 * @param: {string} X - X attribute.
 * @param: {string} type - type of X attribute.
*/
const xScale = (width, padding, data, X, type) => {  
  if(type == 'Numerical'){
    return d3.scaleLinear()
      .domain([d3.min(data, (d) => +d[X]), d3.max(data, (d) => +d[X])])
      .range([padding, width - padding]).nice();
  }
  return d3.scaleBand()
    .domain(data.map((d) => d[X]).sort((a, b) => a.toString().localeCompare(b.toString(), undefined, { numeric: true })))
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
*/
const yScale = (height, padding, data, Y, type) => {
  
  if(type == 'Numerical'){
    return d3.scaleLinear()
      .domain([d3.min(data, (d) => +d[Y]), d3.max(data, (d) => +d[Y])])
      .range([height - padding, padding]).nice();
  }

  return d3.scaleBand()
    .domain(data.map((d) => d[Y]).sort((a, b) => a.toString().localeCompare(b.toString(), undefined, { numeric: true })))
    .range([height - padding, padding]);
};

/**
 * Creates a d3 scale and returns a wrapper which 
 * converts a data value to a radius length  
 * @param: {number} min - lower bound radius.
 * @param: {number} max - upper bound radius.
 * @param: {array} data - Array containing the data objects.
 * @param: {string} R - radius attribute.
 * @param: {string} type - type of R attribute.
*/
const rScale = (min, max, data, R, type) => {

  if(R == "None" || type != 'Numerical'){
    return null
  }

  return d3.scaleSqrt()
    .domain([d3.min(data, (d) => +d[R]), d3.max(data, (d) => +d[R])])
    .range([min, max]);
};

/**
 * Creates a d3 scale and returns a wrapper which 
 * converts a data value to a color 
 * @param: {array} data - Array containing the data objects.
 * @param: {string} C - color attribute.
 * @param: {string} type - type of color attribute.
*/
const colScale = (data, C, type) => {
  if(C == "None"){
    return null
  }

  if(type == 'Nominal'){
    const cats = data.map(d => d[C]).sort((a, b) => a.toString().localeCompare(b.toString(), undefined, { numeric: true }))
    return d3.scaleOrdinal(d3.schemeCategory10)
          .domain([... new Set(cats)]);
  }
  if(type == 'Numerical'){    
    return d3.scaleLinear()
          .domain([d3.min(data, (d) => +d[C]), d3.max(data, (d) => +d[C])])
          .range([d3Col.interpolatePurples(0), d3Col.interpolatePurples(1)]);
  }
  return null

};

/**
 * Renders data poimts on the scatterplot
 *  @param {function} xAx - x axis scaling function.
 *  @param {function} yAx - y axis scaling function.
 *  @param {function} rAx - radius scaling function.
 *  @param {function} cAx - color scaling function.
 *  @param {string} X - x axis attribute.
 *  @param {string} Y - y axis attribute.
 *  @param {string} R - radius attribute.
 *  @param {string} C - color attribute.
 *  @param {number} rSize - default point size.
 *  @param {string} color - default color.
 */
const renderPoints = (xAx, yAx, rAx, cAx, X, Y, R, C, rSize, color) => {
  return (d, index) => {    
    const xOff = typeof xAx.bandwidth === 'function' ? xAx.bandwidth()/2 : 0
    const yOff = typeof yAx.bandwidth === 'function' ? yAx.bandwidth()/2 : 0

    const circleProps = {
      cx: xAx(d[X]) + xOff,
      cy: yAx(d[Y]) + yOff,
      stroke: "#a3a3a3" ,
      strokeWidth: 1,
      opacity: 0.7,
      r: rAx ? rAx(d[R]) : rSize,
      fill: cAx ? cAx(d[C]) : color,
      key: index,
    }    
    
    let text = `${X}: ${d[X]} \n ${Y}: ${d[Y]}`
    text = rAx ? text + `\n ${R}: ${d[R]}` : text
    text = cAx ? text + `\n ${C}: ${d[C]}` : text

    
    return <circle {...circleProps}>
            <title>{text}</title>
          </circle>;
  };
};

/**
 * Renders a legend item
 *  @param {number} x - xPosition of the legend.
 *  @param {number} pad - padding for the legend.
 *  @param {function} cAx - color scaling function.
 */
const renderNomLegend = (x, pad, cAx) => {
  return (d,i) => {
    const lineProps = {      
      x0: 0,
      x1: 15,
      y0: 0,
      y1: 0,
      stroke: cAx(d),
      strokeWidth: 2,      
      fill: "none"
    }

    const textProps = {      
      x: 20,
      y: 3, 
      fontSize: 12,
    }

    const gProps = {
      key: "legend" + i,
      transform: `translate(${10 + x} ${pad + 12 + i*15})`,
    }    

    const txt = d.length < 12 
        ? d
        : d.toString().slice(0,10) + "..."

    return( 
      <g {...gProps}>
        <title>{d}</title>
        <line {...lineProps} />
        <text {...textProps}>{txt}</text>
      </g>
    );    
  }
};

export function ScatterPlot(props) {
    const { width, height, padding, 
      data, X, Y, R, C, types, 
      pointColor, rSizeMin, rSizeMax } = props
    
    if(data.length < 1) {
      return null
    }    
    
    const xAx = xScale(width, padding, data, X, types[X]);    
    const yAx = yScale(height, padding, data, Y, types[Y]);   
    const rAx = rScale(rSizeMin, rSizeMax, data, R, types[R]); // Radius scale
    const cAx = colScale(data, C, types[C]); // Radius scale
    
    const legWd = 110
    const legHt = C != "None" ? cAx.domain().length*16+1 : 1
    const legX = width - 110 - padding

    /**
    * Checks if a data point is valid for rendering
    *  @param {object} d - data point.
    */
    const isPointValid = (d) => {
      if(d[X] == null || (types[X] == 'Numerical' && isNaN(d[X]))){
        return false
      }
      if(d[Y] == null || (types[Y] == 'Numerical' && isNaN(d[Y]))){
        return false
      }
      if(rAx && (d[R] == null || (types[R] == 'Numerical' && isNaN(d[R])))){
        return false
      }
      if(cAx && (d[C] == null || (types[C] == 'Numerical' && isNaN(d[C])))){
        return false
      }
      return true
    }

    const dataClean = data.filter( d => isPointValid(d) )

    
    return (
      <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.visualizerScatterplot'} name={`${X} vs ${Y}`} collect={collectChart}>
      <svg
        className='visualizerScatterplot'     
        width={width} 
        height={height}>
        
        {dataClean.map(renderPoints(xAx, yAx, rAx, cAx, X, Y, R, C, rSizeMin, pointColor))}
        <XYAxis 
          width={width} 
          height={height} 
          padding={padding} 
          xScale={xAx} 
          yScale={yAx} 
          X={X} 
          Y={Y} 
          XType={types[X]!= "Numerical" ? "Cat" : "Num"}
          YType={types[Y]!= "Numerical" ? "Cat" : "Num"}
          txtFontSize={12}
        />        
        
        {
          C != "None" && types[C] == "Nominal"
          ? <rect 
              x={legX}
              y={padding}
              width={legWd}
              height={legHt}
              fill={"#ffffff"}
              stroke={"#d9d9d9"}
              opacity={0.8}
              strokeWidth={1}
              shapeRendering={"crispedges"}
            />
          : null
        }
        {
          C != "None" && types[C] == "Nominal"
          ? cAx.domain().map(renderNomLegend(legX, padding,  cAx ))
          : null
        }
      </svg>
      </ContextMenuTrigger>
    );  
}

export default ScatterPlot;
