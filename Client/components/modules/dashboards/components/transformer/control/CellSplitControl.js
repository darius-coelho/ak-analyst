import React, { useState } from 'react';
import Select from 'react-select';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import InputGroup from 'react-bootstrap/InputGroup'
import Form from 'react-bootstrap/Form'
import FormControl from 'react-bootstrap/FormControl'

export function CellSplitControl(props) {
  const { attr } = props;
  
  const [ordered, setOrdered] = useState("Ordered");
  const [delim, setDelim] = useState("");
  const [quote, setQuote] = useState("");
  const [strip, setStrip] = useState("");
  
  // Set Styles
  const textInputStyle = {
    width: '4rem', 
    marginTop: 10, 
    marginRight: 5,
    marginLeft: 0,
    height: 38
  };

  const dropdownInputStyle = {
    width: 170, 
    marginTop: 10, 
    marginRight: 5, 
    height: 38
  };

  const divStyle1 = {
    display: "inline-block",
    textAlign: 'left',
    verticalAlign: "top",
    width:200,
    marginRight: 5
  };

  const divStyle2 = {
    display: "inline-block",
    textAlign: 'left',
    verticalAlign: "bottom",
    marginRight: 10
  };





  /**
   * Constructs the transform object from current state
   * and calls the transform function.   
   */
  const onApply = () => {
    const transform = {
      tType: 'CellSplit', 
      attr: attr,
      delimiter: delim,
      ordered: ordered === "Ordered",
      quote: quote,
      strip: strip
    }
    props.onTransform(transform)
  }

  function onSplitTypeChange(selected) {
    setOrdered(selected.value);
  }
  
  return (
      <div style={{display: "block", paddingTop: 30}} >
        <div style={divStyle1}>
          <label style={{display: "block"}}>{"Cell Split Type:"}</label>
          <div style={dropdownInputStyle}>
            <Select              
              defaultValue={{value: ordered, label: ordered}}
              isMulti={false}
              onChange={onSplitTypeChange}
              options={[{value: "Ordered", label: "Ordered"},
	  		{value: "Unordered", label: "Unordered"}]} 
              className="selectType"
              classNamePrefix="selectType"
            />
          </div>
        </div>
        <div style={divStyle2} >
        <label style={{display: "block", fontSize: "0.9rem"}}> Delimiter: </label>
          <input 
              type={"text"} 
              className={"coreTextInput"} 
              style={textInputStyle} 
              defaultValue={delim} 
              onChange={(e) => setDelim(e.target.value)}
           />          
        </div>
      
        <div style={divStyle2} >
          <label style={{display: "block", fontSize: "0.9rem"}}> Strip: </label>
          <input 
              type={"text"} 
              className={"coreTextInput"} 
              style={textInputStyle} 
              defaultValue={strip} 
              onChange={(e) => setStrip(e.target.value)}
           />          
        </div>

        <div style={divStyle2} >
          <label style={{display: "block", fontSize: "0.9rem"}}> Quote: </label>
          <input 
              type={"text"} 
              className={"coreTextInput"} 
              style={textInputStyle} 
              defaultValue={quote} 
              onChange={(e) => setQuote(e.target.value)}
           />          
        </div>

        <input 
          type="button" 
          className="coreButton"
          disabled={delim === ""}
          title={(delim === "" ? "Enter a delimiter" : "")}
          style={{display: 'block', margin: "auto", marginTop: 20}} 
          onClick={onApply} 
          value={"Apply"}
        />
      </div>
  );
}

export default CellSplitControl;
