import React from 'react';

import { collectChart  } from '../../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";

import * as d3 from "d3";
import YAxis from '../../../../charts/components/YAxis';
import "../css/VizStyle.css"


/**
 * Creates a d3 scale and returns a wrapper which
 * converts a data value to an X position
 * @param: {number} width - length of the axis.
 * @param: {number} padding - padding around the axis.
 * @param: {array} data - Array containing a list of strings
*/
const xScale = (width, padding, data) => {
  return d3.scalePoint()
    .range([padding, width - padding])
    .padding(1)
    .domain(data);
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
    .domain(data.map((d) => d[Y]))
    .range([height - padding, padding]);
};


/**
 * Renders paralell coordinate line for aeach data point
 * @param {array} attrs - list of attributes.
 * @param {array} scales - list of axes scaling function.
 * @param {string} lineColor - default color.
 * @param {number} lineThicknes - default line thinckness/stroke-width.
 */
const renderLines = (xAx, attrs, scales, lineColor, lineThicknes) => {
  return (d, index) => {

    const lineProps = {
      stroke: lineColor,
      strokeWidth: lineThicknes,
      opacity: 0.3,
      fill: "none",
      key: index,
    }

    const line = d3.line()(attrs.map(a => {
      const yOff = typeof scales[a].bandwidth === 'function' ? scales[a].bandwidth()/2 : 0
      return [ xAx(a), scales[a](d[a])+yOff ]
    }));

    return <path d={line} {...lineProps} />
  }
};


export function ParallelCoords(props) {
    const { width, height, padding,
      data, types, attrs, lineColor, lineThickness } = props

    if(data.length < 1) {
      return <div className='vizErrorMessage'>No Data</div>
    }

    if(attrs.length < 2) {
      return <div className='vizErrorMessage'>Insufficient number of attributes. Please select 2 or more attributes.</div>
    }

    const xAx = xScale(width, padding, attrs)
    const scales = Object.assign({}, ...attrs.map(d=>({[d]: yScale(height, padding, data, d, types[d])})));

    /**
    * Checks if a data point is valid for rendering
    *  @param {object} d - data point.
    */
     const isPointValid = (d) => {
      for(let i=0; i<attrs.length; i++){
        const a = attrs[i]  
        if(d[a] == null || (types[a] == 'Numerical' && isNaN(d[a]))){
          return false
        }
      }
      return true
    }

    const dataClean = data.filter( d => isPointValid(d) )

    return (
      <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.visualizerParallelCoords'} name={`Parallel Coords`} collect={collectChart}>
      <svg
        className='visualizerParallelCoords'
        width={width}
        height={height}>

        {dataClean.map(renderLines(xAx, attrs, scales, lineColor, lineThickness))}
        {
          attrs.map(d =>
            <YAxis
              key={`pcp-axis-${d}`}
              width={width}
              height={height}
              padding={xAx(d)}
              name={d}
              type={types[d] != "Numerical" ? "Cat" : "Num"}
              orient={'left'}
              scale={scales[d]}
              labelJustify={'top'}
              labelAnchor={'middle'}
              labelVertical={false}
              labelFontSize={12}
              labelOffsetX={0}
              labelOffsetY={-20-xAx(d)+padding}
              hideLine={false}
              gridLine={false}
            />
          )
        }

      </svg>
      </ContextMenuTrigger>
    );
}

export default ParallelCoords;
