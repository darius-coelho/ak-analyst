import React from 'react';
import { scaleBand, scaleLinear, extent, group, mean} from "d3";
import { abbreviateNumber } from '../../../../utilities/utilities';
import partition from 'lodash/partition';
import XYAxis from '../../../../charts/components/XYAxis';
import XDropdown from './XDropdown';

/**
 * Creates a d3 scale and returns a wrapper which
 * converts a data value to an X position
 * @param {number} width - length of the axis.
 * @param {number} padding - padding around the axis.
 * @param {array} data - Array containing the data objects.
 * @param {string} X - X attribute.
 * @param {string} type - type of X attribute.
 */
const xScale = (width, padding, xExtent, type) => {
  if(type == 'Numerical'){
    return scaleLinear()
      .domain(xExtent)
      .range([padding, width - padding]).nice();
  }
  
  return scaleBand()
    .domain(xExtent)
    .range([padding, width - padding]);
};

/**
 * Creates a d3 scale and returns a wrapper which
 * converts a data value to a Y position
 * @param {number} height - length of the axis
 * @param {number} padding - padding around the axis
 * @param {array} data - Array containing the data objects 
 * @param {string} type - type of Y attribute
 */
const yScale = (height, padding, yExtent, type) => {
  if(type == 'Numerical'){
    return scaleLinear()
      .domain(yExtent)
      .range([height - padding, padding]).nice();
  }

  return scaleBand()
    .domain(yExtent)
    .range([height - padding, padding]);
};

/**
 * Renders data poimts on the scatterplot
 * @param {function} xAx - x axis scaling function
 * @param {function} yAx - y axis scaling function
 * @param {string} X - x axis attribute
 * @param {string} Y - y axis attribute
 * @param {list} filters - a list of filters to be applied
 * @param {function} isInRange - function to determine if a point is within the filter
 */
const renderPoints = (xAx, yAx, X, Y, color='#91b4ed') => {  
  return (d, index) => {
    if(d[X] == null || d[Y] == null) return null
    
    const xOff = typeof xAx.bandwidth === 'function' 
                 ? (Math.random() * xAx.bandwidth()/3) + xAx.bandwidth()/3
                 : 0
    const yOff = typeof yAx.bandwidth === 'function' ? yAx.bandwidth()/2 : 0    


    const circleProps = {
      cx: xAx(d[X]) + xOff,
      cy: yAx(d[Y]) + yOff,
      stroke: "#f5f5f5",
      strokeWidth: 1,
      r: 3,
      fill: color,
      key: index,
    }
    
    let text = `${X}: ${d[X]} \n ${Y}: ${d[Y]}`
    
    return <circle {...circleProps}>
            <title>{text}</title>
          </circle>;
  };
};

/**
 * Renders data poimts on the scatterplot
 * @param {function} xAx - x axis scaling function
 * @param {function} yAx - y axis scaling function
 */
 const renderMeanLines = (xAx, yAx) => {  
  return (d, index) => {   

    const lineProps = {
      x1: xAx(d.label) + 0.15*xAx.bandwidth(),
      x2: xAx(d.label) + 0.85*xAx.bandwidth(),
      y1: yAx(d.mean),
      y2: yAx(d.mean),
      stroke: '#555555',
      strokeWidth: 3,
      opacity: 0.75,
      key: `line-${index}`,
    }

    return <line {...lineProps}>
            <title>{`${d.label} mean: ${abbreviateNumber(d.mean, 3)}`}</title>
          </line>;
  };
};

/**
 * Renders a scatterplot of the provided data
 * @param {list} data - The data to be rendered
 * @param {string} X - The attribute to be shown on the x-axis
 * @param {string} Y - The attribute to be shown on the y-axis
 * @param {object} types - Object containg the attribute type for X and Y
 * @param {bool} showOnlyFilter - flag to indicate if onlyly filtered data should be shown i.e. outData should be hidden
 * @param {int} width - The chart width
 * @param {int} height - The chart height
 * @param {int} padding - The chart padding
 */
const ScatterPlot = (props) => {
  const { chartData, X, Y, types, xOptions, setSelectedAttr, showOnlyFilter,
          width, height, padding } = props
  
  if(chartData == null) {
    return <div style={{display: "block", textAlign: "center", height: height}}>No Data</div>
  }

  const xExtent = showOnlyFilter ? chartData.inExtent["x"] : chartData.outExtent["x"]
  const yExtent = showOnlyFilter ? chartData.inExtent["y"] : chartData.outExtent["y"]

  const xAx = xScale(width, padding, xExtent, types[X]);
  const yAx = yScale(height, padding, yExtent, types[Y]);

  let means = []

  return(
    <div style={{display: "block", textAlign: "center"}}>
      <XDropdown
        selected={X}
        options={xOptions}
        onChange={setSelectedAttr}
        {...{width, height, padding}}
      />
      <svg
        className='visualizerScatterplot'
        width={width}
        height={height}>
          {!showOnlyFilter ? chartData.outData.map(renderPoints(xAx, yAx, X, Y, '#dadada')) : null}
          {chartData.inData.map(renderPoints(xAx, yAx, X, Y))}
          {means.map(renderMeanLines(xAx, yAx))}
          <XYAxis 
            width={width} 
            height={height} 
            padding={padding} 
            xScale={xAx} 
            yScale={yAx} 
            X={null} 
            Y={Y}
            XType={types[X]!= "Numerical" ? "Cat" : "Num"}
            YType={types[Y]!= "Numerical" ? "Cat" : "Num"}
            txtFontSize={12}
          />
        </svg>
      </div>
    );
}

export default ScatterPlot;
