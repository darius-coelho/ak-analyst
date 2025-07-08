import React from 'react';

import * as jz from "jeezy"

import { collectChart  } from '../../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";
import { abbreviateNumber } from '../../../../utilities/utilities';

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
const xScale = (width, padding, attrs) => {
  return d3.scaleBand()
    .domain(attrs)
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
const yScale = (height, padding, attrs) => {
  return d3.scaleBand()
    .domain(attrs.reverse())
    .range([height - padding, padding]);
};

const colorScale = (posColor, negColor) => {
  const negSc = d3.interpolateRgb("white", negColor)
  const posSc = d3.interpolateRgb("white", posColor)

  return (d) => d < 0 ? negSc(Math.abs(d)) : posSc(d)
}

/**
 * Renders data points representing the count of the occurence of the x & y values together
 * @param {function} xAx - x axis scaling function.
 * @param {function} yAx - y axis scaling function.
 * @param {function} cAx - color scaling function for corr values.
 */
const renderTiles = (xAx, yAx, cAx) => {
  return (d, index) => {
    const rectProps = {
      x: xAx(d["column_x"]),
      y: yAx(d["column_y"]),
      width: xAx.bandwidth(),
      height: yAx.bandwidth(),
      fill: cAx(+d['correlation']),
      strokeWidth: 2,
      stroke: "#aaaaaa"
    }
    
    let text = `${d["column_x"]} vs ${d["column_y"]}: ${abbreviateNumber(d["correlation"], 2)}`

    return <g key={`corr-${index}`}>
            <rect {...rectProps}>
              <title>{text}</title>
            </rect>
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
 */
export function CorrelationPlot(props) {

    const { width, height, padding,types, data, attrs, posColor, negColor } = props

    if(data.length < 1) {
      return <div className='vizErrorMessage'>No Data</div>
    }

    if(attrs.length < 2) {
      return <div className='vizErrorMessage'>Insufficient number of attributes. Please select 2 or more attributes.</div>
    }

    const side = d3.min([width, height, 100*attrs.length+2*padding])

    /**
     * Checks if a data point is valid for rendering
     * @param {object} d - data point.
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

    /**
     * Ensures that numerical attributes are in the number format instead of string
     * @param {object} d - data point.
     */
     const toNum = (d) => {
      const v = Object.assign({}, ...attrs.map((a, i) => ({ [a]: +d[a] })));
      return v
    }

    const dataClean = data.filter( d => isPointValid(d) ).map( d => toNum(d))
    const corrData = jz.arr.correlationMatrix(dataClean, attrs)
    const xAx = xScale(side, padding, attrs)
    const yAx = yScale(side, padding, attrs)
    const cAx = colorScale(posColor, negColor)

    return (
      <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.visualizerCorrChart'} name={`Corr. Plot`} collect={collectChart}>
      <svg
        className='visualizerCorrChart'
        width={side}
        height={side}>

        <XAxis
          width={side}
          height={side}
          padding={padding}
          name={""}
          type={'Cat'}
          orient={'top'}
          scale={xAx}
          labelJustify={'middle'}
          labelAnchor={'middle'}
          labelFontSize={12}
          labelOffsetX={0}
          labelOffsetY={-55}
          hideLine={true}
          gridLine={false}
        />

        <YAxis
          width={side}
          height={side}
          padding={padding}
          name={""}
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
          gridLine={false}
        />

        {
          corrData.map(renderTiles(xAx, yAx, cAx))
        }

      </svg>
      </ContextMenuTrigger>
    );
}

export default CorrelationPlot;

