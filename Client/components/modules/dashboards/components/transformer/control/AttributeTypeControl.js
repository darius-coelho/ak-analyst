import React, { useState, useEffect } from 'react';
import "../css/Transformer.css"

const ATTRTYPES = ["Numerical", "Nominal", "Ordinal", "DateTime"]

export default function AttributeTypeSet(props) {
  const { type, onChangeType } = props

  return (
    <div>
      <label className='attrDetailLabel'>{"Type: "}</label>
      <div className='attrDetailBox'>
        {ATTRTYPES.map( d =>
          <div
            key={'type-'+d}
            className="attributeTypeOption"
            style={{background: type == d ? "#86c7ff" : "#e8e8e8"}}
            onClick={() => onChangeType(d)} >
              {d}
          </div>
        )}
      </div>
    </div>
  );
}

/** Renders the control panel for replacing missing values. */
export function AttributeTypeMultiControl(props) {

  // Set up state variables
  const [type, setType] = useState("");

  /**
   * Updates the state variables when the props change
   * type is reinitialized when the data type changes
   */
  useEffect(() => {
    setType(props.dType)
  }, [props.dType])

  /**
   * Constructs the transfrom object from current state
   * and calls the transfrom function.
   */
  const onApply = () => {
    let transform = {
      tType: props.tType,
      new_type: type,
    }
    props.onTransform(transform)
  }

  return (
      <div style={{display: "block"}} >
        <label className="listLabel">{"Type: "}</label>
        {ATTRTYPES.map(d =>
          <div
            key={'type-'+d}
            className="attributeTypeOption"
            style={{background: type == d ? "#86c7ff" : "#e8e8e8"}}
            onClick={() => setType(d)} >
              {d}
          </div>
        )}
        <input
          type="button"
          className="coreButton"
          style={{display: 'block', margin: "auto", marginTop: 20}}
          onClick={onApply}
          value={"Apply"}
        />
      </div>
  );
}
