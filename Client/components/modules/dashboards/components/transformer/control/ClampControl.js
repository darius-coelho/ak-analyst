import React, { useState, useEffect } from 'react';

/** Renders the control panel for clamping numerical attributes. */
export function ClampControl(props) {

  // Set up state variables
  const [clampMin, setClampMin] = useState(props.description.min.toFixed(2));  
  const [clampMax, setClampMax] = useState(props.description.max.toFixed(2));
  
  /**
   * Sets the clampMin to the user specified min.
   * @param {object} evt - Event handler for tier input component.
   */
  const onClampMinChange = (event) => { setClampMin(event.target.value); }
  
  /**
   * Sets the clampMin to the user specified max.
   * @param {object} evt - Event handler for tier input component.
   */
  const onClampMaxChange = (event) => { setClampMax(event.target.value); }  

  /**
   * Updates the state variables when the props change
   * clampMin and clampMax are changed to the attribute's min and max
   */
  useEffect(() => {    
    if(props.description.min != clampMin){
      setClampMin(props.description.min.toFixed(2))      
    }
    if(props.description.max != clampMax){
      setClampMax(props.description.max.toFixed(2))
    }
  }, [props.description.min, props.description.max, setClampMin, setClampMax])

  /**
   * Constructs the transfrom object from current state
   * and calls the transfrom function.   
   */
  const onApply = () => {
    const transform = {
      tType: props.tType, 
      lb: +clampMin,
      ub: +clampMax
    }
    props.onTransform(transform)
  }

  return (
      <div style={{display: "block"}} >
        <label style={{margin: 10, pad: 5}}>{"Clamp Min: "}</label>
        <input type="text" className="coreTextInput" data-testid="clamp-min"
         value={clampMin} onChange={onClampMinChange} />
      
        <label style={{margin: 10, pad: 5}}>{"Clamp Max: "}</label>
        <input type="text" className="coreTextInput" data-testid="clamp-max"
          value={clampMax} onChange={onClampMaxChange} /> 

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

export default ClampControl;
