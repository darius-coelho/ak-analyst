import React from 'react';

import { collectChart  } from '../../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";

import * as d3 from "d3";

/**
 * Creates a d3 scale and returns a wrapper which
 * converts a data value to an X position
 * @param: {number} width - length of the axis.
 * @param: {number} padding - padding around the axis.
 * @param: {array} data - Array containing the data objects.
*/
const rScale = (rSizeMin, rSizeMax, data) => {
  return d3.scaleLinear()
    .domain(d3.extent(data, d => d.val))
    .range([rSizeMin+4, rSizeMax]);
};

/**
 * Creates a d3 scale and returns a wrapper which
 * converts a data value to a color
 * @param: {array} data - Array containing the data objects.
 * @param: {string} C - color attribute.
 * @param: {string} type - type of color attribute.
*/
const colScale = (data, C, type) => {
  if(type == 'Nominal'){
    const cats = data.map(d => d.data[C]).sort((a, b) => a.toString().localeCompare(b.toString(), undefined, { numeric: true }))
    return d3.scaleOrdinal(d3.schemeCategory10)
          .domain(cats);
  }
  return null
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
const renderArc = (rSizeMin, rSizeMax, X, R, aggFunc, cAx, rAx) => {
  return (d, index) => {

    const arc = R == 'ak_none'
                ? d3.arc()
                  .innerRadius(rSizeMin)
                  .outerRadius(rSizeMax)
                : d3.arc()
                  .innerRadius(rSizeMin)
                  .outerRadius(rAx(d.data.val))

    const pathProps = {
      key: index,
      d: arc(d),
      fill: cAx(d.data[X]),
      stroke: "#ffffff",
      strokeWidth: 2
    }

    const txt = R == 'ak_none'
                ? `${X}: ${d.data[X]}\nCount: ${d.data.count}`
                : `${X}: ${d.data[X]}\nCount: ${d.data.count}\n${aggFunc + ' ' + R}: ${d.data.val}`

    return <path {...pathProps}><title>{txt}</title></path>
  };
};

/**
 * Renders a legend 
 * @param {function} cAx - Color scaling function for slices.
 * @param {number} r - Outer radius value.
 * @param {number} width - The chart width.
 * @param {number} height - The chart height.
 */
 const RenderLegend = (props) => {

  const { cAx, r, width, height } = props

  const legWd = 110
  const legHt = cAx.domain().length*16 + 5
  const legX = width/2 + r + 30
  const legY = height/2 - r

  const lineProps = (v) => ({
    x0: 0,
    x1: 15,
    y0: 0,
    y1: 0,
    stroke: cAx(v),
    strokeWidth: 2,
    fill: "none"
  })

  const textProps = {
    x: 20,
    y: 3,
    fontSize: 12,
  }

  const gProps = (i) => ({
    key: "legend" + i,
    transform: `translate(${10 + legX} ${legY + 12 + i*15})`,
  })

  const abbreviateLabel = (lbl) => {
    const abbrTxt = lbl.length < 12
                    ? lbl
                    : lbl.toString().slice(0,10) + "..."
    return abbrTxt
  }

  return(
    <g>
      <rect
        x={legX}
        y={legY}
        width={legWd}
        height={legHt}
        fill={"#ffffff"}
        stroke={"#898989"}
        opacity={0.8}
        strokeWidth={1}
        shapeRendering={"crispedges"}
      />
      {
        cAx.domain().map( (d,i) =>
        <g {...gProps(i)}>
          <title>{d}</title>
          <line {...lineProps(d)} />
          <text {...textProps}>{abbreviateLabel(d)}</text>
        </g>
        )
      }
    </g>
  );
};

/**
 * Prepares the data for the pie chart
 * @param {array} data - array contain the data for the chart.
 * @param {Object} types - mapping of attributes names to their types.
 * @param {string} sAttr - The noiminal attribute over which pie segments will be created.
 * @param {string} sMap - The value by which each nominal value will be assigned an angle
 * @param {string} R - An optional numerical attribute to be represented on the Y axis.
 * @param {string} aggFunc - Function used to aggregate Y values.
*/
const prepareData = (data, sAttr, sMap, R, aggFunc, types) => {
  const agg = {
    'Min': (catData) => d3.min(catData, v => +v[R]),
    'Max': (catData) => d3.max(catData, v => +v[R]),
    'Mean': (catData) => d3.mean(catData, v => +v[R]),
    'Median': (catData) => d3.median(catData, v => +v[R])
  }

  if(R !== 'ak_none' && !(R in types)) {
    return []
  }

  // Group data by sAttr value
  const tmp = d3.group(data, d => d[sAttr])

  const pieData = [...tmp.entries()].map(d => ({
    [sAttr]: d[0],
    count: d[1].length,
    val: R == 'ak_none' ? d[1].length : agg[aggFunc](d[1])
  }))

  return pieData
}

/**
 * Renders a pie chart that shows the the counts of the occurence of the x values together
 * @param {number} width - The chart width.
 * @param {number} height - The chart height.
 * @param {number} padding - The chart padding.
 * @param {array} data - array contain the data for the chart.
 * @param {Object} types - mapping of attributes names to their types.
 * @param {string} sAttr - The noiminal attribute over which bars will be created.
 * @param {string} sMap - An optional numerical attribute to be represented on tyhe Y axis.
 * @param {string} R - The attribute used to created bars within the X category.
 * @param {string} aggFunc - Function used to aggregate Y values.
 * @param {string} rSizeMin - the color for the bars.
 * @param {string} rSizeMax - the color for the bars.
 */
export function PieChart(props) {

    const { data, types, sAttr, sMap, R, aggFunc, rSizeMin, rSizeMax,
            width, height, padding } = props

    if(data.length < 1 || types[sAttr] != 'Nominal') {
      return null
    }

    const aggData = prepareData(data, sAttr, sMap, R, aggFunc, types)

    if(aggData.length > 10) {
      return <div className='vizErrorMessage'>Too many categories for a pie chart. Use a bar chart instead.</div>
    }

    const pieData = d3.pie()
                  .sort(null)
                  .value((d) => sMap == 'Count' ? d.count : 1)(aggData);

    const rAx = R == 'ak_none' ? null : rScale(+rSizeMin, +rSizeMax, aggData)
    const cAx = colScale(pieData, sAttr, types[sAttr]);

    return (
      <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.visualizerPieChart'} name={`Pie-${sAttr}`} collect={collectChart}>
      <svg
        className='visualizerPieChart'
        width={width}
        height={height}>
          <g transform={`translate(${width/2}, ${height/2})`} >
            {pieData.map(renderArc(+rSizeMin, +rSizeMax, sAttr, R, aggFunc, cAx, rAx))}
          </g>
          <RenderLegend cAx={cAx} r={+rSizeMax} width={width} height={height}/>
      </svg>
      </ContextMenuTrigger>
    );
}

export default PieChart;