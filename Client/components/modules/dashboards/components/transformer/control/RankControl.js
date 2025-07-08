import React, { useState } from 'react';
import Select from 'react-select';

/** Component which renders the nominal ranking control panel. */
export function RankControl(props) {
  const { width, attributes, attrTypes, attr } = props;

  // Set up state variables
  const [rankTiers, setRankTiers] = useState(3);
  const [rankAttr, setRankAttr] = useState(null)

  // List of select options for the y-attribute
  const attrOptions = attributes
                      .filter(a=>a!=attr && attrTypes[a]=='Numerical')
                      .map(a=>({value: a, label: a}));
  
  /**
   * Sets the number of tiers to rank the attribute on.
   * @param {object} evt - Event handler for tier input component.
   */
  const onRankTiersChange = (event) => { 
    props.onSetNRankBins(event.target.value)
    setRankTiers(event.target.value); 
  }  
  
  /**
   * Sets the filterType state variable based on the selected option.
   * @param {object} selectedOption - Object containing the label 
   * and value of the selected option.
   */
  const onRankAttrChange = (selectedOption) => {
    setRankAttr(selectedOption.value)
    props.onSetYAttr(selectedOption.value)
  }  
  
  /**
   * Constructs the transfrom object from current state
   * and calls the transfrom function.   
   */
  const onApply = () => {
    const transform = {
      tType: props.tType, 
      rankattr: rankAttr,
      ranktiers: +rankTiers,
    }
    props.onTransform(transform)
  }

  // Set Styles
  const nameInputStyle = {
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
    verticalAlign: "top",
    width:width-200
  };

  const divStyle3 = {
    display: "block",
    width: width-200,
    marginTop: 10,
    textAlign:"left"
  };  

  const valueInputStyle = {
    fontSize: 17,
    margin: 0,
    lineHeight: "unset", 
    padding: 5
  };

  return (
      <div style={{display: "block", paddingTop: 30}} >
        <div style={divStyle1}>
          <label style={{display: "block"}}>{"Select Attribute:"}</label>
          <div style={nameInputStyle}>
            <Select
              isMulti={false}
              onChange={onRankAttrChange}
              options={attrOptions} 
              className="selectAttr"
              classNamePrefix="selectAttr"/>
          </div>
        </div>
        <div style={divStyle2}>
          <label style={{display: "block"}}>{"Number of Bins:"}</label>
          <div style={divStyle3}>
            <input 
              data-testid="rank-value"
              type={"number"} 
              className={"coreTextInput"} 
              style={valueInputStyle} 
              defaultValue={rankTiers} 
              min={2} 
              onChange={onRankTiersChange}
            />
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

export default RankControl;
