import React from 'react';
import * as d3 from "d3";
import XYAxis from './XYAxis';
import { Transition } from 'react-transition-group'

const duration = 300;

const defaultStyle = {
  transition: `opacity ${duration}ms ease-in-out, height ${duration}ms ease-in-out, y ${duration}ms ease-in-out, fill ${duration}ms ease-in-out`,
  opacity: 0,
  display: 'inline-block',
}

const transitionStyles = {
  entering: { opacity: 0},
  entered: { opacity: 1},
  exiting: { opacity: 1},
  exited: { opacity: 0},
};

const xScale = (width, height, padding, data) => {
  return d3.scaleBand()
    .domain(data.map(function(d) { return (+d).toFixed(2); }))
    .range([padding, width - padding]);
};

const xScaleCat = (width, height, padding, data) => {
  return d3.scaleBand()
    .domain(data)
    .range([padding, width - padding]);
};


const yScale = (width, height, padding, data) => {
  return d3.scaleLinear()    
    .domain([0, d3.max(data, function(d) { return +d })])    
    .range([height - padding, padding]);
};


const renderRects = (border, padding, height, xAx, yAx, type) => {
  return (d, index) => {

    const rectProps = {
      x:  xAx((border[index])) + xAx.bandwidth()/4,
      y: yAx(+d),
      width: xAx.bandwidth()/2,
      height: (height - padding - yAx(+d)),
      fill: "#b96ee4",
      key: index,
    }

    if(type == "Numerical"){
      rectProps.x = xAx((+border[index]).toFixed(2)) + 3*xAx.bandwidth()/4
    }
    
    return <Transition key={index} in={true} timeout={duration} appear={true}>
              {(state) => (
                <rect {...rectProps} style={{
                  ...defaultStyle,
                  ...transitionStyles[state]
                }}>
                </rect>
              )}
            </Transition>;
  };
};



export default class Histogram extends React.Component {
  render() {   
    var xAx= xScaleCat(this.props.width, this.props.height, this.props.padding, this.props.border); //Axis scale
    if(this.props.type == "Numerical") {
      xAx= xScale(this.props.width, this.props.height, this.props.padding, this.props.border); //Axis scale
    }
    var yAx= yScale(this.props.width, this.props.height, this.props.padding, this.props.counts); //Axis scale    
    return (
      <div style={{display: "block", textAlign: "center"}}>
        <svg width={this.props.width} height={this.props.height}>          

          {this.props.counts.map(renderRects(this.props.border, this.props.padding, this.props.height, xAx, yAx,this.props.type)) }
          
          <XYAxis {...this.props} xScale={xAx} yScale={yAx} X={this.props.attr} Y={"Count"} txtFontSize={12}/>
        </svg>
      </div>
    );
  }
}
