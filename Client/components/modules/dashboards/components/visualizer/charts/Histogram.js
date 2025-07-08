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
    .domain(data.map((d) => d[X]))
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
const yScale = (height, padding, data, yFunc) => {
  const domain = yFunc == 'Prob.'
                  ? [0, 100]
                  : [0, d3.max(data, (d) => +d.val)]

  return d3.scaleLinear()
      .domain(domain)
      .range([height - padding, padding]).nice();
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
const renderBar = (xAx, yAx, X, yFunc, color) => {
  return (d, index) => {
    const barWidth = xAx.bandwidth() - 2
    const offsetX = 1

    const rectProps = {
      x: xAx(d[X]) + offsetX,
      y: yAx(d.val),
      width: barWidth,
      height: yAx(yAx.domain()[0]) - yAx(d.val),
      fill: color,
      key: index,
    }

    const txt = `${X} Range: ${d[X]}\n${yFunc}: ${d.val}`

    return <rect {...rectProps}><title>{txt}</title></rect>
  };
};



/**
 * Prepares the data for the bar chart
 * @param {array} data - array contain the data for the chart.
 * @param {string} X - The attribute over which bins are created.
 * @param {string} N - The approximate number of bins.
*/
const prepareData = (data, X, N, yFunc) => {
  const scale = d3.scaleLinear()
                .domain(d3.extent(data, v => +v[X]))
                .nice()
  
  const histoFunc = d3.bin()
                    .value(d => +d[X])  
                    .domain(scale.domain())
                    .thresholds(+N);

  const binData = histoFunc(data)
  
  const barData = binData.map( d => ({
    [X]: `${d.x0} - ${d.x1}`,
    val: d.length
  }))

  if(yFunc=='Prob.'){
    const total = d3.sum(barData, d => d.val)
    return barData.map(d => ({
      ...d,
      val: 100*d.val/total
    }))
  }
  
  return barData
}


/**
 * Renders a histogram that shows the the counts of the occurence of the x values together
 * @param {number} width - The chart width.
 * @param {number} height - The chart height.
 * @param {number} padding - The chart padding.
 * @param {array} data - array contain the data for the chart.
 * @param {Object} types - mapping of attributes names to their types.
 * @param {string} X - The noiminal attribute over which bars will be created. 
 * @param {number} N - The approximate number of bins.
 * @param {string} yFunc - Function used to aggregate Y values.
 * @param {string} barColor - the color for the bars.
 */
export function Histogram(props) {

    const { data, types, X, N, yFunc, barColor,
            width, height, padding } = props

    if(data.length < 1 || types[X] != 'Numerical') {
      return null
    }

    const barData = prepareData(data, X, N, yFunc)
    const xAx = xScale(width, padding, barData, X)
    const yAx = yScale(height, padding, barData, yFunc)

    return (
      <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.visualizerBarChart'} name={`Histogram ${X}`} collect={collectChart}>
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
          name={`${X} - ${yFunc}`}
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
          barData.map(renderBar(xAx, yAx, X, yFunc, barColor))
        }
      </svg>
      </ContextMenuTrigger>
    );
}

export default Histogram;
