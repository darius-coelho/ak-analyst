import React, { useState, useEffect } from 'react';
import { useInfoToastContext } from '../../../../common/components/InfoToastContext';

const OPTIONS = {
  All: ["Drop", "Zero"],
  Numerical: ["Drop", "Zero", "Mean", "Interpolate", "Pad"],
  Nominal: ["Drop", "Zero", "Replace"]
}

/** Renders the control panel for replacing missing values. */
export function MissingControl(props) {
  const { dType } = props

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();
  
  // Set up state variables
  const [type, setType] = useState("Drop");    

  const [replaceVal, setReplaceVal] = useState("");
  const onChangeReplaceVal = (evt) => setReplaceVal(evt.target.value)

  /**
   * Updates the state variables when the props change
   * type is reinitialized when the data type changes
   */
  useEffect(() => {        
    setType("Drop")      
  }, [props.dType, setType])
 
  /**
   * Constructs the transfrom object from current state
   * and calls the transfrom function.   
   */
  const onApply = () => {
    if(type=="Replace" && replaceVal.length < 1) {      
      addInfoToast("Replace value cannot be empty.", 'danger')
    }
    else {
      let transform = {
        tType: props.tType, 
        method: type,
        replaceVal: replaceVal.length > 0 ? replaceVal : null,
      }
      if(type == "Drop"){
        transform.tType = "Missing-" + type
      }
      props.onTransform(transform)
    }
  }
  
  return (
      <div style={{display: "block"}} >
        <label className="listLabel">{"Imputation: "}</label>
        {
          OPTIONS[dType].map((d,i) => {            
            return <div 
                    key={'MissingControl-'+i}
                    style={{display: "inline-block"}}>
                      <div 
                        className="attributeTypeOption"                     
                        style={{background: type == d ? "#86c7ff" : "#e8e8e8"}}
                        onClick={() => setType(d)} >
                          {d}
                      </div>
                      { // Only show text box when method is "Replace"
                        type == "Replace" && d == "Replace"
                        ? <input 
                            type="text" 
                            className="coreTextInput"  
                            value={replaceVal} 
                            style={{width: 125}}
                            onChange={onChangeReplaceVal} />
                        : null
                      }
                  </div>
          })
        }                     
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

export default MissingControl;
