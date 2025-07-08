import React, { useState } from 'react';

import { useInfoToastContext } from '../../../../common/components/InfoToastContext';

const MISSINGOPTS  =  {
  Index: [],
  Numerical: ["Drop", "Zero", "Mean", "Interpolate", "Pad"],
  Nominal: ["Drop", "Zero", "Replace"],
  Ordinal: ["Drop", "Replace"],  
}
/** Component which renders the nominal ranking control panel. */
export function MissingNotification(props) {
  if(!props.hasMiss){
    return null
  }

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();

  const { dType, missingCount, dataCount, onChangeReplacement } = props;

  // Set up state variables
  const [showOptions, setShowOptions] = useState(false);
  const toggleShowOptions = () => setShowOptions(!showOptions)

  // The method to replace missing values
  const [missType, setMissType] = useState("Drop");  

  // The value that will replace missing values when the method is replace
  const [replaceVal, setReplaceVal] = useState("");
  const onChangeReplaceVal = (evt) => setReplaceVal(evt.target.value)
  
  // Notification message
  const misingText = "Missing values present ( " 
    +  (100*(missingCount / dataCount)).toFixed(2)
    +  "% )."  

  /**
   * Applies the selected missing value method
   */
  const onApply = () => {
    if(missType == "Replace"){
      if(replaceVal.length < 1) {
        addInfoToast("Replace value cannot be empty.", 'danger')
      }
      else{
        onChangeReplacement({
          tType: missType,
          replaceVal: replaceVal,
        })
      }
    }
    else{
      onChangeReplacement(missType)
    }
  }

  return (
    <div className="listInnerItem">
      <div style={{ display: "inline-block", margin: 10, verticalAlign: "middle", cursor:"default"}}>
        <i className="material-icons-round" style={{position: "absolute", color: "#000000"}}>
          warning_amber
        </i>
        <i className="material-icons-round" style={{color: "#ebfb00"}}>
          warning
        </i>
      </div>
      <label className="listLabel">{misingText}</label>
      {
        missingCount != dataCount
        ?  <button
            className="coreButton" 
            style={{position: "absolute", right: 5, margin: 10}} 
            onClick={toggleShowOptions}>
              {"Resolve"}
          </button>
        : null
      }
      {
        showOptions && missingCount != dataCount
        ? <div>
            <label className="listLabel">{"Imputation: "}</label>
            {
              MISSINGOPTS[dType].map((d, idx) => (
                <div
                  key={"missingNot-" + idx}
                  style={{display: "inline-block"}}>
                    <button 
                      className="coreButtonSmall"
                      style={{background: missType == d ? "#383838" : "#727275"}}
                      onClick={() => setMissType(d)}>
                        {d}
                    </button>
                    { // Only show text box when method is "Replace"
                      missType == "Replace" && d == "Replace"
                      ? <input 
                          type="text" 
                          className="coreTextInput"  
                          value={replaceVal} 
                          style={{width: 125}}
                          onChange={onChangeReplaceVal}
                        />
                      : null
                    }
                  </div>
              ))
            } 
            <button 
              className="coreButton" 
              style={{display: "block", margin: "12px auto"}}
              onClick={onApply}>
                {"Apply"}
            </button>                                                                  
          </div>
        : null
      }
    </div>
  );
}

export default MissingNotification; 