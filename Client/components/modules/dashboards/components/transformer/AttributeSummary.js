import React from 'react';
import { ContextMenu, MenuItem } from "react-contextmenu";

import SummaryStats from './SummaryStats'
import SummaryVisualization from './SummaryVisualization'

import { downloadChart } from '../../../common/components/downloadChart';

import "../../../../css/Charts.css"

/**
 * Renders a summary of an attrbute i.e. the numerical summary stats 
 * and the visual histogram/category counts.
 * @param {object} description - The description of an atttribute as recieved from the backend transformer.
 * @param {array} selectedCatsTmp - A list of temporarily selected categories to be visualized when filtering/replacing.
 * @param {array} plotData - The boxplot data resulting from a rank transform to a nominal attribute.
 * @param {string} plotYAttr - The y attribute bound to the a nominal attribute in the rank transform.
 * @param {number} nranks - The number of ranks when applying a rank transform to a nominal attribute.
 * @param {number} width - Width in pixels for the visual representation.
 * @param {number} height - Height in pixels for the visual representation.
 * @param {number} padding - Padding in pixels for the visual representation.
 * @param {function} onTransform - The function that will call the transfromer api to apply a transform.
 */
export function AttributeSummary(props) {  
  const { description, selectedCatsTmp, plotData, plotYAttr, nranks, 
    width, height, padding, onTransform } = props
  
  if(props.dataCount == props.description.countMiss){
    const divStyle = {
      display: "table-cell",
      width: width, 
      height: height, 
      verticalAlign: "middle"
    }
    return(
      <div style={divStyle}>
        <div className="placeholderText">
          All values are NaN. Try converting to another data type or drop the column.
        </div>
      </div>
    )    
  }

  const onDownloadChart = (e, data) => {      
    const fname = `${data.name}.png`
    downloadChart(2, fname, data.tagClass)
  }
  
  return(
    <div>
      <ContextMenu id="svg_context_menu">
        <MenuItem onClick={onDownloadChart}>
          Save
        </MenuItem>
        <MenuItem>
          Cancel
        </MenuItem>
      </ContextMenu>

      <SummaryStats 
        description={description} />                    
      <SummaryVisualization
        description={description}
        selectedCatsTmp={selectedCatsTmp}
        plotData={plotData}
        plotYAttr={plotYAttr}
        nranks={nranks}
        onTransform={onTransform}
        width={width}
        height={height}
        padding={padding} />
    </div>
  ) 
}


export default AttributeSummary