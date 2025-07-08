import React from 'react';
import { collectChart } from '../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";
import * as d3 from "d3";
import XYAxis from '../../../charts/components/XYAxis';
import { selectScale, scaleType} from '../../../charts/components/scale';

import { Transition } from 'react-transition-group'
import "../../../../css/Charts.css"

const duration = 300;

const topPad = 30

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


const yScale = (height, padding, data, N) => {
  return d3.scaleLinear()    
    .domain([0,  d3.max(data, function(d) { return 100*d.count/N })])    
    .range([height - padding, topPad]);
};


const renderRects = (N, xAx, yAx, color) => {
  return (d, index) => {
    const rectProps = {
      x:  xAx(d.x0) + 1,
      y: yAx(100*d.count/N),
      width: xAx(d.x1) - xAx(d.x0)-1, 
      height: yAx(0) - yAx(100*d.count/N),
      className: color,
      key: index,
    }
    
    
    return <Transition key={index} in={true} timeout={duration} appear={true}>
              {(state) => (
                <rect {...rectProps} style={{
                  ...defaultStyle,
                  ...transitionStyles[state]
                }}><title>{"# Items: " + d.count}</title>
                </rect>
              )}
            </Transition>;
  };
};

export default class DensityHistogram extends React.Component {
  
  render() {   
    if(this.props.type != "Numerical" && this.props.type != "DateTime") {
      return null
    }
    
    var bins = []    
    var allBins = []
    var total = 0
    for (var i = 0; i < this.props.border.length-1; i++) {
      bins.push({
        count: this.props.counts[i],
        x0: this.props.border[i],
        x1: this.props.border[i+1]
      })
      allBins.push({
        count: this.props.countsAll[i],
        x0: this.props.borderAll[i],
        x1: this.props.borderAll[i+1]
      })
      total += this.props.counts[i]
    }     
    
    if (total == 0) {
      const divStyle = {
        display: "block",
        textAlign: "center",
        width: this.props.width,
        height: this.props.height,
        paddingTop: this.props.height / 2      
      };
      
      return (
        <div style={divStyle}>
          The filter contains no data.
        </div>
      );
    }
    
    var xAx = selectScale(this.props.border,
			  [this.props.padding, this.props.width-this.props.padding])
    
    var yAx = yScale(this.props.height, this.props.padding, allBins, total)
    const XType = typeof(this.props.border[0]) === 'string' ? 'Cat' : 'Num';
    
    return (
        <div style={{display: "block", textAlign: "center"}}>
          <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.transformerDensityHist'} name={`${this.props.attr}`} collect={collectChart}>
          <svg className='transformerDensityHist' width={this.props.width} height={this.props.height}>    
            {allBins.map(renderRects(total, xAx, yAx, "dataContextItem")) /* Orig bins */}
            {bins.map(renderRects(total, xAx, yAx, "dataItem")) /* Filtered bins */}
           <XYAxis {...this.props} topPad={topPad} xScale={xAx} yScale={yAx} X={null} Y={"Percentage"} txtFontSize={12} XType={XType}/>           
          </svg>
          </ContextMenuTrigger>
        </div>
    );
  }
}
