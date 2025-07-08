import React from 'react';
import * as d3 from "d3";
import { collectChart } from '../../../common/components/contextCollect';
import { ContextMenuTrigger } from "react-contextmenu";
import XYAxis from '../../../charts/components/XYAxis';
import { Transition } from 'react-transition-group'
import * as d3Col from 'd3-scale-chromatic'

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

const xScale = (width, padding, data, attr) => {  
  return d3.scaleLinear()    
    .domain([d3.min(data, function(d) { return +d }), d3.max(data, function(d) { return +d })])    
    .range([padding, width-padding]);
};

const yScale = (height, padding, yMax) => {
  return d3.scaleLinear()    
    .domain([0,  yMax]).nice()    
    .range([height - padding, padding]);
};

const yScaleLog = (height, padding, yMax) => {
  return d3.scaleLog()    
    .domain([0.1,  yMax]).nice()    
    .range([height - padding, padding]);
};

const renderOption = () => {
  return (option, index) => {
    return(
      <option value={option} key={index} >{option}</option>
    )
  }
}

const renderBars = (xAx, yAx, legendData) => {
  return (d, index) => {
    return legendData.map((targetClass, idx) => { 
      if(d[targetClass] == 0){
        return null
      }

      const rectProps = {
        x:  xAx(d.x0) + idx*(xAx(d.x1) - xAx(d.x0)) / legendData.length,
        y: yAx(d[targetClass]),
        width: (xAx(d.x1) - xAx(d.x0)-2) / legendData.length, 
        height:  yAx(yAx.domain()[0]) - yAx(d[targetClass]),
        fill: d3Col.schemeTableau10[targetClass],        
      }

      return <Transition key={'bar-' + index + targetClass} in={true} timeout={duration} appear={true}>
              {(state) => (
                <rect {...rectProps} style={{
                  ...defaultStyle,
                  ...transitionStyles[state]
                }}><title>{"# Items: " + d[targetClass]}</title>
                </rect>
              )}
            </Transition>;

    })
  };
};

const renderLegend = (width, padding) => {
  return (d, index) => {
    const rectProps = {
      x: width - padding,
      y: padding + index*20,
      width: 12,
      height: 12,
      fill: d3Col.schemeTableau10[d],
    }

    const textProps = {
      x: width - padding - 25 + 40,
      y: padding + index*20 + 9,
      fontSize: 12,
    }
    
    return <g key={'l' + d}>
              <text {...textProps}>{d}</text>
              <rect {...rectProps}></rect>
            </g>;
  };
};

export default class BinaryHistogram extends React.Component {

  state={
    yScType: "Count",
  }

  onYScaleChanged(event){
    this.setState({yScType: event.target.value})
  }
  
  render() {
    const yAttr = this.props.Y
    let yMax = 0

    // Get unique target classes
    const legendData = [...new Set(this.props.data.map(d=>d[yAttr]))];
    legendData.sort()
    
    // transform data to a more suitable table-like structure in JSON format
    let data = []
    if(this.props.data.length > 0) {
      // intitial data rows to the number of bins
      data = Array(this.props.data[0].count.length).fill({})
      // for each target class ( 0 & 1 for binary) create a column 
      // and set the cell values
      for(var i = 0; i < this.props.data.length; i++) {
        const targetClass = this.props.data[i][yAttr]
        const counts = this.props.data[i].count
        const division = this.props.data[i].division
        // for each bin store the count in a table cell
        for(var j = 0; j < division.length-1; j++) {
          data[j] = {
            ...data[j],
            // store bin edges for each bin (identical for all target classes)
            x0: division[j],
            x1: division[j+1],
            // use the target class as column name and the count as its value for the bin
            [targetClass]: counts[j]
          }
          // track the max bin count for setting up the scale
          yMax = d3.max([counts[j], yMax])
        }
      }
      
      if(this.state.yScType == "Prob."){
        yMax = 1
        for(var i = 0; i < data.length; i++) {
          const total = legendData.reduce(
            (previousValue, currentValue) => {
              return previousValue + data[i][currentValue]
            }, 0 );
          
          for(var j = 0; j < legendData.length; j++) {
            data[i] = {
              ...data[i],
              [legendData[j]]: data[i][legendData[j]]/total
            }
          }
        }
      }
    }
    
    const xAx = xScale(this.props.width, this.props.padding, this.props.data[0].division)
    const yAx = this.state.yScType == "Log" 
                ? yScaleLog(this.props.height, this.props.padding, yMax)
                : yScale(this.props.height, this.props.padding, yMax)    
    
    let filter = this.props.filter
    filter.sort(d3.ascending) // Ensure that filter is sorted so that x1 <= x2   
    const x1 = d3.max([xAx(filter[0]), this.props.padding]) // clamp to min x-position
    const x2 = d3.min([xAx(filter[1]), this.props.width-this.props.padding]) // clamp to max x-position
    
    return (
        <div style={{display: "block", textAlign: "center"}}>

          <select 
            className="metaSelect" 
            value={this.state.yScType}  
            style={{
              position: "absolute",  
              width: 60, 
              top: this.props.padding-22, 
              fontSize: 12, 
              fontWeight: "bold", 
              border: "none" 
            }}
            onChange={this.onYScaleChanged.bind(this)}
            >
            {["Count", "Prob.", "Log"].map(renderOption())}
          </select>

          <ContextMenuTrigger id="svg_context_menu" renderTag="div" tagClass={'.binaryHisto'} name={`${this.props.X} vs ${this.props.Y}`} collect={collectChart}>
          <svg className='binaryHisto' width={this.props.width} height={this.props.height}>       
            {data.map(renderBars(xAx, yAx, legendData))}
            {legendData.map(renderLegend(this.props.width, this.props.padding))}
            <rect x={x1} y={this.props.padding} width={x2-x1}
              height={this.props.height-2*this.props.padding}
              fill={"#b3b3b3"}
              opacity={0.25} />
            <line x1={x1} y1={this.props.padding}
              x2={x1} y2={this.props.height-this.props.padding}
              stroke={"#000000"}
              strokeDasharray={"5, 5"} />
            <line x1={x2} y1={this.props.padding} x2={x2}
              y2={this.props.height-this.props.padding}
              stroke={"#000000"}
              strokeDasharray={"5, 5"} /> 

            <XYAxis {...this.props} xScale={xAx} yScale={yAx} X={this.props.X} Y={null} txtFontSize={12}/>           
          </svg>        
          </ContextMenuTrigger>
        </div>
    );
  }
}
