import React from 'react';
import { TransformControl } from './control/TransformControl';
import "../../../../css/Core.css"

const TRANSFORMS = {
  Index: [],
  Numerical: ["Filter", "Clamp", "Norm", "Log", "Custom"],
  Nominal: ["FilterNom", "Repl", "OHE", "Rank", "CellSplit", "Custom"],
  Ordinal: ["FilterNom", "Repl", "OHE", "Custom"],
  DateTime: ["Filter"]
}

const TRANSFORMSNAMES = {
  Filter: "Filter",
  Clamp: "Clamp",
  Norm: "Normalize",
  Log: "Log",
  Custom: "Custom",
  Repl: "Replace",
  OHE: "One-Hot Encode", 
  FilterNom: "Filter",
  Rank: "Rank",
  CellSplit: "Cell Split",
}

 /**
   * Renders the list of available transform options 
   * based on the current attribute type
   * @param {string} selected - The selected transform.
   * @param {function} onSelect - Function that handles selecting a transform type
   */
const renderTransformOptions = (selected, onSelect) => {
  return (d, index) => {  
    return <button 
            className="coreButtonTab" 
            key={"multi-tx-"+index}
            style={{background: selected==d ? "#383838" : null}} 
            onClick={() => onSelect(d)}>
              {TRANSFORMSNAMES[d]}
          </button>
  };
};

export function AttributeTransforms(props) {
  // Don't show transformations if column has all nans
  if(props.dataCount == props.description.countMiss){
    return null
  }

  return (
    <div>
      <div className='transformControlBox'>
          <TransformControl 
            tType={props.transformType}
            name={props.description.name}
            {...props}
          />
      </div>
      <div className='transformButtonBox'>
      {
        TRANSFORMS[props.description.type].map(
          renderTransformOptions(props.transformType, props.setTransformType)) 
      }
      </div>
    </div>
  );  
}

export default AttributeTransforms;
