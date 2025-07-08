import React, { useState, useEffect } from 'react';
import * as d3 from "d3";
import "./css/GroupDetail.css"


const xScale = (width, data, X) => {
  return d3.scaleLinear()   
    .domain([0, d3.max(data, function(d) { return Math.abs(+d[X]) })])
    .range([0, width]);
};

/* Creates text for the Group Detail attribute contraints (continuous). */
const textStringNum = (attr, lb, ub, abbrv=true) => {
  let text = "";
  if (lb != "-inf") {
    text += (+lb).toFixed(2)+" <= ";
  }
  
  text += abbrv ? attr.substr(0, 10) : attr;
  
  if (ub != "inf") {
    text += " <= " + (+ub).toFixed(2);
  }
  return text;
};


/**
 * Creates the label for the a categorical group attribute.
 * @param {string} attr - Categorical group attribute name.
 * @param {list} levels - Defining set of attribute levels.
 * @param {bool} abbrv - If true, abbreviate long string names.
 * @returns {string} The label for the categorical group attribute.
 */
const textStringCat = (attr, levels, abbrv=true) => {
  let text = (abbrv ? attr.substr(0, 10) : attr);

  let setText = levels.reduce((acc, val, idx)=>{
    if (idx == 0) return `${val}`
    return `${acc}, ${val}`
  }, '');

  if (abbrv)
    setText = setText.substr(0,15) + ((setText.length > 30) ? "..." : "");

  return text + " in " + "[" + setText + "]";
};

const renderFeature = (width, sc, selectedIdx, onSelect, selectedFilters, catLabels, onSelectFilter) => {
  return (d, index) => {

    let text = (d.attribute in catLabels
		? textStringCat(d.attribute, d.range)
		: textStringNum(d.attribute, d.range[0], d.range[1]));

    let tooltipText = (d.attribute in catLabels
		       ? textStringCat(d.attribute, d.range, /*abbrv=*/false)
		       : textStringNum(d.attribute, d.range[0], d.range[1], /*abbrv=*/false));

    const divStyle = {
      width: width,
      height: 20,
      padding: 5,
      marginBottom: 5,
      border: "1px #000000 solid",
      boxSizing: 'unset'
    }

    const labelStyle = {
      position : "absolute",
      width: 200,
      height: 18,      
      marginTop: 2,      
      fontSize: 13,
      textOverflow: "ellipsis",
      overflow: "hidden", 
      whiteSpace: "nowrap"
    }

    const shapStyle = {
      position : "absolute",
      left: 310,
      width: sc(Math.abs(+d.shap)),
      height: 12,
      marginTop: 4,      
      background: "#009a5e"    
    }

    const shapLabelStyle = {
      position : "absolute",                       
      marginTop: 4,      
      fontSize: 11,
      left: shapStyle.left + shapStyle.width + 5,
      color: "#009a5e" 
    }

    if(+d.shap < 0){
      shapStyle.left -=  sc(Math.abs(+d.shap))
      shapStyle.background = "#ce3f3f"
      shapLabelStyle.left = shapStyle.left -30
      shapLabelStyle.color = "#ce3f3f"
    } 

    if(index == selectedIdx){
      divStyle.background="#d0d0d0"
    }

    return(
      <div key={"detail-"+index} className='detFeatureItem'>
        <div className='detFeatureContent'
          style={{background: index == selectedIdx ? "#d0d0d0": null}}
          onClick={() => onSelect(index, selectedFilters)} title={tooltipText}>
          <label style={labelStyle}>{text}</label>
          <div style={shapStyle} />
          <label style={shapLabelStyle}>{(+d.shap).toFixed(2)}</label>        
        </div>
        <input 
          type="checkbox" 
          style={{verticalAlign: "middle"}}
          checked={selectedFilters[index]} 
          onChange={() => onSelectFilter(index)}
        />
      </div>
    )
  }
}

export default function GroupDetailFeatures(props) { 
  const { width, data, selectedIdx, catLabels } = props
  const { onSelect } = props
  
  const [ selectedFilters, setSelectedFilters ] = useState(data.map(() => { return false } ))

  useEffect(() => {        
    setSelectedFilters(data.map(() => { return false } ))      
  }, [data, setSelectedFilters])

  const onSelectFilter = (item) => {    
    let filt = [...selectedFilters]
    filt[+item] =  !filt[+item]
    setSelectedFilters(filt);
    onSelect(selectedIdx, filt)
  }

  let sc = xScale(100, data, "shap" )
  return (
    <div className='detFeatureBox'>            
      {data.map(renderFeature(width-50, sc, selectedIdx, onSelect, selectedFilters, catLabels, onSelectFilter))}
    </div>
  );
}
