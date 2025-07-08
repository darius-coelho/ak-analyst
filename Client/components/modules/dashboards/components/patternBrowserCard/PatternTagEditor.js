import React, { useState, useEffect } from 'react';
import { HexColorPicker } from "react-colorful";

import "./css/PatternTagEditor.css"

const TagEditor = (props) => {
  if(!props.show){
    return null
  }

  const { label, name, color, addTag, onCancel } = props

  const [newColor, setNewColor] = useState()
  const [newTagName, setNewTagName] = useState()

  /** Update menu hole size on adding a tag. */
  useEffect(() => {
    setNewTagName(name)
    setNewColor(color)
  }, []);

  /** Handles setting a name for a new tag. */
  const onChangeTagName = (evt) => {
    setNewTagName(evt.target.value)
  }

  /** Handles setting a color for a new tag. */
  const onChangeColor = (color) => {
    setNewColor(color)
  }

  /** Passing up the new tag name and color to the fuction addTag. */
  const onAddTag = () => {
    addTag(newTagName, newColor)
  }

  return(
    <div className='patternTagEditorColorPicker'>
      <HexColorPicker color={newColor} onChange={onChangeColor} />
      <input
        type="text"
        value={newTagName}
        className='patternTagEditorEdit'
        onClick={(e) => e.stopPropagation()}
        onChange={onChangeTagName}
        placeholder="New tag name"
      />
      <div className='coreButtonSmall patternTagEditorButton' onClick={onAddTag}>{label}</div>
      <div className='coreButtonSmall patternTagEditorButton' onClick={onCancel}>Cancel</div>
    </div>
  )
}


const TagEditorOption = (props) => {
  

  const { name, color, checked, onToggleTag, editTag, removeTag } = props
 
  const [showEditTag, setShowEditTag] = useState(false)

  const onEditTag = (newName, newColor) => {
    setShowEditTag(false)
    editTag(name, newName, newColor)
  }

  if(showEditTag) {
    return (
      <TagEditor
        label={"Edit Tag"}
        name={name}
        color={color}
        show={showEditTag} 
        addTag={onEditTag}
        onCancel={() => setShowEditTag(false)}
      />
    )
  }

  return(
    <div className='patternTagEditorOption'>
      <input
        className='patternTagEditorOptionCheck'
        type="checkbox"
        checked={checked}
        onClick={(evt) => onToggleTag(evt, name)}
      />
      <div className='patternTagEditorOptionLabel' style={{background: color}}>
        {name}
      </div>
      <i
        className="material-icons-round tagEditIcon"
        title={"Edit Tag"}
        onClick={() => setShowEditTag(true)}>
          edit
      </i>
      <i
        className="material-icons-round tagEditIcon"
        title={"Delete Tag"}
        onClick={() => removeTag(name)}>
          delete
      </i>      
    </div>
  )
}


/**
 * Renders a tag editor component
 * @param {number} listIdx - The index of the current card's list
 * @param {number} cardIdx - The index of the current card in its current list
 * @param {json} allTags - An object mapping the names of all pattern tags to colors
 * @param {array} cardTags - List of all tags assigned to this pattern
 * @param {function} addNewTag - The function that handles creating a new tag
 * @param {function} changePatternTag - The function that handles adding/removing a tag for a pattern
 * @param {function} onHideTagEditor - Function that handles hiding this component
 */
const PatternTagEditor = (props) => {
  if(!props.show){
    return null
  }
  
  const { listIdx, cardIdx, allTags, cardTags, addNewTag, editTag, removeTag, changePatternTag, onHideTagEditor } = props
  
  const [showCreateTag, setShowCreateTag] = useState(false)

  /** Handles adding a new tag. */
  const addTag = (newName, newColor) => {
    if (newName.length > 0) {
      addNewTag(newName, newColor, listIdx, cardIdx)
      setShowCreateTag(false)
    }
  }

  /** Handles toggling assigning a tag to the pattern. */
  const onToggleTag = (evt, tag) => {
    changePatternTag(listIdx, cardIdx, tag)
  }

  /** Handles showing the create tag elements. */
  const onShowCreateTag = (evt) => {
    setShowCreateTag(true)
  }

  return (
    <div className='patternTagEditorBox'>
      <div className='patternTagEditorTitle'>Tags</div>
      <div className='patternTagEditorLabel'>
        Tags:
      </div>
      {
        Object.keys(allTags).map((name, idx) =>
          <TagEditorOption
            key={name}
            name={name}
            color={allTags[name]}
            checked={cardTags.includes(name)}
            onToggleTag={onToggleTag}
            editTag={editTag}
            removeTag={removeTag}
          />
        )
      }

      <TagEditor
        label={"Add Tag"}
        name={""}
        color={'#c6e6fc'}
        show={showCreateTag} 
        addTag={addTag}
        onCancel={() => setShowCreateTag(false)}
      />

      <div className='coreButtonSmall patternTagEditorButton' style={{display: showCreateTag ? 'none' : 'block'}} onClick={onShowCreateTag}>Create Tag</div>
      <div className='coreButtonSmall patternTagEditorButton' onClick={onHideTagEditor}>Done</div>
    </div>
  );
}

export default PatternTagEditor;
