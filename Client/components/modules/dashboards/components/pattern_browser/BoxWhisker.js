import React from 'react';
import * as d3 from "d3";

import { collectChart } from '../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";

import XYAxis from '../../../charts/components/XYAxis';

const BARWIDTH = 24 // width of a bar
const BARPAD = 30 // total padding surrounding a bar
/**
  * Creates a nominal/band x-scale function   
  * @param: {number} width - the width of the canvas 
  * @param: {number} padding - the padding at the left and right of the axis
  * @param: {array} data - list of objects
  * @param: {string} attr - data attribute to create the axis on
*/
const xScale = (width, padding, data, attr) => {
  return d3.scaleBand()
    .domain(data.map(function(d) { return d[attr]; }))
    .range([padding, width - padding]);
};

/**
  * Creates a linear/continuous y-scale function   
  * @param: {number} height - the height of the canvas 
  * @param: {number} padding - the padding at the top and bottom of the axis
  * @param: {array} data - list of objects that have min and max fields
*/
const yScale = (height, padding, data) => {
  return d3.scaleLinear()
    .domain([d3.min(data, function(d) { return d['min'] }), d3.max(data, function(d) { return d['max'] })])    
    .range([height - padding, padding]);
};

/**
  * Changes the page number and clamps to min and max   
  * @param: {function} xAx - function to map data values to pixes along the x-axis 
  * @param: {function} yAx - function to map data values to pixes along the y-axis
*/
const renderBoxes = (xAx, yAx) => {
  return (d, index) => {   
    if(!d['label']){
      return null
    } 

    const offset = xAx.bandwidth()/2 - BARWIDTH/2

    const rectProps = {
      x:  xAx(d['label']) + offset,
      y: yAx(d.q3),
      width: BARWIDTH,
      height: yAx(d.q1) - yAx(d.q3),
      fill: "#80c4ff",
      stroke: "#002e56",
      strokeWidth: 1,
    }

    const lineStyle = {
      fill: "none",
      stroke: "#002e56" ,
      strokeWidth: 1,
    }

    const lineExtProps = {
      ...lineStyle,
      x1: xAx(d['label']) + xAx.bandwidth()/2,
      y1: yAx(d.min),
      x2: xAx(d['label']) + xAx.bandwidth()/2,
      y2: yAx(d.max),      
    }
  
    const lineMinProps = {
      ...lineStyle,
      x1: xAx(d['label']) + offset,
      y1: yAx(d.min),
      x2: xAx(d['label']) + offset + BARWIDTH,
      y2: yAx(d.min)
    }

    const lineMedProps = {
      ...lineStyle,
      x1: xAx(d['label']) + offset,
      y1: yAx(d.median),
      x2: xAx(d['label']) + offset + BARWIDTH,
      y2: yAx(d.median)
    }

    const lineMaxProps = {
      ...lineStyle,
      x1: xAx(d['label']) + offset,
      y1: yAx(d.max),
      x2: xAx(d['label']) + offset + BARWIDTH,
      y2: yAx(d.max)
    }
    
    return <g key={"box"+index}>
              <line {...lineExtProps} ></line>
              <line {...lineMinProps} ></line>
              <line {...lineMaxProps} ></line>
              <rect {...rectProps} ></rect>
              <line {...lineMedProps} ></line>
          </g>;
  }
}

export default class BoxAndWhisker extends React.Component {

  state = {    
    k: Math.floor((this.props.width - 2*this.props.padding) / (BARWIDTH+BARPAD)),
    page: 1,
  }
  
  static getDerivedStateFromProps(props, state) {
    // Update the k value on change of component width
    const k = Math.floor((props.width - 2*props.padding) / (BARWIDTH+BARPAD))
    if(k != state.k){    
      return {k: k}
    }
    return null
  }  

  /**
   * Changes the page number and clamps to min and max   
   * @param: {number} change - value by which to change page number (negative goes backward).   
  */
  onPageChange(change){
    let newPage = this.state.page+change
    newPage = Math.max(1, newPage)
    newPage = Math.min(Math.ceil(this.props.data.length/this.state.k), newPage)
    this.setState({page: newPage})
  }

  render() {
    const {width, height, padding, data} = this.props;
    
    if(data == null) {
      return null
    }  

    let dispData = data
    const xLabels = data.map((d) => d.label) 

    // get labels to be shown and check if the are in the pattern range
    let filtMin = xLabels.indexOf(this.props.filter[0])
    let filtMax = xLabels.indexOf(this.props.filter[1])
    if(data.length > this.state.k){
      const start = (this.state.page-1) * this.state.k
      const end = this.state.page * this.state.k
      dispData = data.slice(start, end)

      if(start > filtMin){
        filtMin = start
      }
      if((end-1) < filtMax){
        filtMax = end - 1
      }
      if(filtMin > (end-1) || filtMax < start){
        filtMin = filtMax = null
      }
    }    
    
    // Create axis scales
    let xAx= xScale(width, padding, dispData, "label"); 
    let yAx= yScale(height, padding, dispData);     
    
    // Determine postions for start and stop of overlap range
    let x1 = xAx(xLabels[filtMin]);
    let x2 = xAx(xLabels[filtMax]) + xAx.bandwidth();
    
    return (
      <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.boxWhisker'} name={`${this.props.X} vs ${this.props.Y}`} collect={collectChart}>
      <svg className="boxWhisker" width={this.props.width} height={this.props.height}>
        {
          data.length > this.state.k 
          ? <g>
              <foreignObject x={this.props.width/2 - 35 } y={10} width={20} height={20}>        
                <i
                  className="material-icons-outlined"
                  style={{color: "#a1a1a1", cursor: "pointer"}} 
                  onClick={() => this.onPageChange(-1)}
                >
                  keyboard_double_arrow_left
                </i>                
              </foreignObject>  

              <text x={this.props.width/2 } y={27} fontSize={13} textAnchor={"middle"}>
                {this.state.page}
              </text>

              <foreignObject x={this.props.width/2 + 10} y={10} width={20} height={20}>        
                <i
                  className="material-icons-outlined"
                  style={{color: "#a1a1a1", cursor: "pointer"}} 
                  onClick={() => this.onPageChange(1)}
                >
                  keyboard_double_arrow_right
                </i>                
              </foreignObject> 
            </g>
          : null
        }

        {dispData.map(renderBoxes(xAx, yAx)) }
	      
        {
          filtMax != null && filtMin != null
          ? <rect x={x1} y={this.props.padding} width={x2-x1}
              height={this.props.height-2*this.props.padding}
              fill={"#b3b3b3"}
              opacity={0.25}>            
            </rect>
          : null
        }

        { 
          xLabels[filtMin] == this.props.filter[0] 
          ? <line x1={x1} y1={this.props.padding}
              x2={x1} y2={this.props.height-this.props.padding}
              stroke={"#000000"}
              strokeDasharray={"5, 5"} ></line>
          : null
        }
        
        { 
          xLabels[filtMax] == this.props.filter[1] 
          ? <line x1={x2} y1={this.props.padding} x2={x2}
              y2={this.props.height-this.props.padding}
              stroke={"#000000"}
              strokeDasharray={"5, 5"} ></line>          
          : null
        }

        {
          filtMax != null && filtMin != null
          ? <line x1={x1} y1={yAx(this.props.mu_t)}
              x2={x2} y2={yAx(this.props.mu_t)}
              stroke={this.props.mu_t < 0 ? "#ce3f3f" : "#009a5e"}
              strokeWidth={2}></line>    
          : null
        }
	      <XYAxis {...this.props} xScale={xAx} yScale={yAx} X={this.props.X} XType={"Cat"} Y={this.props.Y} txtFontSize={12}/>
      </svg>
      </ContextMenuTrigger>
    );
  }
}
