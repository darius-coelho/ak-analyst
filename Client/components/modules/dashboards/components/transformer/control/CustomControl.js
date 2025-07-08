import React, { useState } from 'react';

/** Renders the control panel for Custom python transformations. */
export function CustomControl(props) {
  const { width, name, placeholder } = props;
  
  // Set up state variables
  const [customPy, setCustomPy] = useState("");

  /**
   * Sets the custom python-like code.
   * @param {object} evt - Event handler for tier input component.
   */
  const onCustomChange = (event) => { setCustomPy(event.target.value); }

  /**
   * Constructs the transfrom object from current state
   * and calls the transfrom function.   
   */
  const onApply = () => {
    const transform = {
      tType: props.tType, 
      expr: customPy,    
    }
    props.onTransform(transform)
  }

  // Set Styles
  const mainStyle = {
    display: "block", 
    textAlign: "center"
  };

  const subStyle = {
    display: "inline-block",
    textAlign: 'left',
    verticalAlign: "top",
    maxWidth:155,
    marginRight: 5,
    textAlign:"right"
  };

  const labelStyle1 = {
    display: "inline-block",
    marginTop: 30,
    verticalAlign:"middle",
    marginRight: 5
  };
  
  const labelStyle2 = {
    display: "inline-block",
    marginTop: 30,
    verticalAlign:"middle"
  };

  const divTextStyle = {
    display: "inline-block",
    textAlign: 'left',
    verticalAlign: "top",
    width:width-155
  };

  const textAreaStyle = {
    width: width-155,
    height: 75,
    marginTop: 10
  };
  
  return (
      <div style={mainStyle} >
        <div style={subStyle}>
          <label style={labelStyle1} title={name}>{name}</label>                      
          <label style={labelStyle2}>{"="}</label>
        </div>
        <div style={divTextStyle}>
          <label style={{display: "block"}}>{"Enter custom python operation:"}</label>
          <textarea  
            className="coreTextInput" 
            placeholder={placeholder}
            style={textAreaStyle} 
            value={customPy} 
            onChange={onCustomChange}/>
        </div>
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

export default CustomControl;
