import React, { useRef, useEffect } from 'react';
import * as d3 from "d3";
import { abbreviateNumber, abbreviateText } from '../../utilities/utilities'


// d3 axis mapper based on orientation
const d3Axis = {
  'left': d3.axisLeft,
  'right': d3.axisRight
}

// axis label property mapper based on orientation
const axisLabelProps = {
  'left': { x: 0, y: 0, dx: -10, dy: 3, rot: 0, anchor: "end" },
  'right': { x: 0 , y: 0, dx: 10, dy: 3, rot: 0, anchor: "start" }
}

/**
 * Computes the axis label's y position
 * @param {string} justify - The justification(position) of axis label/name - top, bottom or middle.
 * @param {number} height - The chart width.
 * @param {number} padding - The chart padding.
 */
 const getLabelY = (justify, padding, height) => {
  if(justify=='top'){
    return padding
  }
  if(justify=='bottom'){
    return height-padding
  }
  // justify=='middle'
  return height/2
}

/**
 * Renders a vertical axis
 * @param {number} width - The chart width.
 * @param {number} height - The chart height.
 * @param {number} padding - The chart padding.
 * @param {string} name - The attribute name or axis label. 
 * @param {string} type - The attribute type - cat or num. 
 * @param {string} orient - The axis orientation - left or right.
 * @param {function} scale - d3 scale for the axis
 * @param {boolean} hideLine - Flag to indicate if the axis line should be displayed.
 * @param {boolean} gridLine - Flag to indicate grid lines should be displayed.
 * @param {string} labelJustify - The justification(position) of axis label/name - top, bottom or middle.
 * @param {string} labelAnchor - The text anchor with respect to the label position - start, end or middle.
 * @param {number} labelFontSize - The axis label fontsize.
 * @param {boolean} labelVertical - Flag indicating if the label should be rotated 90 degrees
 * @param {number} labelOffsetX - An x-offset to be added to the label position.
 * @param {number} labelOffsetY - A y-offset to be added to the label position.
 */
const YAxis = (props) => { 

  const { width, height, padding, name, type, orient, scale, hideLine, gridLine,
          labelJustify, labelAnchor, labelFontSize, labelVertical, labelOffsetX, labelOffsetY } = props

  const axisRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    const node  = axisRef.current;
    const grid =  gridRef.current;
    const axis = d3Axis[orient](scale);
    const { x, y, dx, dy, rot, anchor } = axisLabelProps[orient]

    // Abbreviate axis label based on type and if neccessary
    if(type != "Cat"){          
      // if it is not categorical treat it as a number
      axis.tickFormat((d,i) => {
        return abbreviateNumber(+d, 2)
      });
    }
      else{
        const validDate = scale.domain()[0];
        if(validDate instanceof Date) {    
          axis.ticks(20).tickFormat(d3.timeFormat("%Y-%m-%d"))
        }
        else{
          // compute step to display upto 20 labels on the axis
          const step = Math.ceil(scale.domain().length / 20)
          axis.tickFormat((d,i) => {
            if (i%step == 0){
              return abbreviateText(d, 8)
            }
            return null
          }); 
        }       
      }

    // Rotate axis label and add tooltip
    d3.select(node)
    .call(gridLine && hideLine ? axis.tickSize(0) : axis)
    .selectAll("text")            
    .attr("x", x)
    .attr("y", y)
    .attr("dx", dx)
    .attr('dy', dy)
    .attr("transform", `rotate(${rot})`)
    .style("text-anchor", anchor)        
    .append("svg:title")
    .text(d => d);

    if(gridLine) {      
      d3.select(grid).call(
        axis.tickSize(-(width - 2*padding))
            .tickFormat("")
      )
    }

    if(hideLine) {
      d3.select(node).select(".domain").remove()
      d3.select(grid).select(".domain").remove()
    }

  }, [scale])

  const labelX = labelOffsetX 
  const labelY = getLabelY(labelJustify, padding, height) + labelOffsetY
  const transformLabel = labelVertical 
                          ? `translate(${labelX}, ${labelY}) rotate(${orient=='right'? 90 : 270})` 
                          : `translate(${labelX}, ${labelY})`

  const translateX = orient == 'left' ? padding : width - padding
  
  
  return(
    <g transform={`translate(${translateX}, 0)`}>
      <g className="axis" ref={axisRef} />
      <g className="grid" ref={gridRef} />
      <text
        x={0}
        y={0}
        fill="black"
        fontSize={labelFontSize}
        transform={transformLabel}
        strokeWidth="0.5"
        stroke="#000000"
        textAnchor={labelAnchor}>
          {name}
      </text>
    </g>
  )
}

export default YAxis;