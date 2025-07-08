import React from 'react';
import * as d3 from "d3";

import { collectChart } from '../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";

import XYAxis from '../../../charts/components/XYAxis';
import "../../../../css/Charts.css"


const xScale = (width, padding, data, X) => {
  return d3.scaleLinear()
    .domain([d3.min(data, function(d) { return +d[X] }), d3.max(data, function(d) { return +d[X] })])
    .range([padding, width - padding]);
};

const yScale = (height, padding, data, Y) => {
  return d3.scaleLinear()
    .domain([d3.min(data, function(d) { return +d[Y] }), d3.max(data, function(d) { return +d[Y] })])
    .range([height - padding, padding]);
};

const renderPoints = (xAx, yAx, X, Y, filter) => {
  return (d, index) => {
    const circleProps = {
      cx: xAx(d[X]),
      cy: yAx(d[Y]),
      stroke: "#ffffff" ,
      strokeWidth: 1,
      opacity: 0.7,
      r: 3,
      className: "dataContextItem",
      key: index,
    }

    if( !isNaN(+filter[0]) && !isNaN(+filter[1]) ){
      if( +d[X] >= +filter[0] && +d[X] <= +filter[1]){
        circleProps.className = "dataItem"
      }
    }
    else if(!isNaN(+filter[0])){
      if( +d[X] >= +filter[0]){
        circleProps.className = "dataItem"
      }
    }
    else if(!isNaN(+filter[1])){
      if( +d[X] <= +filter[1]){
        circleProps.className = "dataItem"
      }
    }
    
    return <circle {...circleProps}/>;
  };
};

export default class ScatterPlot extends React.Component {

  render() {
    if(this.props.data.length < 1) {
      return null
    }

    var xAx= xScale(this.props.width, this.props.padding, this.props.data, this.props.X); //Axis scale      
    var yAx= yScale(this.props.height, this.props.padding, this.props.data, this.props.Y); //Axis scale

    var X = this.props.X
    var x1 = !isNaN(+this.props.filter[0]) ? xAx(+this.props.filter[0]) : xAx(d3.min(this.props.data, function(d) { return +d[X] }))
    var x2 = !isNaN(+this.props.filter[1]) ? xAx(+this.props.filter[1]) : xAx(d3.max(this.props.data, function(d) { return +d[X] }))        
    
    return (
      <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.scattersvg'} name={`${this.props.X} vs ${this.props.Y}`} collect={collectChart}>
        <svg className='scattersvg' width={this.props.width} height={this.props.height}>
          {this.props.data.map(renderPoints(xAx, yAx, this.props.X, this.props.Y, this.props.filter)) }
          <rect x={x1} y={this.props.padding} width={x2-x1} height={this.props.height-2*this.props.padding} fill={"#b3b3b3"} opacity={0.25}></rect>
          <line x1={x1} y1={this.props.padding} x2={x1} y2={this.props.height-this.props.padding} stroke={"#000000"} strokeDasharray={"5, 5"} ></line>
          <line x1={x2} y1={this.props.padding} x2={x2} y2={this.props.height-this.props.padding} stroke={"#000000"} strokeDasharray={"5, 5"} ></line>          
          <line x1={x1} y1={yAx(this.props.mu)} x2={x2} y2={yAx(this.props.mu)} stroke={this.props.mu < 0 ? "#ce3f3f" : "#009a5e"} strokeWidth={2}></line>    
          <XYAxis {...this.props} xScale={xAx} yScale={yAx} X={this.props.X} Y={this.props.Y} txtFontSize={12}/>
        </svg>
      </ContextMenuTrigger>
    );
  }
}
