import React from 'react';
import PatternTagEditor from "./PatternTagEditor"
import "./css/PatternTagEditorModal.css"

/**
 * Component that renders a modal for the tag editor in the inspector
 * @param {boolean} show - Flag indicating if the modal should be shown
 * @param {number} listIdx - The index of the current card's list
 * @param {number} cardIdx - The index of the current card in its current list
 * @param {json} allTags - An object mapping the names of all pattern tags to colors
 * @param {array} cardTags - List of all tags assigned to this pattern
 * @param {function} addNewTag - The function that handles creating a new tag
 * @param {function} changePatternTag - The function that handles adding/removing a tag for a pattern
 * @param {function} onHide - Function to hide the tag editor modal
 */
const PatternTagEditorModal = (props) => {

  const { show,  listIdx, cardIdx, allTags, cardTags, addNewTag, editTag, removeTag, changePatternTag, onHide } = props 

  return (
    <div className='patternTagEditorModal' style={{...props.style, display: show ? 'flex' : 'none'}}>
      <div className='patternTagEditorModalBackDrop' style={props.style} onClick={onHide}></div>
      <div className='patternTagEditorModalContent'>
        <PatternTagEditor
          show={true}
          listIdx={listIdx}
          cardIdx={cardIdx}
          allTags={allTags}
          cardTags={cardTags}
          addNewTag={addNewTag}
          editTag={editTag}
          removeTag={removeTag}
          changePatternTag={changePatternTag}
          onHideTagEditor={onHide}
        />
      </div>
    </div>
  );
}

export default PatternTagEditorModal;
