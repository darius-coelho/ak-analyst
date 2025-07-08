import React, { useState } from 'react';
import { scaleBand, scaleLinear, extent, descending } from "d3";
import { Transition } from 'react-transition-group'

import { abbreviateNumber } from '../../../../utilities/utilities';
import XYAxis from '../../../../charts/components/XYAxis';
import XDropdown from './XDropdown';

const duration = 300;

const defaultStyle = {
  transition: `opacity ${duration}ms ease-in-out, cx ${duration}ms ease-in-out, cy ${duration}ms ease-in-out`,
  opacity: 0,
}

const transitionStyles = {
  entering: { opacity: 0},
  entered: { opacity: 1},
  exiting: { opacity: 1},
  exited: { opacity: 0},
};

/**
 * Creates a d3 scale and returns a wrapper which
 * converts a data value to an X position
 * @param {number} width - length of the axis.
 * @param {number} padding - padding around the axis.
 * @param {array} patternSet - Array of array of objects representing lists of patterns.
 * @param {list} xCategories - list of categories in the X attribute.
 * @param {string} X - X attribute. 
 */
const xScale = (width, padding, patternSet, xCategories, X) => {
  if(xCategories == null){
    const [xMin, xMax] = extent(patternSet.reduce(
      (acc, d) => [...acc, ...extent(d.patterns, v => +v.attributes[X].mean)],
      []
    ))
    const xScale = scaleLinear()
                  .domain([xMin, xMax])
                  .range([padding, width - padding]).nice();
    
    // adjust scale to avoid radius overlapping with axis lines
    const maxRadiusPx = 17;
    const maxRadiusDt = xScale.invert(padding + maxRadiusPx)
	                      - xScale.invert(padding);
  
    return scaleLinear().domain([xMin-maxRadiusDt, xMax+maxRadiusDt])
                        .range([padding, width-padding])
                        .clamp(true);  
  }

  return scaleBand()
    .domain(xCategories)
    .range([padding, width - padding]);
};

/**
 * Creates a d3 scale and returns a wrapper which
 * converts a data value to a Y position
 * @param {number} height - length of the axis
 * @param {number} padding - padding around the axis
 * @param {array} patternSet - Array of array of objects representing lists of patterns.
 * @param {string} Y - Y attribute
 */
const yScale = (height, padding, patternSet, target, stat) => {
  const [yMin, yMax] = extent(patternSet.reduce(
    (acc, d) => [...acc, ...extent(d.patterns, v => +v.stats[target][stat])],
    []
  ))

  const yScale = scaleLinear()
                .domain([yMin, yMax])
                .range([height - padding, padding+20]).nice();

  // adjust scale to avoid radius overlapping with axis lines
  const maxRadiusPx = 17;
  const maxRadiusDt = yScale.invert(height-padding - maxRadiusPx)
	                    - yScale.invert(height-padding);

  return scaleLinear().domain([yMin-maxRadiusDt, yMax+maxRadiusDt])
                      .range([height-padding, padding+20])
                      .clamp(true);
};

/** 
 * Treats the number of data points as the area of 
 * a circle and returns the radius.
 * @param {number} size - The number of data points.
 */
 const sizeToRadius = (size) => {
  return Math.sqrt(+size/Math.PI);
};

/**
 * Creates a d3 linear scale and returns a wrapper which 
 * first converts the size to radius before perfoming the 
 * linear mapping. 
 * @param: {number} minRad - Minimum radius size.
 * @param: {number} maxRad - Maximum radius size.
 * @param: {array} patternSet - Array of array of objects representing lists of patterns.
*/
const rScale = (minRad, maxRad, patternSet, target) => {
  const range = extent(patternSet.reduce(
    (acc, d) => [...acc, ...extent(d.patterns, v => sizeToRadius(+v.stats[target].size))],
    []
  ))
  
  const rAx =  scaleLinear()
              .domain(range)
              .range([minRad, maxRad])
              .clamp(true); 

  return (size) => rAx(sizeToRadius(size));
};

/**
 * Renders a bubble to represent a pattern
 * @param {function} xAx - x axis scaling function
 * @param {function} yAx - y axis scaling function
 * @param {function} rAx - The radius scaling function
 * @param {string} X - x axis attribute
 * @param {string} Y - y axis attribute
 * @param {string} globalY - The global y value i.e the global mean of the target
 * @param {string} selectedPattern - Object contianing the listID, cardID and patternID of the selected pattern
 * @param {string} onSelect - Function to be triggered when a bubble is clicked/selected
 */
const renderBubble = (xAx, yAx, rAx, X, target, stat, globalY, selectedPattern, onSelect) => {
  return (d, index) => {
    const xOff = typeof xAx.bandwidth === 'function' 
                 ? xAx.bandwidth()/2
                 : 0
    const yOff = typeof yAx.bandwidth === 'function' ? yAx.bandwidth()/2 : 0

    const xVal = typeof xAx.bandwidth === 'function'
                 ? d.attributes[X].mostFrequent
                 : d.attributes[X].mean

    const circleProps = {
      cx: xAx(xVal) + xOff,
      cy: yAx(d.stats[target][stat]) + yOff,
      stroke: selectedPattern && d.ID==selectedPattern.patternID ? "#000000" : "#f5f5f5",
      strokeWidth: 1,
      r: rAx(d.stats[target].size),
      fill: (+d.stats[target][stat] - globalY)  < 0 ? "#ce3f3f" : "#009a5e",
      opacity: selectedPattern && d.ID==selectedPattern.patternID ? 0.9 : 0.75,      
      onClick: () => onSelect(d.listID, d.ID),
      cursor: 'pointer'
    }

    // Don't render circles with nan coordinates  
    if(isNaN(circleProps.cx) || isNaN(circleProps.cy)) {
      return null
    }
    
    let text = typeof xAx.bandwidth === 'function'
               ? `Categories in ${X}: ${d.attributes[X].categories} \nMean ${stat}: ${d.stats[target][stat]}`
               : `Mean ${X}: ${d.attributes[X].mean} \nMean ${stat}: ${d.stats[target][stat]}`
    
    return <Transition in={true} timeout={duration} appear={true} key={`mini-bubble-${index}`}>
            {(state) => (
              <circle {...circleProps} style={{
                ...defaultStyle,
                ...transitionStyles[state]
              }}><title>{text}</title>
              </circle>
            )}
          </Transition>
  };
};

/**
 * Renders a legend
 * @param {array} patternSet - Array of array of objects representing lists of patterns.
 * @param {function} rAx - The radius scaling function
 * @param {int} xOffset - The x offset of the legend mid-point
 * @param {int} yOffset - The y offset of the legend
 */
const RenderLegend = ({target, patternSet, rAx, xOffset, yOffset}) => {

  const rectProps = (y, fill) => ({    
    x: xOffset - 80,
    y: yOffset + y,
    width: 10,
    height: 10,
    fill: fill
  })

  const rectTextProps = (y) => ({    
    x: xOffset - 66,
    y: yOffset + y + 8,
    fontSize: 9,
    textAnchor: 'start'
  })
  
  const circleProps = (x, r) => ({    
    cx: xOffset + x,
    cy: yOffset + 20,
    r: r,
    fill: "#d8d8d8"
  })

  const circleTextProps = (x, r) => ({    
    x: xOffset + x,
    y: yOffset + 30 + r,
    fontSize: 9,
    textAnchor: 'middle'
  })

  const rDomain =  extent(patternSet.reduce(
    (acc, d) => [...acc, ...extent(d.patterns, v => +v.stats[target].size)],
    []
  ))
  const rRange =  [rAx(rDomain[0]), rAx(rDomain[1])]
  const r1 = rRange[0]
  const r2 = rRange[0] + (rRange[1] - rRange[0])/2
  const r3 = rRange[1]

  return(
    <g>
      <text {...circleTextProps(r1+r2+10, -2*r3)} >Data Size</text>
      <text {...circleTextProps(0, r1)}>{abbreviateNumber(rDomain[0], 2)}</text>
      <circle {...circleProps(0, r1)} />
      <text {...circleTextProps(r1+r2+10, r2)}>{abbreviateNumber(rDomain[0] + (rDomain[1] - rDomain[0])/2, 2)}</text>
      <circle {...circleProps(r1+r2+10, r2)} />
      <text {...circleTextProps(r1 + 2*r2 + r3 + 20, r3)}>{abbreviateNumber(rDomain[1], 2)}</text>
      <circle {...circleProps(r1 + 2*r2 + r3 + 20, r3)} />
      

      <text {...circleTextProps(-85, -2*r3)} textAnchor='start'>Mean Diff.</text>
      <rect {...rectProps(8, "#009a5e")}/> 
      <text {...rectTextProps(8)}>Positive</text>
      <rect {...rectProps(22, "#ce3f3f")}/> 
      <text {...rectTextProps(22)}>Negative</text>
    </g>
  )
}


/**
 * Renders a bubbleplot of the patterns 
 * @param {string} target - The target attribute or feature of the mining procedure
 * @param {string} targetType - The target type - numerical/binary
 * @param {json} overallSummary - Summary stats of the dataset that was mined
 * @param {array} features - List of feature objects
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {array} patternSet - Array of array of objects representing lists of patterns.
 * @param {array} highlightedFeatures - Array of features that have been highlighted in the interface
 * @param {json} selectedPattern - Object contianing the listID, cardID and patternID of the selected pattern
 * @param {function} onSelectPattern - Function to be triggered when a bubble is clicked/selected
 * @param {int} width - The chart width
 * @param {int} height - The chart height
 * @param {int} padding - The chart padding
 */
const PatternBubblePlot = (props) => {
  const { target, targetType, overallSummary, features, catLabels, patternSet, highlightedFeatures, selectedPattern, onSelectPattern,
          width, height, padding } = props
  
  if(patternSet.length < 1 || features[target].length < 1) {
    return null
  }

  const [ X, setX ] = useState(features[target][0].attribute)
  const stat = targetType == 'numeric' ? 'mu' : 'prob'

  const xCategories = catLabels.hasOwnProperty(X) ? catLabels[X] : null

  const xAx = xScale(width, padding, patternSet, xCategories, X);
  const yAx = yScale(height, padding, patternSet, target, stat);
  const rAx = rScale(3, 15, patternSet, target);

  // Sort patterns in descending order of size so that 
  // smaller patterns are rendered after (i.e. above) larger ones
  const patterns = patternSet.reduce((acc, d, idx) => {
                    if(d.patterns.length > 0){
                      return [
                        ...acc,
                        ...d.patterns.map(v => ({...v, listID: idx}))
                      ]
                    }
                    return acc
                  }, [])
                  .sort((a, b) => descending(+a.size, +b.size))
                  
  return(
    <div style={{display: "block", textAlign: "center"}}>
      <XDropdown
        selected={X}
        options={features[target].map(d => d.attribute)}
        onChange={setX}
        {...{width, height, padding}}
      />
      <svg width={width} height={height}>
        <RenderLegend
          patternSet={patternSet}
          target={target}
          yOffset={20}
          rAx={rAx}
          xOffset={width/2}
        />
        { patterns.map(renderBubble(xAx, yAx, rAx, X, target, stat, +overallSummary.stats[target][stat], selectedPattern, onSelectPattern))}
        <text
          x={padding} y={70}
          fill="black"
          fontSize={12}
          strokeWidth="0.5"
          stroke="#000000"
          textAnchor='middle'>
            {`Target ${targetType=='numeric' ? 'Mean' : 'Prob.'}`}
        </text>
        <XYAxis
          width={width}
          height={height}
          padding={padding}
          xScale={xAx}
          yScale={yAx}
          X={null}
          Y={null}
          XType={xCategories ? "Cat" : "Num"}
          YType={"Num"}
          txtFontSize={12}
        />
      </svg>
    </div>
  );
}

export default PatternBubblePlot;
