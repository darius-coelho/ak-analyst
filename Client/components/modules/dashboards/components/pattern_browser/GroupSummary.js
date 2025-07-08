import React from 'react';
import * as d3 from "d3";
import * as d3Col from 'd3-scale-chromatic'
import "../../../../css/Core.css"

const xScale = (width, data, X) => {
  return d3.scaleLinear()   
    .domain([0, d3.max(data, function(d) { return Math.abs(+d[X]) })])
    .range([0, width]);
};

const renderRects = (padding, top, left, sc, X, Y, selectedAttr, onSelect) => {
  return (d, index) => {
    
    const textProps = {
      x: padding + left - 20,
      y: padding + top + index*20 + 8,
      width: left - 5 - padding,
      textAnchor:"end",
      fontSize: 12,
    };  

    var labelText = d[Y] + " :"
    if(d[Y].length > 15){
      labelText = d[Y].slice(0, 12) + "... :"
    }

    if(selectedAttr == d[Y]){
      textProps.color = "#ff0000"
    }

    const rectProps = {      
      y: padding + top + index*20,
      width: 50,
      height: 10,
      stroke: "#b3b3b3",
      strokeWidth: 1
    }

    const shapRectProps = {      
      y: padding + top + index*20,      
      x: left + 20 + 260 + 0.5,
      width: sc(Math.abs(+d[X])),
      height: 10,
      fill: "#009a5e",
    }
    const shapTextProps = {      
      y: padding + top + index*20 + 9,      
      x: left + 20 + 260 + 0.5 + sc(Math.abs(+d[X])) + 5,
      fontSize: 11,
      fill: "#009a5e",
    }

    if(+d[X] < 0){
      shapRectProps.x = left + 20 + 260 -0.5 - sc(Math.abs(+d[X])) 
      shapRectProps.fill = "#ce3f3f"

      shapTextProps.x = left + 20 + 260 -0.5 - sc(Math.abs(+d[X])) - 5
      shapTextProps.textAnchor = "end"
      shapTextProps.fill = "#ce3f3f"
    }

    if ('low' in d) {  // The attribute is numerical
      return (
        <g key={index} onClick={() => onSelect(d[Y])}>
          <text {...textProps}><title>{d[Y]}</title>{labelText}</text>
          <text {...textProps} x={padding + left - 8} textAnchor={'middle'}>(N)</text>          
          <rect {...rectProps} x={left + 20} fill={d3Col.interpolateBlues(+d["low"])}>
            <title>{(+d["low"]*100).toFixed(2) + "% of data items"}</title>
          </rect>
          <rect {...rectProps} x={left + 20 + 60} fill={d3Col.interpolateBlues(+d["med"])}>
            <title>{(+d["med"]*100).toFixed(2) + "% of data items"}</title>
          </rect>
          <rect {...rectProps} x={left + 20 + 120} fill={d3Col.interpolateBlues(+d["high"])}>
            <title>{(+d["high"]*100).toFixed(2) + "% of data items"}</title>
          </rect>
    
          <rect {...shapRectProps}></rect>
          <text {...shapTextProps}>{(+d[X]).toFixed(2)}</text>
        </g>
      );
    }

    // the attribute is categorical
    return (
      <g key={index} onClick={() => onSelect(d[Y])}>
        <text {...textProps}><title>{d[Y]}</title>{labelText}</text>
        <text {...textProps} x={padding + left - 8} textAnchor={'middle'}>(C)</text>
        
        <rect {...rectProps} x={left + 20} fill={d3Col.interpolateBlues(+d.first.perc)}>
          <title>{d.first.level}: {(100*(+d.first.perc)).toFixed(2) + "% of data items"}</title>
        </rect>
        
        <rect {...rectProps} x={left + 20 + 60} fill={d3Col.interpolateBlues(+d.second.perc)}>
          <title>{d.second.level}: {(100*(+d.second.perc)).toFixed(2) + "% of data items"}</title>
        </rect>
        
        <rect {...rectProps} x={left + 20 + 120} fill={d3Col.interpolateBlues(+d.other.perc)}>
          <title>{d.other.level}: {(100*(+d.other.perc)).toFixed(2) + "% of data items"}</title>
        </rect>
                
        <rect {...shapRectProps}></rect>
        <text {...shapTextProps}>{(+d[X]).toFixed(2)}</text>
      </g>
    );
  };
};

export default class GroupSummary extends React.Component {
  
  onSelect(attribute){    
    this.props.onChangeSelected(attribute)
  }

  render() {
    if(this.props.data.length < 1) {
      return <div className="placeholderText">Select a group from the <span style={{fontWeight:"bold"}}>Group Plot</span> tile on the left.</div> 
    }
    
    var left = 100    
    var top = 70

    const height = this.props.height - 100;
    
    // Total number of attributes to include in the summary
    const dataLen = this.props.data.length;
    const rootLen = this.props.root.length;
    const totalLen = this.props.data.length + this.props.root.length;

    const rootHeight = rootLen * 20 + 2 * this.props.padding;
    const dataHeight = dataLen * 20 + 2 * this.props.padding;

    const attrHeaderHt = 20;  // Height for the Core / Other Attributes txt
    
    // Cap the root to taking up 1/3 the height
    const divRootHeight = Math.min(rootHeight, (height/3) - attrHeaderHt);    
    const divDataHeight = Math.min(dataHeight, height - divRootHeight - attrHeaderHt - this.props.padding);
    
    const sc = xScale(50, this.props.root.concat(this.props.data), "shap");
    const EffectOntxt = "Effect on " + this.props.target   
    
    return (
      <div style={{overflowX: "auto", overflowY: "hidden", textAlign: "center", display: "inline-block", width: "100%"}}>
          <div style={{display: "inline-block"}}>
          <svg width={left + 400} height={100}>            
            <defs>
              <linearGradient id="summaryGradient">
                <stop offset="0%" style={{stopColor: "white", stopOpacity: 1}}></stop>
                <stop offset="100%" style={{stopColor: "steelblue", stopOpacity: 1}}></stop>
              </linearGradient>
            </defs>

            <text x={40} y={this.props.padding + 10 - 2} fontSize={13} textAnchor={"start"}># Points:</text>
            <rect x={left + 45 + 60 - 70} y={this.props.padding + 10 - 14} width={140} height={14} fill={"url(#summaryGradient)"}></rect>
            <text x={left + 45 + 60 - 70 - 5} y={this.props.padding + 8} fontSize={11} textAnchor={"end"}>Few</text>
            <text x={left + 45 + 60 + 70 + 5} y={this.props.padding + 8} fontSize={11} textAnchor={"start"}>Many</text>

            <text x={left + 45 + 60} y={this.props.padding + top -30} fontSize={13} textAnchor={"middle"}>Attribute Range</text>
            <line x1={left + 20} y1={this.props.padding + top - 25} x2={left + 70 + 120} y2={this.props.padding + top - 25} stroke="#0d0d0d" strokeWidth={0.5}/>
              
            <text x={left + 7} y={this.props.padding + top - 10} fontSize={12} textAnchor={"middle"}><title>Numerical</title>N</text>
            <text x={left + 45} y={this.props.padding + top - 10} fontSize={12} textAnchor={"middle"}>Low</text>
            <text x={left + 45 + 60} y={this.props.padding + top - 10} fontSize={12} textAnchor={"middle"}>Medium</text>
            <text x={left + 45 + 120} y={this.props.padding + top - 10} fontSize={12} textAnchor={"middle"}>High</text>

            <text x={left + 7} y={this.props.padding + top + 10} fontSize={12} textAnchor={"middle"}><title>Categorical</title>C</text>
	          <text x={left + 45} y={this.props.padding + top + 10} fontSize={12} textAnchor={"middle"}>Rank 1</text>
            <text x={left + 45 + 60} y={this.props.padding + top + 10} fontSize={12} textAnchor={"middle"}>Rank 2</text>
            <text x={left + 45 + 120} y={this.props.padding + top + 10} fontSize={12} textAnchor={"middle"}>Other</text>
	
            <text x={left + 20 + 260} y={this.props.padding + top - 10} fontSize={12} textAnchor={"middle"}>{EffectOntxt}</text>          
          </svg>
        </div>
        
        <div style={{width: left + 400, height: height - 5, display: "inline-block"}}>
          <div>
            <svg width={left + 400} height={attrHeaderHt}>
              <text x={this.props.padding} y={10} fontSize={12} style={{opacity: 0.75, fontWeight: 'bold'}}>Core Attributes</text>
              <line x1={15} y1={12} x2={left + 400 - 30} y2={12} stroke="#0d0d0d" strokeWidth={0.5}/>
            </svg>
          </div>
          <div style={{width: left + 400, height: divRootHeight, overflowX: "hidden", overflowY: "auto"}}>
            <svg width={left + 400} height={rootHeight}>                   
              <line x1={left + 20 + 260} y1={this.props.padding - 5} x2={left + 20 + 260} y2={rootLen*20 + this.props.padding - 5} stroke="#afafaf" strokeWidth={0.5}/>
              {this.props.root.map(renderRects(
                this.props.padding, -10, left, sc, "shap", this.props.Y, this.props.selectedAttr, this.onSelect.bind(this)
              ))}   
            </svg>
          </div>
          <div>
            <svg width={left + 400} height={attrHeaderHt}>
              <text x={this.props.padding} y={10} fontSize={12} style={{opacity: 0.75, fontWeight: 'bold'}}>Other Attributes</text>
              <line x1={15} y1={12} x2={left + 400 - 30} y2={12} stroke="#0d0d0d" strokeWidth={0.5}/>
            </svg>
          </div>
          <div style={{width: left + 400, height: divDataHeight, overflowX: "hidden", overflowY: "auto"}}>        	
            <svg width={left + 400} height={dataHeight}>
              <line x1={left + 20 + 260} y1={this.props.padding - 5} x2={left + 20 + 260} y2={dataLen*20 + this.props.padding - 5} stroke="#afafaf" strokeWidth={0.5}/>	      	     
              {this.props.data.map(renderRects(
                this.props.padding, -10, left, sc, "shap", this.props.Y, this.props.selectedAttr, this.onSelect.bind(this)
              ))}       
            </svg>
          </div>
        </div>
      </div>             
    );
  }
}
