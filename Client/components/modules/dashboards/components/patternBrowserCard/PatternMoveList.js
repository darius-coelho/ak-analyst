import React from 'react';

import "./css/PatternMoveList.css"

/**
 * Component that handles moving a pattern to a new list
 * @param {array} patternSetMin - A minimal version of the pattern list set
 * @param {number} listIdx - The index of the current card's list
 * @param {number} cardIdx - The index of the current card in its current list
 * @param {function} changeList - Function that handles moving a pattern to a different list
 * @param {function} onHide - Function that handles hiding this component
 */
const PatternMoveList = (props) => {
  if(!props.show){
    return null
  }

  const { patternSetMin, listIdx, cardIdx, changeList, onHide } = props
  
  /**
   * Moves a pattern to the end of the list selected from the dropdown
   * Then hides the dropdown
   * @param {object} evt - Input event object.
   */
   const onMoveList = (evt) => {
    const newListID = +evt.target.value
    const newIdx = patternSetMin[newListID].len
    changeList({
      source: { index: cardIdx, droppableId: listIdx },
      destination: { index: newIdx, droppableId: newListID }
    })
    onHide()
  }
  

  return (
    <div className='patternMoveListBox'>
      <div className='patternMoveListTitle'>Move Pattern</div>
      <div className='patternMoveListLabel'>
        Select New List:
      </div>
      <select
          value={listIdx}
          className="patternMoveListSelect"
          onClick={(e) => e.stopPropagation()}
          onChange={onMoveList}
        >
          {
            patternSetMin.map( (d,i) => 
              <option key={i} value={i}>{d.name}</option>
            )
          }
        </select>
    </div>
  );
}

export default PatternMoveList;
