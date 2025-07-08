import React, { useState } from 'react';
import Select from 'react-select';

export function OHEControl(props) {

  const { attributes, attr } = props;

  const [selectedAttr, setSelectedAttr] = useState({value: null, label: "None"})

  // List of select options for the y-attribute
  const attrOptions = [{value: null, label: "None"}].concat(
                      attributes
                      .filter(a=>a!=attr)
                      .map(a=>({value: a, label: a})));

  // Description of the transform for the user
  const descript = 
      <label style={{margin: 10, pad: 5, fontSize: 13}}>
        Applying this transform will create N new columns 
        where N is the number of categories in the attribute(s) shown above. 
        Each new column will have a true value if the data item belongs to that 
        category otherwise its value will be false. If you choose to <b> bind to </b>,
        another attribute each new column will have the bound attribute's value 
        if the data item belongs to that category
      </label>
  

  /**
   * Sets the filterType state variable based on the selected option.
   * @param {object} selectedOption - Object containing the label 
   * and value of the selected option.
   */
   const onSelectedAttrChange = (selectedOption) => {
    setSelectedAttr(selectedOption)
  }  

  /**
   * Constructs the transfrom object from current state
   * and calls the transfrom function.   
   */
  const onApply = () => {
    const transform = {
      tType: props.tType, 
      bind: selectedAttr.value
    }
    props.onTransform(transform)
  }

  
  const selectStyle = {
    display: "inline-block",
    width: 250, 
    textAlign: "left",
    marginTop: 10, 
    marginLeft: 5, 
    height: 38
  };
  

  return (
      <div style={{display: "block"}} >
        {descript}
        <div >
          <label style={{display: "inline-block"}}>{"Bind to:"}</label>
          <div style={selectStyle}>
            <Select
              isMulti={false}
              value={selectedAttr}
              onChange={onSelectedAttrChange}
              options={attrOptions} 
              className="selectAttr"
              classNamePrefix="selectAttr"/>
          </div>
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

export default OHEControl;
