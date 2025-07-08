import React from 'react';
import { scaleLinear, max } from "d3";

import "../../../../css/Core.css"
import "../../../../css/Charts.css"

const xScale = (width, padding, data, X) => {
  return scaleLinear()    
    .domain([0, max(data, function(d) { return +d[X] })])
    .range([0, width - 2*padding]);
};

/**
 * Renders the features bars
 * @param {Array} features - List of feature objects
 * @param {Array} highlightedFeatures - List of highligeted features
 * @param {function} onClickFeature - Handles clicking a bar
 * @param {string} X - The X attribute - feature importance value in this case
 * @param {string} Y - The Y attribute - feature name in this case
 * @param {int} left - The postion where the feature label ends and the feature bar begins
 * @param {int} xAx - Scaling fucntion for mapping the feature importance value to length in # pixels
 * @param {int} padding - The chart padding
 */
const RenderFeatures = ({features, highlightedFeatures, onClickFeature, shaps, padding, left, xAx, X, Y}) => {
  return features.map((d, index) => {
    const rectProps = {
      x:  padding + left,
      y: padding + index*15,
      width: xAx(+d[X]),
      height: 10,
      opacity: highlightedFeatures.length == 0 || highlightedFeatures.includes(d[Y]) ? 1 : 0.5
    }

    const textProps = {
      x: padding + left - 4,
      y: padding + index*15 + 8,
      width: left - 5 - padding,
      textAnchor:"end",
      fontSize: 12,
      opacity: highlightedFeatures.length == 0 || highlightedFeatures.includes(d[Y]) ? 1 : 0.5
    };  

    var labelText = d[Y] + " :"
    if(d[Y].length > 15){
      labelText = d[Y].slice(0, 12) + "... :"
    }

    // If a pattern is selected generate a feature importance bar for it
    const patternRect = shaps.hasOwnProperty(d[Y])
      ? <rect
          className="dataItem"
          {...rectProps}
          width={xAx(+d[X]*Math.abs(+shaps[d[Y]])/(+d.raw_score))}
        >
          <title>{d[Y] + ": " + shaps[Y]}</title>
        </rect>
      : null

    return <g key={index} onClick={() => onClickFeature(d[Y])} style={{cursor: "pointer"}}>
            <text {...textProps}>
              <title>{d[Y]}</title>{labelText}
            </text>
            <rect className="dataContextItem" {...rectProps} >
              <title>{d[Y] + ": " + d[X]}</title>
            </rect>
            {patternRect}
           </g>
  });
};

/**
 * Renders the features as a bar chart with features listed in decreasing order of importance
 * @param {Array} features - List of feature objects
 * @param {Array} highlightedFeatures - List of highligeted features
 * @param {json} selectedPattern - The indices and ID of the selected pattern
 * @param {Array} patternList - The list of pattern lists
 * @param {string} X - The X attribute - feature importance value in this case
 * @param {string} Y - The Y attribute - feature name in this case
 * @param {function} onClickFeature - Function to be executed when a feature is clicked
 * @param {int} width - The chart width
 * @param {int} height - The chart height
 * @param {int} padding - The chart padding
 */
const FeatureBar = (props) => {

  const { target, features, highlightedFeatures, selectedPattern, patternList, X, Y, onClickFeature, width, height, padding } = props  
    
  if(features[target].lengh < 1) {
    return <div className="placeholderText">Select a target variable and click mine patterns</div>
  }
  
  const left = 100
  const xAx= xScale( width - left - 15, padding, features[target], X); //Axis scale  
  const chartHeight = features[target].length*15 + 2*padding

  const legendElementStyle = { display:"inline-block", height: 10, fontSize: 12}
  const legendButtonStyle = { display:"inline-block", fontSize: 10, float: 'right', marginRight: 20, marginTop: 2}
  let shaps = {}
  if(selectedPattern !== null && selectedPattern.listID < patternList.length && selectedPattern.cardID < patternList[selectedPattern.listID].patterns.length){
    shaps = patternList[selectedPattern.listID].patterns[selectedPattern.cardID].shaps[target].reduce((acc, val)=>{
      return {
        ...acc,
        [val.attr]: val.shap
      }
    }, {})
  }

  function downloadFeatureScores(featureScores) {
    let csv = '';
  
    // Get the headers
    let headers = Object.keys(featureScores[0]);
    csv += headers.join(',') + '\n';
  
    // Add the data
    featureScores.forEach(function(row) {
      let data = headers.map(header => row[header]).join(',');
      csv += data + '\n';
    });

    console.log(csv)

    // Set loading flag when output ready	  
    var dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `features_for_${target}.csv`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  return (
    <div>
      <div style={{width: width - 5, height: 25, marginTop: 20}}>
        <div style={{...legendElementStyle, background: "#1561a8", width: 10, marginLeft: 30, marginTop: 3}} />
        <label style={{...legendElementStyle, marginRight: 5, marginLeft: 5}}>
          Selected
        </label>
        
        <div style={{...legendElementStyle, background: "#b3b3b3", width: 10, marginLeft: 10, marginTop: 3}}/>
        <label style={{...legendElementStyle, marginRight: 5, marginLeft: 5}}>
          Global
        </label>

        <button
          className="coreButtonSmall"
          onClick={() => downloadFeatureScores(features[target])}
          style={legendButtonStyle}>
            {"Export Feature Scores"}
        </button>
        
      </div>
      
      <div style={{width: width - 5, height: height - 50, overflowY: "auto"}}>
        <svg width={width-15} height={chartHeight}>
          <RenderFeatures
            features={features[target]}
            highlightedFeatures={highlightedFeatures}
            onClickFeature={onClickFeature}
            shaps={shaps}
            padding={padding}
            left={left}
            xAx={xAx}
            X={X}
            Y={Y}
          />
        </svg>
      </div>
    </div>        
  );  
}

export default FeatureBar;