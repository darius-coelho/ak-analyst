import React from 'react';
import * as d3 from "d3";

import { collectChart } from '../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";
import { Transition } from 'react-transition-group'

import XYAxis from '../../../charts/components/XYAxis';

import "../../../../css/Charts.css"

const duration = 300;

const defaultStyle = {
  transition: `opacity ${duration}ms ease-in-out, 
               height ${duration}ms ease-in-out, 
               y ${duration}ms ease-in-out, 
               fill ${duration}ms ease-in-out`,
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


const yScale = (width, height, padding, data) => {
  return d3.scaleLinear()
    .domain([0, d3.max(data, function(d) { return +d })])
    .range([height - padding, padding])
    .nice();
};


const renderRects = (yDat, padding, height, xAx, yAx, tType, className) => {
  return (d, index) => {

    if(index == yDat.length){
      return null
    }

    var xOffset = className == "dataItem" ? xAx.bandwidth() : 3*xAx.bandwidth()/4

    const rectProps = {
      x:  xAx((+d).toFixed(2)) + xOffset,
      y: yAx(+yDat[index]),
      width: xAx.bandwidth()/4,
      height: (height - padding - yAx(+yDat[index])),
      className: className,
      key: index,
    }

    if(tType == "Binary"){
      xOffset = className == "dataItem" ? xAx.bandwidth()/2 : xAx.bandwidth()/4
      rectProps.x = xAx((+d).toFixed(2)) + xOffset
    }

    return <Transition key={index} in={true} timeout={duration} appear={true}>
              {(state) => (
                <rect {...rectProps} style={{
                  ...defaultStyle,
                  ...transitionStyles[state]
                }}>
                  <title>{`Prob. : ${yDat[index]}`}</title>
                </rect>
              )}
            </Transition>;
  };
};

export default class ProbHistogram extends React.Component {

  render() {   
    var {width, height, padding, data, X, Y, selectedPatternStats, targetType} = this.props
    var xAx= xScale(width, height, padding, data[X]); //Axis scale
    var yAx= yScale(width, height, padding, data[Y]); //Axis scale
    if(selectedPatternStats != null){
      yAx= yScale(width, height, padding, data[Y].concat(selectedPatternStats.hist[Y]));
    }
    var xDat = data[X]
    
    if(this.props.targetType == "Binary"){
      xDat = [0,1]    
      xAx = xScale(width, height, padding, [0,1]); //Axis scale
    }

    var lgdTextStyle = {fontSize: 11, y: padding-11}
    var lgdRectStyle = {fontSize: 11, y: padding-20, height:10, width:10}
    var lgdXOffset = width - padding
    
    return (
      <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.probHist'} name={` Probability Histogram X`} collect={collectChart}>
        <svg className="probHist" width={width} height={height}>
          <rect className="dataContextItem" {...lgdRectStyle} x={lgdXOffset - 80} />
          <text {...lgdTextStyle}  x={lgdXOffset - 67} >{"All"}</text>
          <rect className="dataItem" {...lgdRectStyle} x={lgdXOffset - 40} />
          <text {...lgdTextStyle}  x={lgdXOffset - 27}>{"Selected"}</text>

          {
            //Render overall Prob Dist
            xDat.map(renderRects(
              data[Y], 
              padding, 
              height, 
              xAx, 
              yAx, 
              targetType, 
              "dataContextItem" )) 
          }
          {
            //Render pattern Prob Dist
            selectedPatternStats == null
            ? null
            : xDat.map(renderRects(
                selectedPatternStats.hist[Y], 
                padding, 
                height, 
                xAx, 
                yAx, 
                targetType, 
                "dataItem")) 
          }
          <XYAxis 
            {...this.props}
            xScale={xAx} 
            yScale={yAx} 
            X={this.props.target} 
            Y={"Probablility"} 
            txtFontSize={12}
          />
        </svg>
      </ContextMenuTrigger>
    );
  }
}
