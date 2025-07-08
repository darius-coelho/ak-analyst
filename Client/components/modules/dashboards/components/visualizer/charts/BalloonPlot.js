import React from 'react';

import { collectChart  } from '../../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";

import * as d3 from "d3";
import XAxis from '../../../../charts/components/XAxis';
import YAxis from '../../../../charts/components/YAxis';
import "../css/VizStyle.css"

/**
 * Creates a d3 scale and returns a wrapper which
 * converts a data value to an X position
 * @param: {number} width - length of the axis.
 * @param: {number} padding - padding around the axis.
 * @param: {array} data - Array containing the data objects.
 * @param: {string} X - X attribute.
*/
const xScale = (width, padding, data, X) => {
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
*/
const yScale = (height, padding, data, Y) => {
  return d3.scaleBand()
    .domain(data.map((d) => d[Y]).sort((a, b) => a.toString().localeCompare(b.toString(), undefined, { numeric: true })).reverse())
    .range([height - padding, padding]);
};

/**
 * Creates a d3 scale and returns a wrapper which
 * converts a data value to a radius length 
 * @param: {number} maxR - upper bound radius.
 * @param: {array} data - Array containing the data objects.
 * @param: {string} R - radius attribute.
*/
const rScale = (maxR, data, R) => {    
  const rMax = d3.max(data, d=> +d[R]);
  
  const rSc = d3.scaleSqrt()
    .domain([0, rMax])
    .range([0, maxR])

  return (val) => (val != 0 && rSc(val) < 1.5) ? 1.5 : rSc(val)
};

/**
 * Renders data points representing the count of the occurence of the x & y values together
 * @param {function} xAx - x axis scaling function.
 * @param {function} yAx - y axis scaling function.
 * @param {function} rAx - radius scaling function.
 * @param {string} X - x axis attribute.
 * @param {string} Y - y axis attribute.
 * @param {string} R - radius attribute - count.
 * @param {string} color - the color for the data point.
 */
const renderBalloons = (xAx, yAx, rAx, X, Y, R, color) => {
  return (d, index) => {
    const circleProps = {
      cx: xAx(d[X]) + xAx.bandwidth()/2,
      cy: yAx(d[Y]) + yAx.bandwidth()/2,
      opacity: 0.98,
      r: rAx(+d[R]),
      fill: color      
    }
    
    const circleHoverProps = {
      cx: xAx(d[X]) + xAx.bandwidth()/2,
      cy: yAx(d[Y]) + yAx.bandwidth()/2,
      opacity: 0,
      r: 5,
      fill: color      
    }

    let text = `${X}: ${d[X]}\n${Y}: ${d[Y]}\n${R}: ${d[R]}`

    return <g key={`balloon-${index}`}>
            <circle {...circleProps}>
              <title>{text}</title>
            </circle>
            <circle {...circleHoverProps}>
              <title>{text}</title>
            </circle>
          </g>
  };
};


/**
 * Renders a balloon plot that shows the the counts of the occurence of the x & y values together
 * @param {number} width - The chart width.
 * @param {number} height - The chart height.
 * @param {number} padding - The chart padding.
 * @param {array} data - array contain the data for the chart.
 * @param {string} X - x axis attribute.
 * @param {string} Y - y axis attribute.
 * @param {string} pointColor - the color for the data points.
 * @param {number} rSizeMin - The minimum radius for a data point.
 * @param {number} rSizeMax - The maximum radius for a data point.
 */
export function BalloonPlot(props) {

    const { width, height, padding, data, X, Y,
            pointColor, rSizeMax } = props

    if(data.length < 1) {
      return <div className='vizErrorMessage'>No Data</div>
    }

    if(X == 'None' || Y == 'None') {
      return <div className='vizErrorMessage'>X or Y attribute not set.</div>
    }

    // Comput counts for the occurence of the x & y values together
    const tmp = d3.group(data, d => d[Y], d => d[X])
    const countData = [...tmp.entries()].map(d =>
          [...d[1].entries()].map( v => ({
              [Y]: d[0],
              [X]: v[0],
              count: v[1].length
          }))
        ).flat(1)

    const xAx = xScale(width, padding, countData, X)
    const yAx = yScale(height, padding, countData, Y)
    const rAx = rScale(rSizeMax, countData, 'count')

    return (
      <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.visualizerBalloonChart'} name={`${X} vs ${Y}`} collect={collectChart}>
      <svg
        className='visualizerBalloonChart'
        width={width}
        height={height}>

        <XAxis
          width={width}
          height={height}
          padding={padding}
          name={X}
          type={'Cat'}
          orient={'top'}
          scale={xAx}
          labelJustify={'middle'}
          labelAnchor={'middle'}
          labelFontSize={12}
          labelOffsetX={0}
          labelOffsetY={-60}
          hideLine={true}
          gridLine={true}
        />

        <YAxis
          width={width}
          height={height}
          padding={padding}
          name={Y}
          type={'Cat'}
          orient={'left'}
          scale={yAx}
          labelJustify={'middle'}
          labelAnchor={'middle'}
          labelVertical={true}
          labelFontSize={12}
          labelOffsetX={-75}
          labelOffsetY={0}
          hideLine={true}
          gridLine={true}
        />

        {
          countData.map(renderBalloons(xAx, yAx, rAx, X, Y, 'count', pointColor))
        }

      </svg>
      </ContextMenuTrigger>
    );
}

export default BalloonPlot;
