import React, { useState, useEffect, useRef } from 'react'

import { Slider } from '@material-ui/core'

import "./css/AttributeListFilter.css"

/**
  * Function to filter the attribute list based on a set of conditions
  * @param {array} attributeList - the set of conditions.
  * @param {object} filters - the set of filter conditions.
  */
export const filterAttributeList = (attributeList, filters) => {
  if(filters === null) {
    return attributeList
  }
  return attributeList.filter((d, i) => {
    // Check if attribute is of a valid type
    const isValidType = filters.types.includes(d.type)
  
    // Attribute is not of a valid type filter it out
    if(!isValidType) return false
    
    // Check all attributes must be shown or only those with missing values    
    const cutOffLb = filters.missing.range[0]
    const cutOffUb = filters.missing.range[1]
    const isValidMissing = !filters.missing.checked
                            || (  filters.missing.checked 
                                  && d.hasMiss 
                                  && d.countMiss >= cutOffLb
                                  && d.countMiss <= cutOffUb )

    // Check all attributes must be shown or only those with single unique values
    const isValidSingleUnique = !filters.singleVal.checked
                                || ( filters.singleVal.checked &&
                                      ((d.type == "Numerical" && d.min == d.max)
                                        || (d.type == "Nominal" && d.card == 1)
                                        || (d.type == "Ordinal" && d.card == 1)
				        || (d.type == "DateTime" && d.card == 1))
                                    )
    return isValidMissing && isValidSingleUnique
  })
}


const missClamp = (num) => {
  if(num == "" || num == null){
    console.log(num)
    return num
  }
  return Math.min(Math.max(num, 0), 100);
}

/**
 * Renders a checkbox.
 * @param {object} item - checkbox properties - checked, name, label
 * @param {function} setFitlers - function to handele toggling the checkbox
 * @param {bool} inputStyle - function to handele toggling the checkbox
 */
const Checkbox = (props) => {
  const { item, handleChange, inline } = props
  return(
    <span style={{margin: 8, display: inline ? "inline-block" : "block"}}>
      <input
        className='attrFilterCheck'
        type="checkbox"
        value={item.name}
        checked={item.checked}
        onChange={handleChange}
      />
      <label className='attrFilterCheckLabel'>
        {item.label}
      </label>
    </span>
  )
}


/**
 * Renders a set of control to filter attributes. 
 * @param {number} dataCount - the number of data items.
 * @param {function} setAttributeList - sets the attribute list in the parent component
 */
export function AttributeListFilter(props) {
  
  const missingLbInp = useRef(null);
  const missingUbInp = useRef(null);
  const { dataCount, inlineStyle } = props
  
  const [checkList, setCheckList] = useState({
    Numerical: {
      checked: true,
      name: "Numerical",
      label: "Numerical"
    },
    Nominal: {
      checked: true,
      name: "Nominal",
      label: "Nominal"
    },
    Ordinal: {
      checked: true,
      name: "Ordinal",
      label: "Ordinal"
    },
    DateTime: {
      checked: true,
      name: "DateTime",
      label: "DateTime"
    },
    missing: {
      checked: false,
      name: "missing",
      label: "Has missing values"
    },
    singleVal: {
      checked: false,
      name: "singleVal",
      label: "Has single unique value"
    }
  })
  const [sliderValue, setSliderValue] = useState([0, 100]);

  
  const filterAttributes = () => {
    props.setFilters({
      types: ["Numerical", "Nominal", "Ordinal", "DateTime"].filter( d => checkList[d].checked),
      missing: {
        ...checkList.missing,
        range: [dataCount*sliderValue[0]/100, dataCount*sliderValue[1]/100]
      }, 
      singleVal: checkList.singleVal
    })
  }

  useEffect(() => {
    filterAttributes();
  }, [checkList, sliderValue])
  
  /**
   * Function to set the checkboxes that indicate the conditions
   * to filter attributes on
   */
  const handleCheckChange = (evt) => {
    const key = evt.target.value
    const newCheckList = {
      ...checkList,
      [key]: {
        ...checkList[key],
        checked: !checkList[key].checked
      }
    }
    setCheckList(newCheckList)    
  } 

  /**
   * Function to set the percentage range for filtering missing values
   * i.e. filter attributes that have a percentage of missing values in the range
   */
  const handleChangeSlider = (event, newValue) => {
    setSliderValue(newValue);
  };

  /**
   * Function to set the lower bound of the 
   * percentage range for filtering missing values
   */
  const changeMissingLb = (evt) => {
    const lb = missClamp(evt.target.value)
    const ub = Math.max(lb, sliderValue[1])
    setSliderValue([lb, ub]);
  };

  /**
   * Function to set the upper bound of the
   * percentage range for filtering missing values
   */
  const changeMissingUb = (evt) => {
    const ub = missClamp(evt.target.value)
    const lb = Math.min(sliderValue[0], ub)
    setSliderValue([lb, ub]);
  };

   /**
   * Defocuses missing value range inputs when enter or escape key is hit
   */
   const defocusMissingInput = (evt) => {
    if (evt.keyCode === 13 || evt.keyCode === 27) { // On Enter or Esc
      missingLbInp.current.blur();
      missingUbInp.current.blur();
    }
    return searchVal
  }

  // Labels for the slider
  const sliderMarks = [
    { value: 0, label: '0%' },
    { value: 100, label: '100%' }
  ]
 
  return ( 
    <div style={{textAlign: inlineStyle ? "left" : "center"}}>
      <div className='attrFilterBox'>
        <label className='attrFilterTitle'>Attribute Type</label>
        <Checkbox item={checkList['Numerical']} handleChange={handleCheckChange} inline={inlineStyle}/>
        <Checkbox item={checkList['Nominal']} handleChange={handleCheckChange} inline={inlineStyle}/>
        <Checkbox item={checkList['Ordinal']} handleChange={handleCheckChange} inline={inlineStyle}/>
      </div>

      <div className='attrFilterBox' style={{minWidth: 200}}>
        <label className='attrFilterTitle'>Missing Values</label>
        <Checkbox item={checkList['missing']} handleChange={handleCheckChange} inline={inlineStyle}/>
        {
          checkList['missing'].checked
          ? <div>
              <label style={{display: "block", marginBottom: 8, fontSize: 14}}>
                Missing Percentage Range
              </label>
              <input 
                ref={missingLbInp}
                className="attrFilterSpinBox"
                type="number" step="0.01"
                value={sliderValue[0]}
                onChange={changeMissingLb}
                onKeyDown={defocusMissingInput} />
              <div className='attrFilterSlider'>
                <Slider 
                  min={0}
                  max={100}
                  step={0.01}
                  value={sliderValue}
                  onChange={handleChangeSlider}
                  valueLabelDisplay="auto"
                  marks={sliderMarks}
                />
              </div>
              <input
                ref={missingUbInp}
                className="attrFilterSpinBox"
                type="number"
                step="0.01"
                value={sliderValue[1]}
                onChange={changeMissingUb}
                onKeyDown={defocusMissingInput} />
            </div>
          : null
        }
      </div>

      <div className='attrFilterBox'>
        <label className='attrFilterTitle'>Single Unique Value</label>
        <Checkbox item={checkList['singleVal']} handleChange={handleCheckChange} inline={inlineStyle}/>
      </div>
    </div>
  );
 
}

export default AttributeListFilter;
