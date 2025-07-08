import React, { useState, useEffect } from 'react';
import "../../../../css/Core.css"
import "../../../../css/Modal.css"

/**
 * Renders a modal/popup to set the default behavior for
 * handling out of sample data for ordinal attributes.
 * @param {array} categories - The ordered categories of the ordinal attribute.
 * @param {function} onTransform - The function that calls apply transform function.
 */
function OrdinalUnsampledOptions(props) {

  const [newCat, setNewCat] = useState("")
  const [categories, setCategories] = useState(props.categories)
  
  useEffect(() => {        
    setCategories(props.categories) 
  }, [props.categories, setCategories])

  /**
   * Adds new category name the category list.   
   */
  const onAddCategory = () => {
    setCategories([...categories, newCat])
    setNewCat("")
  }

  /**
   * Applies the category list in order as an ordering transform.
   * @param {object} evt - Input event object.
   */
  const onApply = () => {
    const transform = {
      tType: 'OrdinalOrder',       
      ordering: categories,
    }
    props.onTransform(transform)
    props.onShow(false)
  }

  /**
   * Adds new category name to ordering.
   * @param {object} evt - Input event object.
   */
   const onRemoveCategory = (cat) => {
    setCategories(categories.filter( d => d != cat ))    
  }
  
  /**
   * Sets new/unseen category name to be added to ordering.
   * @param {object} evt - Input event object.
   */
  const onChangeNewCat = (evt) => setNewCat(evt.target.value)

  const divStyle = {
    display: "block", 
    margin: 20,
    marginTop: 0
  }

  const catDiv = {
    border: "1px solid #d5d5d5",
    margin: 10,
    marginTop: 0,
    padding: 10,
    maxHeight: 150,
    overflowX: "hidden",
    overflowY: "auto",
  }

  return(
    <div style={divStyle}>      
      <label className='attrDetailLabel' style={{width: 200}}>{"Sampled Categories: "}</label>    
      <div style={catDiv}>
        {categories.map((value, index) => (
          <div
            key={'ord-'+index}
            className="sampleCategoryItem">
              <div                
                className="ordinalItem" 
                style={{cursor: "default"}}
                title={value} >
                  {value}                
              </div>
              {
                props.categories.includes(value)
                ? null
                : <i className="material-icons-outlined"
                     style={{fontSize: 16, verticalAlign: "middle", cursor: "pointer"}}
                     onClick={() => onRemoveCategory(value)}>
                       {"clear"}
                  </i>                
              }
          </div>
        ))}
      </div>    
      <div style={{display: "block", marginBottom: 15}}>
        <input
          type="text"
          className="coreTextInput"
          value={newCat}
          style={{width: 180}}
          onChange={onChangeNewCat} />     
        <button className="coreButtonSmall" onClick={onAddCategory}>
          {"Add Unsampled Category"}
        </button>
      </div> 
      <div className="placeholderText" style={{margin: 10}}>
          {`Any additional categories not included in this sample 
            will be appended to the list above in alphabetical order.`}
      </div> 
      <div style={{textAlign: "center", width:"100%"}}>
          <input
            type="button"
            className="coreButton"
            onClick={onApply}
            value={"Set Ordering"}
          />
          <input
            type="button"
            className="coreButton"
            onClick={() => props.onShow(false)}
            value={"Close"}
          />
        </div>
    </div>
  )
}

/**
 * Renders a modal/popup to set the default behavior for
 * handling out of sample data for attributes.
 * @param {boolean} show - Flag to indicate if the popup should be shown.
 * @param {string} type - The attribute type.
 * @param {array} categories - The ordered categories of the ordinal attribute.
 * @param {function} onTransform - The function that calls apply transform function.
 * @param {function} onShow - The function to change the show flag.
 */
export function UnsampledOptions(props) {

  if(!props.show){
    return null
  }
  
  const divStyle = {
    top: 10,
    left: 10,
    width: window.innerWidth - 20,
    height: window.innerHeight - 20,
    display:"block"
  }

  return(
    <div className="ak-modal" style={divStyle}>
      <div className="ak-modal-content" style={{maxWidth: 975}}>
        <label className="contentDivHead" title={"Out of Sample Options"}>Out of Sample Options</label>

        <div className="placeholderText" style={{margin: 10}}>
          {`You are working with a sample / subset of your dataset.
            Sampling improves run-time performance.
            You may see differences in the summary statistics for the full dataset.
            Some categories in nominal / ordinal columns may not have been sampled.
            To handle issues related sampling please use the options below:`}
        </div>

        {
          props.type=='Ordinal'
          ? <OrdinalUnsampledOptions 
              categories={props.categories}
              onTransform={props.onTransform}
              onShow={props.onShow} />
          : null
        }

      </div>
    </div>
  )
}

export default UnsampledOptions