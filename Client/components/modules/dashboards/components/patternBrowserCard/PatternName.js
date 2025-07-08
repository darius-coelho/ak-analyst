import React, { useState, useEffect, useRef} from 'react';

import "./css/PatternName.css"

/**
 * Renders a component to display and edit the pattern name
 * @param {string} name - The target attribute or feature of the mining procedure
 * @param {int} margin - Sets the components margin
 * @param {int} fontSize - Sets the font size for the component
 * @param {int} listID - The index of the list containing the pattern
 * @param {int} cardID - The index of the card in the list containing the pattern
 * @param {function} changePatternName - Function to change the pattern name
 */
const PatternName = (props) => {

  const { name, isLiked, margin, fontSize, iconSize, listID, cardID, changePatternName } = props

  const inputRef = useRef(null);
  const [ showEdit, setShowEdit ] = useState(false)
  const [ newName, setNewName ] = useState(name)

  // When name changes from parent set newName to name
  useEffect(() => {
    setNewName(name)
  }, [name, setNewName])

  // Forwared escape key press to rename/moveList function
  useEffect(() => {
    function onKeyupInput(e) {
      if (e.key === 'Escape') onRename(e)
    }
    const inputEl = inputRef.current;
    inputEl.addEventListener('keyup', (onKeyupInput));
    return () => {
      inputEl.removeEventListener('keyup', onKeyupInput);
    }
  }, []);

  // Focus text edit when it is shown
  useEffect(() => {
    if(showEdit) {
      inputRef.current.focus();
    }
  }, [showEdit]);

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
  const onRename = (ev) => {
    if(ev.key === "Enter") {
      ev.preventDefault();
      if(name != newName && newName.trim().length > 0){
        changePatternName(listID, cardID, newName)
      }
      setShowEdit(false)
      inputRef.current.blur();
    }
    if(ev.key === "Escape") {
      ev.preventDefault();
      inputRef.current.blur();
      setNewName(name)
      setShowEdit(false)
    }
  }

  /**
   * Shows the text input uses to ranme a pattern
   * @param {object} evt - Input event object.
   */
  const onShowEdit = (evt) => {
    evt.preventDefault()
    evt.stopPropagation()
    setShowEdit(true)
  }

  /**
   * Resets newName to name when clicking outside the text box and hides text input.
   */
  const onBlurNewName = () => {
    setNewName(name)
    setShowEdit(false)
  }

  return (
    <div className='patternNameBox' style={{margin: margin}}>       

      <input
        ref={inputRef}
        type="text"
        className="coreTextInput"
        value={newName}
        style={{display: showEdit ? 'inline-block' : 'none', margin: 0, width: "calc(100% - 20px)"}}
        onClick={(e) => e.stopPropagation()}
        onChange={onChangeNewName}
        onKeyPress={onRename}
        onBlur={onBlurNewName}
      />

      <div style={{display: !showEdit ? 'unset' : 'none', width: "fit-content", maxWidth: 'calc(100% - 52px)'}}>
        {
          isLiked
          ? <i className={`material-icons-sharp patternLikeIcon`} style={{fontSize: iconSize}}>
              star
            </i>
          : null 
        }
        <div className='patternTitle' style={{fontSize: fontSize}}>{name} </div>
        <i
          className="material-icons-round patternNameEditIcon"
          style={{fontSize: fontSize}}
          onClick={onShowEdit}
          title={"Change pattern name"}>
            edit
        </i>
      </div>
    </div>
  );
}

export default PatternName;
