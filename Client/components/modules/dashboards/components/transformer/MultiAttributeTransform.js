import React, { useState, useEffect } from 'react'
import unionBy from "lodash/unionBy"

import AttrSelectControl from "./control/AttrSelectControl"
import MissingControl from './control/MissingControl';
import LogControl from './control/LogControl';
import NormControl from './control/NormControl';
import OHEControl from './control/OHEControl';
import CustomControl from './control/CustomControl';
import { AttributeTypeMultiControl } from './control/AttributeTypeControl'

import { AttributeListFilter, filterAttributeList } from "./AttributeListFilter"

import HelpIcon from '../../../common/components/HelpIcon';

import "../../../../css/Core.css"
import "../../../../css/Modal.css"

const TRANSFORMS = {
  'All': ["Type", "Missing", "Drop"],
  'Numerical': ["Type", "Missing", "Outlier Removal", "Log", "Normalize", "Drop", "Custom"],
  'Nominal': ["Type", "Missing", "One-Hot Encoding", "Drop", "Custom"], 
}

const renderOptions = (className, selected, onSelect) => {
  return (d, index) => {    
    
    return <button 
            className={className}
            key={"options-"+className+index}
            style={{background: selected==d ? "#383838" : "#727275"}} 
            onClick={() => onSelect(d)}>
              {d}
          </button>
  };
};

/**
  * Renders the controls for the selected transform
  * @param {list} selectedAttr - List of selected attibutes in the react-select format.
  * @param {list} description - List of all attributes descriptions.
  * @param {string} selected - The selected transfrom.
  * @param {string} dType - The type of attibutes - Numerical, Nominal, or Both.
  * @param {function} onTransform - The function that applies the transform.
  */
const renderTransformControl = (selectedAttr, description, selected, dType, onTransform) => {  
  switch(selected) {
    case "Missing": return (
        <MissingControl 
          tType={"Missing"}
          dType={dType}
          onTransform={onTransform}
        />
      );   

    case "Type": return (
        <AttributeTypeMultiControl 
          tType={"Dtype"}
          dType={dType}
          onTransform={onTransform}
        />
      );  

    case "Outlier Removal": return (
        <input 
          type="button" 
          className="coreButton" 
          style={{marginTop: 20}} 
          onClick={() => onTransform({tType: "OutlierRemoval"})} 
          value={"Remove Outliers"} 
        />
      ); 
    case "Log": return (
        <LogControl 
          tType={"Log"}
          onTransform={onTransform}
        />
      );
    case "Normalize": return (
        <NormControl 
          tType={"Norm"}
          onTransform={onTransform} 
        />
      );
    case "One-Hot Encoding": 
      // Determine the attributes that can be bound for ohe
      const oheAttr = description
                      .filter(d => 
                        (selectedAttr.filter(e => d.name == e.value).length < 1) 
                        && d.value != "<ALL>" 
                      )
                      .map(d=> d.name)            
      return (
        <OHEControl 
          tType={"OHE"}
          onTransform={onTransform} 
          attributes={oheAttr}
        />
      );
    case "Drop": return (
        <input 
          type="button" 
          className="coreButton" 
          style={{marginTop: 20}} 
          onClick={() => onTransform({tType: "Drop"})} 
          value={"Drop Selected Columns"} 
        />
      );
    case "Custom": return (      
        <CustomControl 
          name={"Attribute"}
          width={650}
          tType={"Custom"}
          onTransform={onTransform}
          placeholder={ "$var$**2 + x + y\n" +
                        "Here use $var$ to refer to all selected attributes\n" + 
                        "x and y should be attribute names if neccessary"} 
        />      
      );
    default: return null;
  }        
};

/**
 * Renders the multi-attribute transform popup
 * @param {Array} description - a list of attribute descriptions.
 * @param {Array} deleted - the list of deleted attributes.
 * @param {number} dataCount - the number of data items.
 * @param {function} onApplyTx - function that applies a transform to multiple attributes.
 * @param {function} onDelete - function that deletes an attribute.
 * @param {function} onCancel - function that closes the popup.
 * @param {number} top - The popup position from the top of the window. 
 * @param {number} left - The popup position from the left of the window.
 * @param {number} height - The height of the popup.
 * @param {number} width - The width of the popup. 
 */
export function MultiAttributeTransform(props) {

  if(!props.show){
    return null
  }   

  const { description, deleted, dataCount, onApplyTx, onDelete, onCancel,
          top, left, height, width } = props

  const [attributes, setAttributes] = useState(
                                        [{value: "<ALL>", label: "All Items", type: "All"}]
                                        .concat(
                                          description
                                          .filter( d => !deleted.includes(d.name))
                                          .map((d, i) =>
                                            ({value: d.name, label: d.name,  type: d.type})
                                          )
                                        )
                                      )
  
  const [selectedAttr, setSelectedAttr] = useState([])
  const [selectedAttrOut, setSelectedAttrOut] = useState([])
  const [selectedTransform, setSelectedTransform] = useState("Type")
  const [searchVal, setSearchVal] = useState("")
  const [selectedType, setSelectedType] = useState("All")  

  /**
   * Updates the list of filtered attributes
   * and triggers an update to the allowable transforms   
   * @param {object} filters - Set of filters.
   */
  const updateFilters = (filters) => {
    const newDescription = filterAttributeList(description, filters)    
    setAttributes(
                  [{value: "<ALL>", label: "All Items", type: "All"}]
                  .concat(
                    newDescription
                    .filter( d => !deleted.includes(d.name))
                    .map((d, i) => ({value: d.name, label: d.name,  type: d.type}))
                  )
                )
    // Add selected attributes outside filter to the highlighted list
    setSelectedAttrOut(
      selectedAttr
      .map(d => d.value)
      .filter(d => !newDescription.some(s => s.name == d))
    )

    if(filters.types.includes("Numerical") && (filters.types.includes("Nominal") || filters.types.includes("Ordinal"))){
      setSelectedType("All")
    }
    else if(filters.types.includes("Numerical")){
      setSelectedType("Numerical")
    }
    else {
      setSelectedType("Nominal")
    }
  }

  /**
   * Updates the state variables to the new set of attributes 
   * after adding an attribute to the current selection.
   * @param {list} selectedOptions - List of selected options.
   * @param {object} actionMeta - Object indicating the action taken.
   */
  const onSelectedAttrChange = (selectedOptions, actionMeta) => {    
    const { action, option, removedValue } = actionMeta;

    if(action === "select-option" && option.value === "<ALL>"+searchVal) {      
      const re = new RegExp(searchVal, 'i');            

      const newSelectedAttr = attributes.filter( d => {        
        if(d.value == "<ALL>"+searchVal) 
          return false
        
        if(searchVal.length == 0)
          return true       
        
        if(d.value.match(re))
          return true

        return false
      })

      setSelectedAttr(unionBy(selectedAttr, newSelectedAttr, 'value'))
      setSearchVal("")
    } 
    else{
      setSelectedAttr(selectedOptions)
    }    
  }

  /**
   * Updates the search string to search for attributes.
   * @param {object} searchVal - Event handler for tier input component.
   * @param {object} flags - Object containing action type.
   */
  const onSearchChange = (newVal, flags) => {
    if(flags.action == "input-change"){
      let attrs = attributes;

      // force the 'all' items option value to include the searchval
      attrs[0].value = "<ALL>" + newVal      
      setAttributes(attrs)
      setSearchVal(newVal)
    }
    return newVal
  }  
  
  /**
   * Adds all attributes to attribute select list
   */
  const onAddAll = () => {
    setSelectedAttr([...attributes].slice(1))
  }

  /**
   * Applies a transform to a list of attributes filtered
   * based on the user selected data type.
   * @param {object} transform - Transform object contiaining transform parameters.   
   */
  const onTransform = (transform) => {    
    if(selectedAttr.length > 0){
      const attrs = selectedAttr.map(d => d.value)
      transform.attr = attrs

      if(transform.tType == "Drop"){        
        const notDeleted = attrs.filter(d => !deleted.includes(d))
        setAttributes(attributes.filter(d => !notDeleted.includes(d.value)))
        setSelectedAttr([])
        onDelete(notDeleted)
      }
      else{
        onApplyTx(transform)
      }      
    }    
  }

  /**
   * Closes the multi-attribute transform popup
   */
  const onExit = () => {
    setSelectedAttr([])
    onCancel()
  }

  return(
    <div className="ak-modal" style={{top: top, left: left, width: width, height: height, display:"block"}}>
      <div className="ak-modal-content-fit" style={{maxWidth: 700}}>
        <label className="contentDivHead" title={"Multi-Attribute Transforms"}>
          Multi-Attribute Transforms
        </label>
        <HelpIcon
          content={
            `This dialog box contains controls to apply certain transforms to multiple attributes at the same time.
             You can manually select the attributes of your choice or use one of the convenience functions
             to select attributes with missing values or a single unique value. You can also filter based on the attribute type.
             Based on the types of the selected attributes, a set of transforms will be made available that can be applied to all attributes.`
          }
        />
        
        <AttributeListFilter          
          dataCount={dataCount}
          setFilters={updateFilters}          
          inlineStyle={false}
        />

        <div style={{textAlign: "center"}}>
          <input 
            type="button"
            className="coreButtonSmall"
            onClick={onAddAll}
            value={"Add All Attributes"}
          />
        </div>
        
        <div>
          <AttrSelectControl
            width={Math.min(width-80, 660)}
            attributes={attributes}
            selectedAttr={selectedAttr}
            selectedType={selectedType}
            onSelectedAttrChange={onSelectedAttrChange}
            onSearchChange={onSearchChange}
            toHighlight={selectedAttrOut}
            highlightColor={"#ff9e9e"}
          />
        </div>
        
        <div style={{margin: 20}}>
          {
            TRANSFORMS[selectedType].map(
              renderOptions(
                "coreButtonTab",
                selectedTransform,
                setSelectedTransform
              )
            )
          }
          
          <div style={{display: "block", height: 180, borderTop: "1px solid #1a1a1a", margin: 0, paddingTop: 20, textAlign: "center"}}>
            {
              renderTransformControl(
                selectedAttr,
                description,
                selectedTransform,
                selectedType,
                onTransform)
            }
          </div>
        </div>
        
        <div style={{textAlign: "center", position: "absolute", bottom: 15, width: Math.min(width-80, 700)}}>
          <input 
            type="button"
            className="coreButton"
            onClick={onExit}
            value={"Exit"}
          />
        </div>
      </div>
    </div>
  )  
}

export default MultiAttributeTransform;