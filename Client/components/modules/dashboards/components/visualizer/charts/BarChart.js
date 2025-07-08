import React from 'react';

import { collectChart  } from '../../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";
import { abbreviateNumber } from '../../../../utilities/utilities';


import * as d3 from "d3";
import XAxis from '../../../../charts/components/XAxis';
import YAxis from '../../../../charts/components/YAxis';

/**
 * Creates a d3 scale and returns a wrapper which
 * converts a data value to an X position
 * @param: {number} width - length of the axis.
 * @param: {number} padding - padding around the axis.
 * @param: {array} data - Array containing the data objects.
 * @param: {string} X - X attribute.
*/
const xScale = (width, padding, data, X) => {
  if(X==null || X=='None'){
    return null
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
*/
const yScale = (height, padding, data, Y) => {
  let domain = [0, 100]

  if(Y == 'Count') {
    domain = [0, d3.max(data, (d) => +d.val)]
  }
  
  if(Y != 'Count' && Y != 'Prob') {
    domain = [d3.min(data, (d) => +d.val), d3.max(data, (d) => +d.val)]
  }

  return d3.scaleLinear()
      .domain(domain)
      .range([height - padding, padding]).nice();
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
    const cats = data.map( d => d[C] ).sort()
    return d3.scaleOrdinal(d3.schemeCategory10)
          .domain([... new Set(cats)]);
  }
  return null
};


/**
 * Renders data points representing the count of the occurence of the x & y values together
 * @param {function} xAx - x axis scaling function.
 * @param {function} yAx - y axis scaling function.
 * @param {function} rAx - radius scaling function.
 * @param {string} X - x axis attribute - main category.
 * @param {string} Y - An optional numerical attribute to be represented on tyhe Y axis.
 * @param {string} C - Sub category attribute used to created bars within the X category.
 * @param {string} aggFunc - Function used to aggregate Y values.
 * @param {string} color - the color for the data point.
 */
const renderBar = (xAx, yAx, gAx, X, Y, aggFunc, C, color, cAx) => {
  return (d, index) => {
    const barWidth = gAx
                     ? gAx.bandwidth() - 2
                     : Math.min(50, xAx.bandwidth()/2)
    const offsetX = gAx
                    ? gAx(d[C])
                    : xAx.bandwidth()/2 - barWidth/2

    const rectProps = {
      x: xAx(d[X]) + offsetX,
      y: yAx(d.val),
      width: barWidth,
      height: yAx(yAx.domain()[0]) - yAx(d.val),
      fill: cAx ? cAx(d[C]) : color,
      key: index,
    }

    const yName = Y == 'ak_none' ? `${aggFunc}` : `${aggFunc} ${Y}`

    const txt = gAx
                ? `${X}: ${d[X]}\n${C}: ${d[C]}\n${yName}: ${abbreviateNumber(d.val, 3)}`
                : `${X}: ${d[X]}\n${yName}: ${abbreviateNumber(d.val, 3)}`

    return <rect {...rectProps}><title>{txt}</title></rect>
  };
};

/**
 * Renders a legend item
 *  @param {number} x - xPosition of the legend.
 *  @param {number} pad - padding for the legend.
 *  @param {function} cAx - color scaling function.
 */
 const renderLegend = (x, pad, cAx) => {
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


/**
 * Prepares the data for the bar chart
 * @param {array} data - array contain the data for the chart.
 * @param {Object} types - mapping of attributes names to their types.
 * @param {string} X - The noiminal attribute over which bars will be created.
 * @param {string} Y - An optional numerical attribute to be represented on tyhe Y axis.
 * @param {string} C - The attribute used to created bars within the X category.
 * @param {string} aggFunc - Function used to aggregate Y values.
*/
const prepareData = (data, X, Y, C, aggFunc, types) => {
  const agg = {
    'Count': (catData) => catData.length,
    'Prob': (catData) => catData.length,
    'Min': (catData) => d3.min(catData, v => +v[Y]),
    'Max': (catData) => d3.max(catData, v => +v[Y]),
    'Mean': (catData) => d3.mean(catData, v => +v[Y]),
    'Median': (catData) => d3.median(catData, v => +v[Y])
  }

  if(C == 'None'){
    if(!(aggFunc=='Count' || aggFunc=='Prob') && !(Y in types)) {
      return []
    }

    // Group data by target(Y) value
    const tmp = d3.group(data, d => d[X])

    const barData = [...tmp.entries()].map(d => ({
        [X]: d[0],
        val: agg[aggFunc](d[1])
    }))

    if(aggFunc=='Prob'){
      const total = d3.sum(barData, d => d.val)
      return barData.map(d => ({
        ...d,
        val: 100*d.val/total
      }))
    }
    return barData
  }
  else {
    if(!(aggFunc=='Count' || aggFunc=='Prob') && !(Y in types)) {
      return []
    }
    // Group data by target(Y) value
    const tmp = d3.group(data, d => d[X], d => d[C])

    const barData = [...tmp.entries()].map(d =>
      [...d[1].entries()].map(v => ({
        [X]: d[0],
        [C]: v[0],
        val: agg[aggFunc](v[1])
      }))
    )
    .flat(1)
    .sort((a, b) => 
            a[X].toString().localeCompare(b[X].toString(), undefined, { numeric: true }) 
            || a[C].toString().localeCompare(b[C].toString(), undefined, { numeric: true })
          )

    if(aggFunc=='Prob'){
      const total = d3.sum(barData, d => d.val)
      return barData.map(d => ({
        ...d,
        val: 100*d.val/total
      }))
    }
    return barData
  }
  return []
}


/**
 * Renders a bar chart that shows the the counts of the occurence of the x values together
 * @param {number} width - The chart width.
 * @param {number} height - The chart height.
 * @param {number} padding - The chart padding.
 * @param {array} data - array contain the data for the chart.
 * @param {Object} types - mapping of attributes names to their types.
 * @param {string} X - The noiminal attribute over which bars will be created.
 * @param {string} Y - An optional numerical attribute to be represented on tyhe Y axis.
 * @param {string} C - The attribute used to created bars within the X category.
 * @param {string} func - Function used to aggregate Y values.
 * @param {string} barColor - the color for the bars.
 */
export function BarChart(props) {

    const { data, types, X, Y, C, barColor, func,
            width, height, padding } = props

    if(data.length < 1 || types[X] != 'Nominal') {
      return null
    }

    const barData = prepareData(data, X, Y, C, func, types)

    const xAx = xScale(width, padding, barData, X)
    const yAx = yScale(height, padding, barData, func)
    const nCats = C != 'None' ? (new Set(barData.map(d => d[C]))).size : 1
    const gPad = (xAx.bandwidth() - Math.min(nCats*50, xAx.bandwidth()))/2
    const gAx = xScale(xAx.bandwidth(), gPad, barData, C)
    const cAx = colScale(barData, C, types[C]);

    const legWd = 110
    const legHt = C != "None" ? cAx.domain().length*16+1 : 1
    const legX = width - 110 - padding

    return (
      <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.visualizerBarChart'} name={`${X} vs ${Y}`} collect={collectChart}>
      <svg
        className='visualizerBarChart'
        width={width}
        height={height}>


        <XAxis
          width={width}
          height={height}
          padding={padding}
          name={X}
          type={'Cat'}
          orient={'bottom'}
          scale={xAx}
          labelJustify={'middle'}
          labelAnchor={'middle'}
          labelFontSize={12}
          labelOffsetX={0}
          labelOffsetY={60}
          hideLine={false}
          gridLine={false}
        />

        <YAxis
          width={width}
          height={height}
          padding={padding}
          name={Y=='ak_none' ? `${X} - ${func}` : `${Y} - ${func}`}
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
          barData.map(renderBar(xAx, yAx, gAx, X, Y, func, C, barColor, cAx))
        }

        {
          C != "None" && types[C] == "Nominal"
          ? <rect
              x={legX}
              y={padding+1}
              width={legWd}
              height={legHt}
              fill={"#ffffff"}
              stroke={"#898989"}
              opacity={0.8}
              strokeWidth={1}
              shapeRendering={"crispedges"}
            />
          : null
        }

        {
          C != "None" && types[C] == "Nominal"
          ? cAx.domain().map(renderLegend(legX, padding+1,  cAx ))
          : null
        }

      </svg>
      </ContextMenuTrigger>
    );
}

export default BarChart;
