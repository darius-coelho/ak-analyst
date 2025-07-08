import React, { useState, useEffect } from 'react';
import ScatterPlot from './ScatterPlot';


/**
* Renders the list of visualizations for each causal link
* @param {object} style - css style for the box holding the visualization list
* @param {array} data - The data preview
* @param {array} edges - List of edges in the causal graph
* @param {Object} types - Mapping of columns names to their type
*/
export function VisualizationList(props) {
  const { style, edges, data, types, focusNode, focusEdge } = props
  
  const divStyle = {
    position: "absolute",
    width: "calc(100% - 10px)",
    height: "calc(100% - 45px)",
    overflowX: 'auto',
    overflowY: 'hidden',
    margin: 3,
    whiteSpace: "nowrap"
  }

  let selectedEdges = edges
  if(focusNode !== null){
    selectedEdges = edges.filter((d,i) => d.sourceAttr == focusNode || d.targetAttr == focusNode)
  }

  if(focusEdge !== null){
    selectedEdges = [edges[focusEdge]]
  }
  
  return (
    <div className="contentdiv" style={{...style}}>
      <label className="contentDivHead" title={"Visualizations"}>Visualizations</label>
      <div style={divStyle}>
      {
        selectedEdges.filter(d=>(d.sourceAttr in types) && (d.targetAttr in types)).map((d,i) => 
          <ScatterPlot
            key={"scatter-"+d.sourceAttr+d.targetAttr+i}
            data={data}
            X={d.sourceAttr}
            XType={types[d.sourceAttr]}
            Y={d.targetAttr}
            YType={types[d.targetAttr]}        
            width={300}
            height={300}
            padding={60}
          />
        )
      }
      </div>
    </div>
  )
}

export default VisualizationList;
