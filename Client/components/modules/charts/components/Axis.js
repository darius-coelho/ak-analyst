import React from 'react';
import * as d3 from "d3";
import { abbreviateNumber, abbreviateText } from '../../utilities/utilities' 


// d3 axis mapper based on orientation
const d3Axis = {
  'left': d3.axisLeft,
  'right': d3.axisRight,
  'top': d3.axisTop,
  'bottom': d3.axisBottom,
}

// axis label property mapper based on orientation
const axisLabelProps = {
  'left': { x: 0, y: 0, dx: -10, dy: 3, rot: 0, anchor: "end" },
  'right': { x: 0 , y: 0, dx: 10, dy: 3, rot: 0, anchor: "start" },
  'top': { x: -5 , y: 0, dx: 0, dy: -12, rot: -45, anchor: "start" },
  'bottom': { x: -5 , y: 0, dx: 0, dy: 12, rot: -45, anchor: "end" },
}

export default class Axis extends React.Component { 

  constructor(props) {
    super(props);
    this.axisRef = React.createRef();
  }

  componentDidMount() {
    this.renderAxis();
  }

  componentDidUpdate() {
    this.renderAxis();
  }

  renderAxis() {
    const node  = this.axisRef.current;
    const axis = d3Axis[this.props.orient](this.props.scale);
    const {x, y, dx, dy, rot, anchor} = axisLabelProps[this.props.orient]

    // Abbreviate axis label based on type and if neccessary
    if(this.props.type != "Cat"){          
      // if it is not categorical treat it as a number
      axis.tickFormat((d,i) => {            
        return abbreviateNumber(+d, 2)
      });        
    }
    else{
      const validDate = this.props.scale.domain()[0];
      if(validDate instanceof Date) {    
        axis.ticks(20).tickFormat(d3.timeFormat("%Y-%m-%d"))
      }
      else{
        // compute step to display upto 20 labels on the axis
        const step = Math.ceil(this.props.scale.domain().length / 20)
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
      .call(axis)
      .selectAll("text")            
      .attr("x", x)
      .attr("y", y)
      .attr("dx", dx)
      .attr('dy', dy)
      .attr("transform", `rotate(${rot})`)
      .style("text-anchor", anchor)        
      .append("svg:title")
      .text(d => d); 
  }

  render() {    
    return <g transform={this.props.transform}> 
              <g className="axis" ref={this.axisRef} ></g>      
              <text 
                x={this.props.txtX} 
                y={this.props.txtY} 
                fill="black" 
                fontSize={this.props.txtFontSize}  
                strokeWidth="0.5" 
                stroke="#000000" 
                textAnchor={this.props.textAnchor}>
                  {this.props.name}
              </text>
           </g>
  }
}
