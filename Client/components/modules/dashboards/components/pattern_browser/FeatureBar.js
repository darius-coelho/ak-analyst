import React from 'react';
import * as d3 from "d3";
import { Transition } from 'react-transition-group'

import "../../../../css/Core.css"
import "../../../../css/Charts.css"

const duration = 300;

const defaultStyle = {
  transition: `opacity ${duration}ms ease-in-out, width ${duration}ms ease-in-out, y ${duration}ms ease-in-out, fill ${duration}ms ease-in-out`,
  opacity: 0,
  display: 'inline-block',
}

const transitionStyles = {
  entering: { opacity: 0},
  entered: { opacity: 1},
  exiting: { opacity: 1},
  exited: { opacity: 0},
};

const xScale = (width, padding, data, X) => {
  return d3.scaleLinear()    
    .domain([0, d3.max(data, function(d) { return +d[X] })])
    .range([0, width - 2*padding]);
};

const renderRects = (padding, left, xAx, X, Y, selectedAttr, onSelect, patternImp) => {
  return (d, index) => {
    const rectProps = {
      x:  padding + left,
      y: padding + index*15,
      width: xAx(+d[X]),
      height: 10,
    }

    const textProps = {
      x: padding + left - 4,
      y: padding + index*15 + 8,
      width: left - 5 - padding,
      textAnchor:"end",
      fontSize: 12,
    };  

    var labelText = d[Y] + " :"
    if(d[Y].length > 15){
      labelText = d[Y].slice(0, 12) + "... :"
    }

    if(selectedAttr == d[Y]){
      rectProps.stroke = "#1561a8" 
      rectProps.strokeWidth = 2
    }
    var patternRect = null
    for(var i=0; i < patternImp.length; i++){
      if(patternImp[i]["label"]==d[Y]){
        var val = patternImp[i]["value"]
        var newWidth = xAx(+patternImp[i]["value"])
        patternRect =  <Transition key={index} in={true} timeout={duration} appear={true}>
                        {(state) => (
                          <rect className="dataItem" {...rectProps} width={newWidth} style={{
                            ...defaultStyle,
                            ...transitionStyles[state]
                          }}>
                            <title>{d[Y] + ": " + val}</title>
                          </rect>
                          )}
                        </Transition>;
      }
    }
    
    

    return <g key={index} onClick={() => onSelect(d[Y])}>
            <text {...textProps}>
              <title>{d[Y]}</title>{labelText}
            </text>
            <rect className="dataContextItem" {...rectProps} >
              <title>{d[Y] + ": " + d[X]}</title>
            </rect>;
            {patternRect}
           </g>
  };
};

export default class FeatureBar extends React.Component {
  
  onSelect(attribute){    
    this.props.onChangeSelected(attribute)
  }

  render() {
    if(this.props.data.length < 1) {
      return <div className="placeholderText">Select a target variable and click mine patterns</div>
    }

    var patternScores = []
    if(this.props.selectedPatternIdx != null){         
      var description = this.props.patterns
      var summary = this.props.summary
      patternScores = this.props.data.map((fs)=>{
        const label = fs.attribute;  
        const statsArray = description[label].stats.filter((dat, index)=> {
          return index == this.props.selectedPatternIdx;
        });
        
        let shapAgg = 0;
        for (const stats of statsArray) {
          let shap = 0;          
          // check that the pattern is significant
          if (stats.es != "nan" && +stats.pval < 0.05 && +stats.size > 20) {
            shap = Math.abs(+(stats.shap.find((dat)=>dat.attribute===label).shap));
          }
          shapAgg += (shap * ((+stats.size) / (+summary.size)));
        } // end for stats

	if (+fs.raw_score === 0) {
	  return {'label': label, 'value': 0.0};
	}
	
        const value = (shapAgg / (+fs.raw_score)) * (+fs.score);
        return {'label': label, 'value': value};
      })
    }

    var left = 100
    var xAx= xScale(this.props.width-left-15,		    
		    this.props.padding,
		    this.props.data,
		    this.props.X); //Axis scale
    
    var height = this.props.data.length*15 + 2*this.props.padding
    var legendElementStyle = { display:"inline-block", height: 10, fontSize: 12, float:"right"}
    return (
        <div>
          <div style={{width: this.props.width - 5, height: 25, marginTop: 20}}>            
            <label style={{...legendElementStyle, marginLeft: 5, marginRight: 15}}>Selected</label>
            <div style={{...legendElementStyle, background: "#1561a8", width: 10, marginLeft: 10, marginTop: 3}}></div>
            <label style={{...legendElementStyle, marginLeft: 5}}>Global</label>
            <div style={{...legendElementStyle, background: "#b3b3b3", width: 10, marginTop: 3}}></div>
          </div>
          <div style={{width: this.props.width - 5, height: this.props.height - 50, overflowY: "auto"}}>
            <svg width={this.props.width-15} height={height}>
              {this.props.data.map(
                renderRects(
                  this.props.padding, 
                  left, 
                  xAx, 
                  this.props.X, 
                  this.props.Y, 
                  this.props.selectedAttr, 
                  this.onSelect.bind(this), 
                  patternScores
                )
              )}
            </svg>
          </div>
        </div>
        
    );
  }
}
