import React, { useState, useEffect } from 'react';
import { scaleBand, scaleLinear, max, group } from "d3";
import { difference } from 'lodash';

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
 * Creates a d3 scale and returns a wrapper which converts a data value to a Y position
 * Here we expect Y to be `countAll` in an array of `bins`
 * @param: {array} data - Array containing the data objects
 * @param: {number} height - length of the axis
 * @param: {number} padding - padding around the axis
 */
 const yScale = (data, height, top) => {
  if(data.length <=0) return null

  return scaleLinear()
    .domain([0,  max(Object.keys(data).map(k => data[k]), d => +d)]).nice()
    .range([top + height - 1, top]);
};

/**
 * Renders bars for a single data point
 * @param {int} padding - The chart's left/right padding
 * @param {int} segWidth - The width of each segment representing a group of categories
 * @param {function} yAx - y axis scaling function
 */
const renderBars = (padding, segWidth, catCounts, yAx) => {
  return (d, index) => {
    if(!catCounts.hasOwnProperty(d) || +catCounts[d] == 0) return null

    const rectProps = {
      x: padding + index*segWidth,
      y: yAx(+catCounts[d]),
      width: Math.max(2.5, segWidth)-2,
      height:  yAx(yAx.domain()[0]) - yAx(+catCounts[d]),
      fill: "#9a9a9a",
    }

    const text = `Categories: ${catCounts[d]}\n# Items: ${catCounts[d]}`

    return <Transition  in={true} timeout={duration} appear={true}>
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
 * @param {list} data - The categories that fall within the pattern
 * @param {int} segWidth - The width of each segment representing a group of categories
 * @param {int} height - The chart height
 * @param {int} top - The chart position from the top of the svg
 * @param {int} padding - The chart's left/right padding
 */
const FeatureColumn = (props) => {
  const { show, categories, catCounts, attr, segWidth, height, top, padding } = props

  if(!show){
    return null
  }

  const yAx = yScale(catCounts, height, top)

  return (
    <g>
      {categories.map(renderBars(padding, segWidth, catCounts, yAx))}
    </g>
  );
}

export default FeatureColumn
