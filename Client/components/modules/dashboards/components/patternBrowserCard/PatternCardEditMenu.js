import React, { useState } from 'react';

import PatternRename from './PatternRename';
import PatternMoveList from './PatternMoveList';
import PatternTagEditor from "./PatternTagEditor"

import "./css/PatternCardEditMenu.css"

/**
 * Renders a card edit menu
 * @param {boolean} show - flag that indicates if the menu should be shown
 * @param {function} onHide - Function that handles hiding the menu
 * @param {json} params - params containing card location and index
 * @param {json} data - pattern info
 * @param {function} changePatternName -  Function that handles changing the pattern name
 * @param {array} patternSetMin - A minimal version of the pattern list set
 * @param {function} changeList - Function that handles moving a pattern to a different list
 * @param {array} likedPatterns - The list patterns that have been added to the output/liked
 * @param {function} toggleAddOutput - The function that handles adding/removing a pattern from the output/liked list
 * @param {json} allTags - An object mapping the names of all pattern tags to colors
 * @param {array} addNewTag - The function that handles creating a new tag
 * @param {function} changePatternTag - The function that handles adding/removing a tag for a pattern
 */
const PatternCardEditMenu = (props) => {

  const { show, onHide, params, data, changePatternName, patternSetMin, changeList,
          likedPatterns, toggleAddOutput, allTags, addNewTag, editTag, removeTag, changePatternTag } = props

  if(!show || params == null){
    return null
  }

  const { cardRect, listIdx, cardIdx } = params

  const [showNameEditor, setShowNameEditor] = useState(false)
  const [showListEditor, setShowListEditor] = useState(false)
  const [showTagEditor, setShowTagEditor] = useState(false)

  /** Handles adding/removing from the liked list. */
  const onLike = (evt) => {
    // prevent peek changes
    evt.stopPropagation();
    toggleAddOutput(data);
  }

  // True if pattern was liked, False o.w.
  const isLiked = likedPatterns.some(d=>d.ID===data.ID);

  /** Handles hiding the edit menu and menu components. */
  const onClickBackdrop = () => {
    if(showNameEditor) {
      setShowNameEditor(false)
    }
    else if(showListEditor) {
      setShowListEditor(false)
    }
    else if(showTagEditor) {
      setShowTagEditor(false)
    }
    else {
      onHide()
    }
  }
  
  return (
    <div className='pattern-card-modal'>
      <div className='patternCardEditorBackdrop' onClick={onClickBackdrop} />
      <div
        className='pattern-card-hole'
        style={{
          left: cardRect.x-10,
          top: cardRect.y-10,
          width: cardRect.width+20,
          height: cardRect.height+20,
        }}
      />

      <div
        className='pattern-card-menu'
        style={{
          left: cardRect.x + cardRect.width + 10,
          top: cardRect.y-10
        }}
      >
        <div className='pattern-card-menu-option' onClick={() => setShowNameEditor(true)}>Rename</div>
        <div className='pattern-card-menu-option' onClick={onLike}>{`${isLiked ? "Remove from": "Add to"} Output`}</div>
        <div className='pattern-card-menu-option' onClick={() => setShowTagEditor(true)}>Tags</div>
        <div className='pattern-card-menu-option' onClick={() => setShowListEditor(true)}>Move</div>
        <div className='pattern-card-menu-option' onClick={onHide}>Done</div>
      </div>

      <div
        className='pattern-card-menu-option-panel'
        style={{
          left: cardRect.x + cardRect.width + 10,
          top: cardRect.y-10
        }}>
        <PatternRename
          show={showNameEditor}
          listIdx={listIdx}
          cardIdx={cardIdx}
          name={data.name}
          changePatternName={changePatternName}
          onHideNameEditor={() => setShowNameEditor(false)}
        />

        <PatternMoveList
          show={showListEditor}
          listIdx={listIdx}
          cardIdx={cardIdx}
          patternSetMin={patternSetMin}
          changeList={changeList}
          onHide={onHide}
        />

        <PatternTagEditor
          show={showTagEditor}
          listIdx={listIdx}
          cardIdx={cardIdx}
          allTags={allTags}
          cardTags={data.tags}
          addNewTag={addNewTag}
          editTag={editTag}
          removeTag={removeTag}
          changePatternTag={changePatternTag}
          onHideTagEditor={() => setShowTagEditor(false)}
        />
      </div>      

    </div>
  );
}

export default PatternCardEditMenu;