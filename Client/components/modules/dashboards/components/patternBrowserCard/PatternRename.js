import React, { useState } from 'react';

import "./css/PatternRename.css"

/**
 * Component that handles ranaming a pattern
 * @param {number} listIdx - The index of the current card's list
 * @param {number} cardIdx - The index of the current card in its current list
 * @param {string} name - The name of the current pattern
 * @param {function} changePatternName - Function that handles changing a pattern name
 * @param {function} onHideNameEditor - Function that handles hiding this component
 */
const PatternRename = (props) => {
  if(!props.show){
    return null
  }

  const { listIdx, cardIdx, name, changePatternName, onHideNameEditor } = props

  const [ newName, setNewName ] = useState(name)

  /**
   * Sets temporary name for the attribute until it is applied.
   * @param {object} evt - Input event object.
   */
   const onChangeNewName = (evt) => {
    setNewName(evt.target.value)
  }

  /**
   * Changes list name to newName on enter otherwise resets newName to name.
   * Then hides the text input
   * @param {object} evt - Input event object.
   */
  const onRename = (evt) => {
    evt.stopPropagation()
    if(name != newName && newName.trim().length > 0){
      changePatternName(listIdx, cardIdx, newName)
    }
    onHideNameEditor()
  }

  return (
    <div className='patternRenameBox'>
      <div className='patternRenameTitle'>Rename</div>
      <div className='patternRenameLabel'>
        New Pattern Name:
      </div>
      <input
        type="text"
        className="patternRenameEdit"
        value={newName}
        onClick={(e) => e.stopPropagation()}
        onChange={onChangeNewName}
      />
      <div className='coreButtonSmall patternRenameButton' onClick={onRename}>
        Done
      </div>
    </div>
  );
}

export default PatternRename;
