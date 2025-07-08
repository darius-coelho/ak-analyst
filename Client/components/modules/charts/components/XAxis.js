import React, { useRef, useEffect } from 'react';
import * as d3 from "d3";
import { abbreviateNumber, abbreviateText } from '../../utilities/utilities'


// d3 axis mapper based on orientation
const d3Axis = {
  'top': d3.axisTop,
  'bottom': d3.axisBottom,
}

// axis label property mapper based on orientation
const axisLabelProps = {
  'top': { x: -5 , y: 0, dx: 0, dy: -12, rot: -45, anchor: "start" },
  'bottom': { x: -5 , y: 0, dx: 0, dy: 12, rot: -45, anchor: "end" },
}

/**
 * Computes the axis label's x position
 * @param {string} justify - The justification(position) of axis label/name - left, right or middle.
 * @param {number} width - The chart width.
 * @param {number} padding - The chart padding.
 */
const getLabelX = (justify, padding, width) => {
  if(justify=='left'){
    return padding
  }
  if(justify=='right'){
    return width-padding
  }
  // justify=='middle'
  return width/2
}

/**
 * Renders a horizontal axis
 * @param {number} width - The chart width.
 * @param {number} height - The chart height.
 * @param {number} padding - The chart padding.
 * @param {string} name - The attribute name or axis label. 
 * @param {string} type - The attribute type - cat or num. 
 * @param {string} orient - The axis orientation - top or bottom.
 * @param {function} scale - d3 scale for the axis
 * @param {boolean} hideLine - Flag to indicate if the axis line should be displayed.
 * @param {boolean} gridLine - Flag to indicate grid lines should be displayed.
 * @param {string} labelJustify - The justification(position) of axis label/name - left, right or middle.
 * @param {string} labelAnchor - The text anchor with respect to the label position - start, end or middle.
 * @param {number} labelFontSize - The axis label fontsize.
 * @param {number} labelOffsetX - An x-offset to be added to the label position.
 * @param {number} labelOffsetY - A y-offset to be added to the label position.
 */
const XAxis = (props) => { 

  const { width, height, padding, name, type, orient, scale, hideLine, gridLine,
          labelJustify, labelAnchor, labelFontSize, labelOffsetX, labelOffsetY } = props

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
        axis.tickSize(-(height - 2*padding))
            .tickFormat("")
      )
    }

    if(hideLine) {      
      d3.select(node).select(".domain").remove()
      d3.select(grid).select(".domain").remove()
    }

  }, [scale])

  const labelX = getLabelX(labelJustify, padding, width) + labelOffsetX 
  const labelY = labelOffsetY

  const translateY = orient == 'top' ? padding : height - padding
  
  return(
    <g transform={`translate(0, ${translateY})`}>
      <g className="axis" ref={axisRef} />
      <g className="grid" ref={gridRef} />
      <text
        x={labelX}
        y={labelY}
        fill="black"
        fontSize={labelFontSize}
        strokeWidth="0.5"
        stroke="#000000"
        textAnchor={labelAnchor}>
          {name}
      </text>
    </g>
  )
}

export default XAxis;