import React from 'react';
import { abbreviateNumber } from '../../../utilities/utilities'

import "./css/Transformer.css"

/**
 * Renders the numerical summary stats for an attribute.
 * @param {object} description - The description of an atttribute as recieved from the backend transformer.
 */
export function SummaryStats(props) {
  if(props.description.type == "Numerical"){
      return(
        <div className='transformerSummaryStatBox'>
          <div className="transformerSummaryStatCell">
            <label className="transformerSummaryStatLabel">Min </label>
            <label className="transformerSummaryStatValue">{abbreviateNumber(+props.description.min, 1)}</label>
            </div>
            <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel" style={{}}>{"25%"} </label>
              <label className="transformerSummaryStatValue">{abbreviateNumber(+props.description["25%"], 1)}</label>
            </div>
            <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel">{"50%"}</label>
              <label className="transformerSummaryStatValue">{abbreviateNumber(+props.description["50%"], 1)}</label>
            </div>
            <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel">{ "75%" }</label>
              <label className="transformerSummaryStatValue">{abbreviateNumber(+props.description["75%"], 1)}</label>
            </div>
            <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel">{ "Max" }</label>
              <label className="transformerSummaryStatValue">{abbreviateNumber(+props.description.max, 1)}</label>
            </div>
            <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel">{ "Mean" }</label>
              <label className="transformerSummaryStatValue">{abbreviateNumber(+props.description.mean, 1)}</label>
            </div>
            <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel">{ "Std."}</label>
              <label className="transformerSummaryStatValue">{abbreviateNumber(+props.description.std, 1)}</label>
            </div>
        </div>
      )
    }
  if(props.description.type == "Nominal" || props.description.type == "Ordinal"){
      return(
          <div className='transformerSummaryStatBox'>
            <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel">{ "# Categories:" }</label>
              <label className="transformerSummaryStatValue">{abbreviateNumber(+props.description.card, 1)}</label>
            </div>
            <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel">{ "Min Count:" }</label>
              <label className="transformerSummaryStatValue">{abbreviateNumber(+props.description.min, 1)}</label>
            </div>
            <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel">{ "Max Count:" }</label>
              <label className="transformerSummaryStatValue">{abbreviateNumber(+props.description.max, 1)}</label>
            </div>
            <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel">{ "Mean Count:" }</label>
              <label className="transformerSummaryStatValue">{abbreviateNumber(+props.description.mean, 1)}</label>
            </div>
            <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel">{ "Std.:"}</label>
              <label className="transformerSummaryStatValue">{abbreviateNumber(+props.description.std, 1)}</label>
            </div>
          </div>
      )
  }

  if(props.description.type === "DateTime"){
      return(
          <div className='transformerSummaryStatBox'>
            <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel">{ "First:" }</label>
              <label className="transformerSummaryStatValue">{props.description.first}</label>
	    </div>

	    <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel">{ "Last:" }</label>
              <label className="transformerSummaryStatValue">{props.description.last}</label>
	    </div>

	    <div className="transformerSummaryStatCell">
              <label className="transformerSummaryStatLabel">{ "Unique:" }</label>
              <label className="transformerSummaryStatValue">{props.description.unique}</label>
	    </div>
	  
	  </div>
      )
  }
  return null
}


export default SummaryStats
