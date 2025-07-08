import React from 'react';
import BoxPlot from '../../../charts/components/BoxPlot';
import CategoricalCountBar from './CategoricalCountBar'
import DensityHistogram from './DensityHistogram'

import "../../../../css/Charts.css"

/**
 * Renders the visual summary for an attribute. Histograms for numerical attributes.
 * Count bars for nominal attributes or box plots when ranking nominal attributes.
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
export function SummaryVisualization(props) {
  
  const { description, selectedCatsTmp, plotData, plotYAttr, nranks, 
    width, height, padding, onTransform } = props
  
  if(description.type == "Numerical" || description.type == "DateTime") {
    return( 
      <DensityHistogram
        counts={description.countPrev}
        border={description.divisionPrev}
        countsAll={description.countAll}
        borderAll={description.divisionAll}
        attr={description.name}
        type={description.type}
        width={width}
        height={height}
        padding={padding} />
    )
  }

  if(description.type == "Nominal") {
    if(plotData == null){
      return(
        <CategoricalCountBar 
          counts={description.count} 
          border={description.division}  
          countsAll={description.countAll}
          borderAll={description.divisionAll}
          attr={description.name}
          type={description.type}
          selected={selectedCatsTmp}
          onTransform={onTransform}
          width={width}
          height={height}
          padding={20} />
      )
    }
    else{
      return(
        <BoxPlot
          data={plotData}
          xAttr={description.name}
          yAttr={plotYAttr}          
          nbins={nranks}
          width={width}
          height={height}
          padding={padding} />
      )
    }
  }

  if(description.type == "Ordinal") {
    return(
      <CategoricalCountBar
        counts={description.count}
        border={description.division}
        countsAll={description.countAll}
        borderAll={description.divisionAll}
        attr={description.name}
        type={description.type}
        selected={selectedCatsTmp}
        onTransform={onTransform}
        width={width}
        height={height}
        padding={20} />
    )
  }
  return null 
}


export default SummaryVisualization
