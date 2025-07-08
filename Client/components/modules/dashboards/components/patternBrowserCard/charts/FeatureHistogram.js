import React from 'react';
import { scaleLinear, max } from "d3";

import { Transition } from 'react-transition-group'

const duration = 300;

const defaultStyle = {
  transition: `height ${duration}ms ease-in-out, y ${duration}ms ease-in-out`,
  opacity: 0,
  display: 'inline-block',
}

/**
 * Returns a transition style for a bar based its height/position 
 * @param {array} state - The animation state
 * @param {number} yMax - The 0 position of the bar.
 */
const getTransitionStyles = (state, yMax) => {
  const transitionStyles = {
    entering: { opacity: 0, height: 0, y: yMax},
    entered: { opacity: 1},
    exiting: { opacity: 1},
    exited: { opacity: 0, height: 0, y: yMax}
  }
  return transitionStyles[state]
};

/**
 * Creates a d3 scale and returns a wrapper which converts a data value to an X position
 * Here we expect X to be `x0` or `x1` in an array of `bins`
 * @param {array} data - Array containing the data objects.
 * @param {number} width - length of the axis.
 * @param {number} padding - padding around the axis.
 */
const xScale = (data, width, padding) => {
  if(data.length <=0) return null

  const min = 0
  const max = data.length
  
  return scaleLinear()
    .domain([min, max])
    .range([padding, width-padding]);
};

/**
 * Creates a d3 scale and returns a wrapper which converts a data value to a Y position
 * Here we expect Y to be `countAll` in an array of `bins`
 * @param: {array} data - Array containing the data objects
 * @param: {number} height - length of the axis
 * @param: {number} padding - padding around the axis
 */
const yScale = (data, height, top) => {
  if(data.length <=0) return null
  
  return scaleLinear()
    .domain([0,  max(data, d => +d)]).nice()
    .range([top + height - 1, top]);
};


/**
 * Renders bars for a single data point
 * @param {function} xAx - x axis scaling function
 * @param {function} yAx - y axis scaling function
 */
const renderBars = (xAx, yAx, bins) => {
  return (d, index) => {
    if(+d == 0) return null

    const rectProps = {
      x:  xAx(index)+1,
      y: yAx(+d),
      width: xAx(index+1) - xAx(index) - 2,
      height:  yAx(yAx.domain()[0]) - yAx(+d),
      fill: "#9a9a9a",
    }   
    
    const text = `Range: ${bins[index]} to ${bins[index+1]}\n# Items: ${d}`

    return <Transition key={`feat-hist-bar-${index}`} in={true} timeout={duration} appear={true}>
              {(state) => (
                <rect {...rectProps}
                  style={{ 
                    ...defaultStyle, 
                    ...(getTransitionStyles(state, rectProps.y + rectProps.height))
                  }}>
                    <title>{text}</title>
                </rect>
              )}
            </Transition>
  };
};

/**
 * Computes and renders a histogram of the provided data for each target (Y) value
 * @param {boolean} show - Boolean indicating if the component should be rendered
 * @param {list} data - The data to be rendered
 * @param {string} attr - The attribute to be visualized
 * @param {int} width - The chart width
 * @param {int} height - The chart height
 * @param {int} top - The chart position from the top of the svg
 * @param {int} padding - The chart's left/right padding 
 */
const FeatureHistogram = (props) => {
  const { show, counts, bins, width, height, top, padding } = props

  if(!show){
    return null
  }  

  const xAx = xScale(counts, width, padding)
  const yAx = yScale(counts, height, top)

  if(xAx == null || yAx == null){
    return null
  }

  return (
    <g>
      {counts.map(renderBars(xAx, yAx, bins))}
    </g>
  );
}

export default FeatureHistogram
