import React from 'react';
import * as d3 from "d3";
import XYAxis from '../../../charts/components/XYAxis';
import { Transition } from 'react-transition-group'
import SVGBrush from 'react-svg-brush';
import { selectScale, scaleType} from '../../../charts/components/scale';
import "../../../../css/Core.css"
import "../../../../css/Charts.css"

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

const topPad = 0

const yScale = (height, padding, data, N) => {
  return d3.scaleLinear()    
    .domain([0,  d3.max(data, function(d) { return d.count/N }) + 0.02])    
    .range([height - padding, topPad]);
};

const renderRects = (N, xAx, yAx) => {
  return (d, index) => {
    const rectProps = {
      x:  xAx(d.x0) + 1,
      y: yAx(d.count/N),
      width: xAx(d.x1) - xAx(d.x0)-1, 
      height: yAx(0) - yAx(d.count/N),
      className: "dataItem",
      key: index,
    }
    
    
    return <Transition key={index} in={true} timeout={duration} appear={true}>
              {(state) => (
                <rect data-testid='filter-rect' {...rectProps} style={{
                  ...defaultStyle,
                  ...transitionStyles[state]
                }}>
                </rect>
              )}
            </Transition>;
  };
};


/** Returns the Min of the data */
function Min(desc) {
  // could be Numerical or DateTime
  return (desc.type === 'Numerical' ? desc.min : desc.first);
}


/** Returns the Max of the data */
function Max(desc) {
  // could be Numerical or DateTime
  return (desc.type === 'Numerical' ? desc.max : desc.last);
}

export default class FilterHistogram extends React.Component {

  state={
    sx0: this.props.padding,
    sx1: this.props.width - this.props.padding,
    name: this.props.description.name
  }

  static getDerivedStateFromProps(props, state) {
    if(props.description.name != state.name){
      props.onPreviewFilter({
        attr: props.description.name,
        lb: Min(props.description),
        ub: Max(props.description)
      })

      return {
        sx0: props.padding,
        sx1: props.width - props.padding,
        name: props.description.name
      };
    }
    return null
  }
  onBrushStart = ({target, type, selection, sourceEvent})=>{
  }

  onBrush = ({target, type, selection, sourceEvent})=>{    
    if(selection == null){
      this.setState({
        sx0: this.props.padding,
        sx1: this.props.width - this.props.padding,
      })
      return
    }
    this.setState({
      sx0: selection[0][0],
      sx1: selection[1][0],
    })
  }

  onBrushEnd = ({target, type, selection, sourceEvent})=>{    
    if(selection == null){
      this.setState({
        sx0: this.props.padding,
        sx1: this.props.width - this.props.padding,
      })      
    }
    else{
      this.setState({
        sx0: selection[0][0],
        sx1: selection[1][0],
      })
    }    

    var xAx = selectScale(this.props.description.division,
			  [this.props.padding, this.props.width-this.props.padding]);
    
    if(selection == null){
      this.props.onPreviewFilter({
        attr: this.props.description.name,
        lb: xAx.invert(this.props.padding),
        ub: xAx.invert(this.props.width - this.props.padding),
      })
    }
    else{
      this.props.onPreviewFilter({
        attr: this.props.description.name,
        lb: xAx.invert(selection[0][0]),
        ub: xAx.invert(selection[1][0]),
      })
    }
  }

  renderBrush = (x0,x1,y0,y1, sx0, sx1) => (
    <SVGBrush
      // Defines the boundary of the brush.
      // Strictly uses the format [[x0, y0], [x1, y1]] for both 1d and 2d brush.
      // Note: d3 allows the format [x, y] for 1d brush.
      extent={[[x0, y0], [x1, y1]]}
      selection={[[sx0, y0], [sx1, y1]]}
      // Obtain mouse positions relative to the current svg during mouse events.
      // By default, getEventMouse returns [event.clientX, event.clientY]
      brushType="x" // "2d" // "x"
      onBrushStart={this.onBrushStart}
      onBrush={this.onBrush}
      onBrushEnd={this.onBrushEnd}
    />
  )

  onRemoveOutliers(){
    var d = this.props.description
    var iqr = d["75%"] - d["25%"] 
    var lower = d["25%"] - 1.5*iqr
    var upper = d["75%"] + 1.5*iqr
    
    lower = lower > d.min ? lower : d.min
    upper = upper < d.max ? upper : d.min

    var xAx = selectScale(this.props.description.division,
			  [this.props.padding, this.props.width-this.props.padding]);
    var sx0 = xAx(lower)
    var sx1 = xAx(upper)     

    this.setState({sx0: sx0, sx1: sx1})

    this.props.onPreviewFilter({
      attr: this.props.description.name,
      lb: lower,
      ub: upper,
    })
  }

  onResetFilter(){
    this.setState({sx0: this.props.padding, sx1: this.props.width - this.props.padding})

    this.props.onPreviewFilter({
      attr: this.props.description.name,
      lb: Min(this.props.description),
      ub: Max(this.props.description),
    })

  }

  onApplyFilter(){
    var xAx = selectScale(this.props.description.division,
			  [this.props.padding, this.props.width-this.props.padding]);

    const transformType = {[scaleType.LINEAR]: 'Filter', [scaleType.TIME]: 'FilterDate'}
    var filter = {
      attr: this.props.description.name,
      tType: transformType[xAx.type],
      lb: xAx.invert(this.state.sx0),
      ub: xAx.invert(this.state.sx1),
    }    


    this.props.onTransform(filter, ()=>{
      this.setState({
	sx0: this.props.padding,
	sx1: this.props.width - this.props.padding
      });
    })
  }

  render() {   
    if(this.props.description.type != "Numerical" && this.props.description.type != "DateTime") {
      return null
    }
    var bins = []        
    var total = 0
    for (var i = 0; i < this.props.description.division.length-1; i++) {
      bins.push({
        count: this.props.description.count[i],
        x0: this.props.description.division[i],
        x1: this.props.description.division[i+1]
      })
      total += this.props.description.count[i]
    }

    // Check if the preview is empty
    const isEmpty = this.props.description.countPrev.reduce((agg, ct)=>agg+ct, 0) == 0;
    
    var xAx = selectScale(this.props.description.division,
			  [this.props.padding, this.props.width-this.props.padding]);
    
    var yAx = yScale(this.props.height, this.props.padding, bins, total)
    const XType = typeof(this.props.description.division[0]) === 'string' ? 'Cat' : 'Num';
    
    return (
        <div style={{display: "block", textAlign: "center"}}>
          <svg width={this.props.width} height={this.props.height}>    
            {bins.map(renderRects(total, xAx, yAx))}            
            {this.renderBrush(this.props.padding, this.props.width - this.props.padding, topPad, this.props.height - this.props.padding, this.state.sx0, this.state.sx1)}
            <XYAxis {...this.props} xScale={xAx} yScale={null} X={this.props.description.name} Y={null} txtFontSize={12} XType={XType}/>
          </svg>

      {
	this.props.description.type === 'Numerical' ?
	  <button className="coreButton" style={{marginTop:0}} onClick={this.onRemoveOutliers.bind(this)} >{"Remove outliers"}</button>
	  : null
      }
          <button className="coreButton" style={{marginTop:0}} onClick={this.onResetFilter.bind(this)} >{"Remove Filter"}</button>
          <button className="coreButton" style={{marginTop:0}} disabled={isEmpty} onClick={this.onApplyFilter.bind(this)} >{"Apply Filter"}</button>
        </div>
    );
  }
}
