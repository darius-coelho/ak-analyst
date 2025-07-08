import React, { useState } from 'react';

/** Renders the control panel for normalizing Numerical attributes. */
export function NormControl(props) {

  // Set up state variables
  const [normLb, setNormLb] = useState(0);  
  const [normUb, setNormUb] = useState(1);

  /**
   * Sets the normalization lower bound to the user specified lower bound.
   * @param {object} evt - Event handler for tier input component.
   */
  const onNormLbChange = (event) => { setNormLb(event.target.value); }

  /**
   * Sets the normalization upper bound to the user specified upper bound.
   * @param {object} evt - Event handler for tier input component.
   */
  const onNormUbChange = (event) => { setNormUb(event.target.value); } 

  /**
   * Constructs the transfrom object from current state
   * and calls the transfrom function.   
   */
  const onApply = () => {
    const transform = {
      tType: props.tType, 
      newmin: +normLb,
      newmax: +normUb
    }
    props.onTransform(transform)
  }
  
  return (
      <div style={{display: "block"}} >
        <label style={{margin: 10, pad: 5}}>{"Lower Bound: "}</label>
        <input type="text" className="coreTextInput"  data-testid="norm-lb"
         value={normLb} onChange={onNormLbChange} />
      
        <label style={{margin: 10, pad: 5}}>{"Upper Bound: "}</label>
        <input type="text" className="coreTextInput"  data-testid="norm-ub"
          value={normUb} onChange={onNormUbChange} /> 
        
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

export default NormControl;
