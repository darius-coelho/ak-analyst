import React, { useState, useEffect } from 'react';
import {sortableContainer, sortableElement} from 'react-sortable-hoc';
import {arrayMoveImmutable} from 'array-move';
import "../css/Transformer.css"

/**
 * Renders a control for ordering the categories in an ordinal attribute.
 * @param {string} type - The attribute type - must be ordinal for the control to be rendered.
 * @param {array} categories - The ordered categories of the ordinal attribute.
 * @param {function} onTransform - The function that calls apply transform function.
 */
export default function OrdinalOrderControl(props) {  
  if(props.type != 'Ordinal'){
    return null
  }

  const [categories, setCategories] = useState(props.categories)
  
  useEffect(() => {        
    setCategories(props.categories) 
  }, [props.categories, setCategories])

  const onSortEnd = ({oldIndex, newIndex}) => {
    setCategories(arrayMoveImmutable(categories, oldIndex, newIndex))
  };

  /**
   * Set the new category order by creating the transform dict 
   * and calling the onTransform function.   
   */
  const onSetOrder = () => {    
    const transform = {
      tType: 'OrdinalOrder', 
      ordering: categories,
    }
    props.onTransform(transform)
  }

  const SortableItem = sortableElement(({value}) => 
    <div 
      className="ordinalItem" 
      title={value} >
        {value}
    </div>
  );

  const SortableContainer = sortableContainer(({children}) => {
    return <div style={{display:"inline-block", width: categories.length * 85}}>{children}</div>;
  });

  // Only show apply button when the order has changed
  const showSetOrderButton = !categories.every((v,i)=> v === props.categories[i]);

  return (
    <div>         
      <label className='attrDetailLabel'>{"Order: "}</label>      
      <div className='attrDetailBox'>
        <SortableContainer axis={'x'} onSortEnd={onSortEnd}>
          {categories.map((value, index) => (
            <SortableItem key={`item-${value}`} index={index} value={value} />
          ))}
        </SortableContainer>         
      </div>
      {
        showSetOrderButton
        ? <button className="coreButtonSmall" style={{marginTop: 25}} onClick={onSetOrder}>
            {"Set Order"}
          </button>                  
        : null
      }      
    </div>
  );  
}
