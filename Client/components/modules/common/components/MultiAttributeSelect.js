import React, { useState, useEffect, useContext } from 'react';
import Select from 'react-select';
import unionBy from "lodash/unionBy"

/**
 * Component which renders an attribute selector with the `select all` option.
 * @param {array} attributes - Array of attributes 
 * @param {array} selected - Array of selected attributes or Object if isMulti is false 
 * @param {function} onChange - Function that handles the changing of values in the select control
 * @param {object} customStyles - Style object for react select
 */
export function MultiAttributeSelect(props) {
  const { attributes, selected, onChange , customStyles} = props;

  const [ options, setOptions] = useState(
      [{value: "<ALL>", label: "All Items", type: "All"}].concat(attributes)
    ) 
  
  useEffect(()=>{
    setOptions(
      [{value: "<ALL>", label: "All Items", type: "All"}].concat(attributes)
    )
  }, [attributes]);

  const [searchVal, setSearchVal] = useState("")

  /**
   * Updates the state variables to the new set of attributes 
   * after adding an attribute to the current selection.
   * @param {list} selectedOptions - List of selected options.
   * @param {object} actionMeta - Object indicating the action taken.
   */
  const onSelectedChange = (selectedOptions, actionMeta) => {
    const { action, option, removedValue } = actionMeta;

    if(action === "select-option" && option.value === "<ALL>"+searchVal) {
      const re = new RegExp(searchVal, 'i');
      
      const newSelectedAttr = attributes.filter( d => {
        if(d.value == "<ALL>"+searchVal)
          return false

	if ('isDisabled' in d && d.isDisabled)
	  return false
	
        if(searchVal.length == 0)
          return true
        
        if(d.value.match(re))
          return true

        return false
      })

      onChange(unionBy(selected, newSelectedAttr, 'value'))
    } 
    else{
      onChange(selectedOptions)
    }
    setSearchVal("")
  }

  
  /**
   * Updates the search string to search for attributes.
   * @param {object} searchVal - Event handler for tier input component.
   * @param {object} flags - Object containing action type.
   */
   const onSearchChange = (newVal, flags) => {
    if(flags.action == "input-change"){
      let attrs = options;

      // force the 'all' items option value to include the searchval
      attrs[0].value = "<ALL>" + newVal      
      setOptions(attrs)
      setSearchVal(newVal)
    }
    return newVal
  }  
  
  return (
    <Select
      isMulti
      options={options}
      value={selected}
      onChange={onSelectedChange}
      onInputChange={onSearchChange}
      labelField='name'
      valueField='name'
      className="selectAttr"
      classNamePrefix="selectAttr"
      styles={customStyles}
    />
  );
  
}

export default MultiAttributeSelect;
