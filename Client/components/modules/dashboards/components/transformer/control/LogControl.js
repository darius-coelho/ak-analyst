import React, { useState } from 'react';

/** Renders the control panel for Log transforming Numerical attributes. */
export function LogControl(props) {

  // Set up state variables
  const [base, setBase] = useState(10);
  
  /**
   * Sets the user specified log base.
   * @param {object} evt - Event handler for tier input component.
   */
  const onBaseChange = (event) => { setBase(event.target.value); }

  /**
   * Constructs the transfrom object from current state
   * and calls the transfrom function.   
   */
  const onApply = () => {
    const transform = {
      tType: props.tType, 
      base: +base,      
    }
    props.onTransform(transform)
  }

  
  return (
      <div style={{display: "block"}} >
      <label style={{margin: 10, pad: 5}}>{"Base: "}</label>
      <input type="text" className="coreTextInput"  data-testid="log-base"
        value={base} onChange={onBaseChange} /> 
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

export default LogControl;
