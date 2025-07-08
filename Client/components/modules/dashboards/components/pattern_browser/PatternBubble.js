import React from 'react';
import * as d3 from "d3";
import * as d3Col from 'd3-scale-chromatic'
import XYAxis from '../../../charts/components/XYAxis';
import PatternBubbleLegend from './PatternBubbleLegend';

import HelpIcon from '../../../common/components/HelpIcon';

import { Transition } from 'react-transition-group'

import "../../../../css/Charts.css"

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
 * @param: {array} data - Array of objects representing patterns.
 * @param: {number} minR - Minimum radius size.
 * @param: {number} maxR - Maximum radius size.
*/
const rScale = (data, minR=5, maxR=20) => {
  const rMin = d3.min(data, d=>sizeToRadius(d.size));
  const rMax = d3.max(data, d=>sizeToRadius(d.size));
  
  const rAx = d3.scaleLinear()
	.domain([rMin, rMax])
	.range([minR, maxR])
	.clamp(true);
  
  return (size) => rAx(sizeToRadius(size));  
};

/**
 * Creates a d3 linear scale and returns a wrapper which 
 * converts a data value to an X position  
 * @param: {number} length - length of the axis.
 * @param: {number} padding - padding around the axis.
 * @param: {array} data -Array containing the x data values.
*/
const xScale = (length, padding, data) => {
  const xMin = d3.min(data, v=>+v);
  const xMax = d3.max(data, v=>+v);  

  let xScale = d3.scaleLinear().domain([xMin, xMax])
      .range([padding, length-padding])
      .clamp(true);
    
  // adjust scale to avoid radius overlapping with axis lines
  const maxRadiusPx = 22;
  const maxRadiusDt = xScale.invert(padding + maxRadiusPx)
	- xScale.invert(padding);
  
  return d3.scaleLinear().domain([xMin-maxRadiusDt, xMax+maxRadiusDt])
    .range([padding, length-padding])
    .clamp(true);  
};

/**
 * Creates a d3 band scale and returns a wrapper which 
 * converts a categorical data value to an X position  
 * @param: {number} length - length of the axis.
 * @param: {number} padding - padding around the axis.
 * @param: {array} data - Array containing the x data values.
*/
const xScaleCat = (length, padding, data) => {
  return d3.scaleBand()
    .domain(data.map(function(d) { return d }))
    .range([padding, length - padding]);
};

/**
 * Creates a d3 linear scale and returns a wrapper which 
 * converts a data value to a Y position  
 * @param: {number} length - length of the axis.
 * @param: {number} padding - padding around the axis.
 * @param: {array} data - Array of objects containing pattern stats.
*/
const yScale = (length, padding, data) => { 
  const yMin = d3.min(data, d=>+d.med);
  const yMax = d3.max(data, d=>+d.med);
  
  let yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([length-padding, padding])
      .clamp(true);

  
  // adjust scale to avoid radius overlapping with axis lines
  const maxRadiusPx = 22;
  const maxRadiusDt = yScale.invert(length-padding - maxRadiusPx)
	- yScale.invert(length-padding);

  return d3.scaleLinear().domain([yMin-maxRadiusDt, yMax+maxRadiusDt])
    .range([length-padding, padding])
    .clamp(true);
};


/**
 * Renders bubbles.
 * @param: {function} opacitySc - Scaling function for bubble opacity (Importance of feature on X).
 * @param: {function} colorScale - Scaling function for bubble color (Effect on target on Y).
 * @param: {function} xAx - Scaling function for X position.
 * @param: {function} yAx - Scaling function for Y position.
 * @param: {function} rAx - Scaling function for bubble radius (# of data items).
 * @param: {string} X - Attribute name shown on X axis.
 * @param: {string} Y - Attribute name shown on Y axis.
 * @param: {array} xLabels - Categorical lables if X is categorical.
 * @param: {string} xType - Type of X - Numerical or categorical.
 * @param: {number} duration - Animation duration.
 * @param: {array} stats - Pattern statistics.
 * @param: {array} spread - Array containing the importance of X to each bubble.
 * @param: {function} onSelect - Function to be executed when a bubble is selected.
 * @param: {number} selectedIndex - Index of selected bubble or pattern.
 * @param: {function} onHover - Function to be executed when a bubble is hovered.
*/
const renderPoints = (opacitySc, colorScale, xAx, yAx, rAx, X, Y, xLabels, xType, duration, stats, spread, onSelect, selectedIndex, onHover) => {
  return (d, index) => {
    const circleProps = {
      cx: (xType === "Cat" ? xAx(d) + xAx.bandwidth()/2 : xAx(+d)),
      cy: yAx(+stats[index]["med"]),
      r: rAx(+stats[index]["size"]),
      fill: d3Col.interpolateRdYlGn(colorScale(+stats[index]["es"])),
      stroke: (selectedIndex === index ? "#000000" : "#ffffff"),
      strokeWidth: 1,
      key: index,
    }  


    if(xType == "Num"){
      const xMin = xAx.domain()[0]
      const xMax = xAx.domain()[1]
      if( +d < xMin || +d > xMax){
        circleProps.fill = "none"
        circleProps.stroke = "none"
      }    
    }

    const yMin = yAx.domain()[0]
    const yMax = yAx.domain()[1]
    if( +stats[index]["med"] < yMin || +stats[index]["med"] > yMax){
      circleProps.fill = "none"
      circleProps.stroke = "none"
    }
    

    const probType = +stats[index]["es"] < 0 ? "lower" : "higher"
    const tooltip = `Mean ${Y}: ${stats[index]["mu"]}` 
                  + `\nMedian ${Y}: ${stats[index]["med"]}`
                  + `\nMin ${Y}: ${stats[index]["min"]}`
                  + `\nMax ${Y}: ${stats[index]["max"]}`
                  + `\n${Math.abs(+stats[index]["es"])}`
                  + ` probability of a point in this group having a ${probType} ${Y}`
    
    const defaultStyle = {
      transition: `fill-opacity ${duration}ms ease-in-out, cx ${duration}ms ease-in-out, cy ${duration}ms ease-in-out, fill ${duration}ms ease-in-out`,
      fillOpacity: 0,
      display: 'inline-block',
    }
    
    const transitionStyles = {
      entering: { fillOpacity: 0},
      entered: { fillOpacity: 1},
      exiting: { fillOpacity: 1},
      exited: { fillOpacity: 0},
    };

    return  <Transition key={index} in={true} timeout={duration} appear={true}>
              {(state) => (
                <circle {...circleProps} style={{
                  ...defaultStyle,
                  ...transitionStyles[state],
                  fillOpacity: opacitySc(+spread[index][X])
                }} onClick={() => onSelect(index)} onMouseEnter={() => onHover(index)} onMouseLeave={() => onHover(null)}>
                  <title>
                    {tooltip}
                  </title>
                </circle>
              )}
            </Transition>;
  };
};

/**
 * Renders heatmap-like distribution of target values along y-axis.
 * @param: {array} bins - Array of objects representing patterns.
 * @param: {function} yAx - Scaling fucntion.
 * @param: {number} pad - offset left of the y-axis.
*/
const renderYDistribution = (bins, yAx, pad) => {
  return (d, index) => {
    const rectProps = {
      key: 'yrect' + index,
      x: pad,
      y: yAx(+bins[index+1]),
      width: 10,
      height: Math.abs(yAx(+bins[index+1]) - yAx(+bins[index])),
      stroke: "#ffffff",
      strokeWidth: 1,
      fill: d3Col.interpolateBlues(+d)
    }
    return <rect {...rectProps} />
  }
}

/**
 * Renders heatmap-like distribution of selected along x-axis.
 * @param: {array} bins - Array of objects representing patterns.
 * @param: {function} xAx - Scaling fucntion.
 * @param: {number} top - offset y of the x-axis.
 * @param: {string} xType - Type of X - Numerical or categorical.
*/
const renderXDistribution = (bins, xAx, top, xType) => {
  return (d, index) => {
    const rectProps = {
      key: 'xrect' + index,
      x: xAx(bins[index]),
      y: top-10,
      width: Math.abs(xAx(+bins[index+1]) - xAx(+bins[index])),
      height: 10,
      stroke: "#ffffff",
      strokeWidth: 1,
      fill: d3Col.interpolateBlues(+d)
    }

    if(xType == "Cat"){
      rectProps.x = xAx(bins[index]) + xAx.bandwidth()/8
      rectProps.width = xAx.bandwidth() - xAx.bandwidth()/4
    }

    return <rect {...rectProps} />
  }
}



export default class PatternBubble extends React.Component {
  state={
    data: this.props.data,
    chartWidth: this.props.width,
    hoveredID: null,
    hoverParams: null,
    X: this.props.X,
    xType: null,
    xLabels: null,
    xAx: null,
    yAx: null,
    extent: null,
    showReset: false,
    animate: true,
    showLegend: true
  }  

  componentDidMount(){
    this.initializeScale()
  }

  componentDidUpdate(prevProps) {
    if(prevProps.X != this.props.X || prevProps.Y != this.props.Y ){
      // Recompute scales when x axis attribute changes
      this.initializeScale()
    }
    if(prevProps.width != this.props.width){
      // Recompute chart width and scales when component resizes
      this.initializeScale()
    }
    else if(this.state.animate){
      // Delay setting animate to false to allow previous animation to finish
      setTimeout(()=>this.setState({animate: false}), 400);
    }
  }

  /**
   * Initializes scale when props are changed.
  */
  initializeScale() {
    const data = this.props.data[this.props.X]
    const chartWidth = this.props.width
    // set the extent of the x and y data values - zoom will be capped to this
    let extent = {
      xmin: null,
      xmax: null,
      ymin: d3.min(data.stats, d=>+d.med),
      ymax: d3.max(data.stats, d=>+d.med)
    }

    for(let i=0; i < data.stats[0].shap.length; i++){
      if(data.stats[0].shap[i].attribute == this.props.X){
        extent.xmin = +data.stats[0].shap[i].min
        extent.xmax = +data.stats[0].shap[i].max
        break
      }
    }

    // set initial scales 
    let xAx = xScale(chartWidth,
                this.props.padding,
                data.position); //Axis scale
    
    let yAx = yScale(this.props.height,
                this.props.padding,
                data.stats); //Axis scale

    // update extent so that zoomed out view is centered
    const xDiff = d3.max([
      xAx.domain()[0] - extent.xmin,
      extent.xmax - xAx.domain()[1]
    ])

    const yDiff = d3.max([
      yAx.domain()[0] - extent.ymin,
      extent.ymax - yAx.domain()[1]
    ])

    extent = {
      xmin: xAx.domain()[0] - xDiff,
      xmax: xAx.domain()[1] + xDiff,
      ymin: yAx.domain()[0] - yDiff,
      ymax: yAx.domain()[1] + yDiff
    }

    let xType = "Num"
    let xLabels = []


    // Handle categorical x-axis
    if(Object.keys(this.props.catLabels).includes(this.props.X)){
      xAx =  xScaleCat(chartWidth,
		       this.props.padding,
		       this.props.catLabels[this.props.X]); //Axis scale
      xType = "Cat"
      xLabels = this.props.catLabels[this.props.X]
    }

    this.setState({
      X: this.props.X,
      animate: true,
      chartWidth: chartWidth,
      xAx: xAx,
      yAx: yAx,
      extent: extent,
      xType: xType, 
      xLabels: xLabels,
      showReset: false
    })
  }

  /**
   * Reset scales to center and zoom to fit
  */
  onReset(){
    this.initializeScale()
  }

  /**
   * Handles computation of x and y scales for zooming of chart. 
   * Supports independent X and Y zoomm
   * @param: {string} zoomType - The type of zoom - X-axis, Y-axis or dual.
   * @param: {bool} increase - bool value to indicate zooming in if true and zoom out if false.
   * @param: {number} x - x position of the pointer i.e zoom center.
   * @param: {number} y - y position of the pointer i.e zoom center.
  */
  onZoom(zoomType, increase, x, y){
    // Default to chart center if x or y is null
    if(x==null){
      x = this.state.chartWidth/2
    }
    if(y==null){
      y = this.props.height/2
    }
    let newXAX = this.state.xAx
    let newYAX = this.state.yAx
    
    const extent = this.state.extent
    const xType = this.state.xType
    // Handle rescaling X
    if( (zoomType == 'x' || zoomType == 'dual') && xType == "Num") {
      const xDom = newXAX.invert(x)
      // Scale X
      const k = increase ? 1 : -1
      const diff = k*(this.state.xAx.domain()[1] - this.state.xAx.domain()[0]) * 0.1
      const min = d3.max([extent.xmin, this.state.xAx.domain()[0] + diff])
      const max = d3.min([extent.xmax, this.state.xAx.domain()[1] - diff])
      newXAX.domain([min, max])

      // Translate to keep x-attribute value at the same mouse position
      const xdiff = newXAX.invert(x) - xDom
      const xmin = d3.max([extent.xmin, newXAX.domain()[0] - xdiff])
      const xmax = d3.min([extent.xmax, newXAX.domain()[1] - xdiff])
      newXAX.domain([xmin, xmax])
    }

    // Handle rescaling Y
    if(zoomType == 'y' || zoomType == 'dual') {      
      const yDom = newYAX.invert(y)

      // Scale Y
      const k = increase ? 1 : -1
      const diff = k*(this.state.yAx.domain()[1] - this.state.yAx.domain()[0]) * 0.1
      const min = d3.max([extent.ymin, this.state.yAx.domain()[0] + diff])
      const max = d3.min([extent.ymax, this.state.yAx.domain()[1] - diff])       
      newYAX.domain([min, max])      

      // Translate to keep y-attribute value at the same mouse position
      const ydiff = newYAX.invert(y) - yDom                
      const ymin = d3.max([extent.ymin, newYAX.domain()[0] - ydiff])
      const ymax = d3.min([extent.ymax, newYAX.domain()[1] - ydiff])     
      newYAX.domain([ymin, ymax])
    }

    this.setState({xAx: newXAX, yAx: newYAX, showReset: true})
  }

  /**
   * Event listener for mouse wheel. 
   * Calls the zoom function.
   * @param: {object} event - javascript event object.
  */
  onMouseWheel(event){
    // use ref instead of target as event.target may be a bubble or axis
    const rect = this.refs.bubblePlot.getBoundingClientRect();
    
    // Get position of mouse relative to svg
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let zoomType = "dual"
    if(x < this.props.padding && y <= this.props.height - this.props.padding ){
      zoomType = "y"
    }
    if(x >= this.props.padding && y > this.props.height - this.props.padding ){
      zoomType = "x"
    }

    if(event.deltaY > 0){
      this.onZoom(zoomType, false, x, y)
    }
    else {
      this.onZoom(zoomType, true, x, y)
    }
  }

  /**
   * Function to start panning. Turns panning on and Sets up anchor point for pan.
   * @param: {object} event - javascript event object.
  */
  onStartPan(event){
    // activate panning
    this.pan = true

    // determine the mouse position in the svg

    // use ref instead of target as event.target may be a bubble or axis
    const rect = this.refs.bubblePlot.getBoundingClientRect();
    this.startX = event.clientX - rect.left;
    this.startY = event.clientY - rect.top;
    const rangeX = this.state.xAx.range()
    const rangeY = this.state.yAx.range()
    this.startX = d3.max([this.startX, rangeX[0]])
    this.startX = d3.min([this.startX, rangeX[1]])
    this.startY = d3.max([this.startY, rangeY[1]])
    this.startY = d3.min([this.startY, rangeY[0]])
  }

  /**
   * Turns off panning.
  */
  onEndPan(){
    this.pan = false
  }

   /**
   * Function to pan the current view on mouse move if panning is on.
   * @param: {object} event - javascript event object.
  */
  onPan(event){
    if(this.pan){
      let newXAX = this.state.xAx
      let newYAX = this.state.yAx
      const extent = this.state.extent

      // use ref instead of target as event.target may be a bubble or axis
      const rect = this.refs.bubblePlot.getBoundingClientRect();

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rangeX = newXAX.range()
      const rangeY = newYAX.range()
      if(x >= rangeX[0] && x <= rangeX[1] && y >= rangeY[1] && y <= rangeY[0]){
        // Compute x/y translation in pixels
        const txR = x - this.startX
        const tyR = y - this.startY
        
        // Determine the new X range

        if(this.state.xType == "Num"){
          // Compute x translation in attribute units
          const txD = newXAX.invert(Math.abs(txR) + rangeX[0]) - newXAX.domain()[0] 
          const xdiff = txR < 0 ? txD : -txD
          const xmin = newXAX.domain()[0] + xdiff
          const xmax = newXAX.domain()[1] + xdiff
          if(xmin >= extent.xmin && xmax <= extent.xmax){
            this.startX = d3.max([x, rangeX[0]])
            this.startX = d3.min([x, rangeX[1]])
            newXAX.domain([xmin, xmax])    
          }
        }

        // Determine the new Y range
        
        // Compute y translation in attribute units
        const tyD = newYAX.invert(rangeY[0] - Math.abs(tyR)) - newYAX.domain()[0] 
        const ydiff = tyR > 0 ? tyD : -tyD        
        const ymin = newYAX.domain()[0] + ydiff
        const ymax = newYAX.domain()[1] + ydiff
        if(ymin >= extent.ymin && ymax <= extent.ymax){
          this.startY = d3.max([y, rangeY[1]])
          this.startY = d3.min([y, rangeY[0]])
          newYAX.domain([ymin, ymax])    
        }

        this.setState({xAx: newXAX, yAx: newYAX})
      }      
    }
  }

   /**
   * Function set up data for rending a patterns X and Y distribution.
   * @param: {number} id - pattern ID.
  */
  onHover(id){
    return
    if(+id >= 0){
      const {xAx, yAx, extent, xType, xLabels} = this.state
      const stats = this.props.data.stats[+id]
      
      let xbins = []
      let xfreq = []

      if(xType == "Num"){
        // Compute the binning level (1-4)
        let xratio = 5 - 4 * (xAx.domain()[1] - xAx.domain()[0]) / (extent.xmax - extent.xmin)
        xratio = Math.floor(xratio).toString()
        xratio = xratio < 1 ? 1 : xratio
        xratio = xratio > 4 ? 4 : xratio
        xratio = isNaN(xratio) ? 1 : xratio
        // Select the binning level (1-4)
        xbins = stats.hoverHist[xratio].bin_edges;
        xfreq = stats.hoverHist[xratio].freq;	
      }
      else{
        // If categorical binning level is always 1
        xbins = JSON.parse(JSON.stringify(stats.hoverHist["1"].bin_edges));
        xfreq = stats.hoverHist["1"].freq;
      }
      
      // Compute the binning level (1-4)
      let yratio = 5 - 4 * (yAx.domain()[1] - yAx.domain()[0]) / (extent.ymax - extent.ymin)
      yratio = Math.floor(yratio).toString()
      yratio = yratio < 1 ? 1 : yratio
      yratio = yratio > 4 ? 4 : yratio
      yratio = isNaN(yratio) ? 1 : yratio
      // Select the binning level (1-4)
      const ybins = stats.histZoom[yratio].bin_edges
      const yfreq = stats.histZoom[yratio].freq

      this.setState({
        hoveredID: id, 
        hoverParams: {
          xbins: xbins, xfreq: xfreq,
          ybins: ybins, yfreq: yfreq
        }
      })
    }
    else{
      this.setState({hoveredID: null, hoverParams: null})
    }    
  } 

  onToggleLegend() {
    const show = !this.state.showLegend
    this.setState({showLegend: show})
  }

  render() {      
    const { height, padding, Y} = this.props
    const {chartWidth, X, xType, xLabels, xAx, yAx } = this.state
    const data = this.props.data[X]

    if(!xAx || !yAx){
      return  null
    }

    const rAx= rScale(data.stats); //Axis scale
    const opacitySc = d3.scaleLinear().domain([0, 1.5]).range([0.05, 1]).clamp(true)
    const colorScale = d3.scaleLinear().domain([-1.0, 0, 1.0]).range([0, 0.5, 1]).clamp(true);

    return (
      <div>
        <svg 
          ref={"bubblePlot"}
          width={chartWidth-padding}
          height={height}
          onWheel={this.onMouseWheel.bind(this)}
          onMouseDown={this.onStartPan.bind(this)}
          onMouseUp={this.onEndPan.bind(this)}
          onMouseMove={this.onPan.bind(this)}
          style={{marginTop: 35}}
        >
          <defs>
            <clipPath id="clipPath-bubble">
              <rect x={padding} y={padding} width={chartWidth-2*padding} height={height-2*padding} />
            </clipPath>
          </defs>
          {/* {
            this.state.hoveredID != null 
            ? this.state.hoverParams.yfreq.map(
                renderYDistribution(this.state.hoverParams.ybins, yAx, padding)
              )
            : null
          }

          {
            this.state.hoveredID != null // && xType === "Num"
            ? this.state.hoverParams.xfreq.map(
                renderXDistribution(this.state.hoverParams.xbins, xAx, height-padding, this.state.xType)
              )
            : null
          } */}
          <g style={{clipPath: "url(#clipPath-bubble)"}}>
          {data.position.map(renderPoints(
                      opacitySc,
                      colorScale,
                      xAx, yAx, rAx,
                      X,
                      Y,
                      xLabels, xType,
                      this.state.animate ? 300 : 0,
                      data.stats,
                      data.spread,
                      this.props.onChangeSelected,
                      this.props.selectedPattern,
                      this.onHover.bind(this)))}
          </g>

          <XYAxis
            {...this.props}
            width={chartWidth}
            
            xScale={xAx}
            XType={xType}
            yScale={yAx}
            X={X}
            Y={Y}
            txtFontSize={14}
          />

        </svg>        

        <PatternBubbleLegend
          stats={data.stats}
          width={585}
          height={100}
          padding={padding}
          X={X}
          Y={Y}
          rAx={rAx}
          show={this.state.showLegend}
          onToggleShow={this.onToggleLegend.bind(this)}
        />

        <div className={this.state.showLegend ? "zoomBox" : "zoomBoxSmall"}>
          <div className="zoomInnerBox" style={{bottom: 10, left: chartWidth/2}}>
            <button className="zoomButton" onClick={() => this.onZoom("x", true, null, null)}>{"+"}</button>
            X-Zoom
            <button className="zoomButton" onClick={() => this.onZoom("x", false, null, null)}>{"-"}</button>
          </div>

          <div className="zoomInnerBox">
            <button className="zoomButton" onClick={() => this.onZoom("y", true, null, null)}>{"+"}</button>
            Y-Zoom
            <button className="zoomButton" onClick={() => this.onZoom("y", false, null, null)}>{"-"}</button>
          </div>

          <button
            className="zoomButton"
            style={{width: 80, height: 25, marginTop: 7}} 
            onClick={this.onReset.bind(this)}>
              {"Reset Zoom"}
          </button>

          {
            this.state.showLegend
            ? <i
                className="material-icons-outlined legendToggleDisplay"
                onClick={this.onToggleLegend.bind(this)}
                title={"Toggle legend"} >
                  {"close_fullscreen"}
              </i>
            : <i
                className="material-icons-outlined legendToggleDisplay"
                onClick={this.onToggleLegend.bind(this)}
                title={"Toggle legend"} >
                  {"open_in_full"}
              </i>
          }          
        </div>

        <div className={this.state.showLegend ? "patternHelp" : "patternHelpSmall"}>
          <HelpIcon 
              content={
                `This panel contains a bubble chart that shows all the patterns in this dataset.
                Each pattern in this chart is represented by a colored circle. 
                The color is based on the target variable (i.e. whether the target variable is unusually high / low). 
                The size of the circle is based on the number of points that fall within the pattern. 
                The position is based on the median values for the x and y axes. 
                The x-axis can be set by clicking on the corresponding attribute in the feature importance panel. 
                Finally, the opacity indicates how important the x-axis attribute is as a defining characteristic `
              }
            />
        </div>
      </div>
    );
  }
}
