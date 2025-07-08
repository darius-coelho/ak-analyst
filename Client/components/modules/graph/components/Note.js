import React, { useState } from 'react'
import { DraggableCore } from "react-draggable";
import { ContextMenuTrigger } from "react-contextmenu";

// Passes context menu trigger props to the context menu functions
function collect(props) {
  return { nid: props.nid };
}

export function Note(props) {
  const { id, x, y, width, height, content, focus, isEditing } = props

  // sets the delta to fix the note position relative to the mouse click position
  const [ delta, setDelta ] = useState({x: 0, y: 0})
  
  /**
   * Updates a the text of a notes
   */
  const onChange = (evt) => {
    props.setNoteConfig(id, {content: evt.target.value})
  }

  /**
   * Updates a notes position when the user drags it
   */
  const updateNotePos = (evt) => {
    if(focus){
      const rect = document.querySelector(".basic-container").getBoundingClientRect()    
      const offsetX = evt.clientX - rect.left - delta.x
      const offsetY = evt.clientY - rect.top  - delta.y
      props.setNoteConfig(id, {x: offsetX, y: offsetY})
    }    
  }

  /**
   * Focuses a note when the user interacts with it
   */
  const onStart = (evt) => {
    const rect = document.querySelector(".basic-container").getBoundingClientRect()    
    const offsetX = evt.clientX - rect.left
    const offsetY = evt.clientY - rect.top
    setDelta({
      x: offsetX - x,
      y: offsetY - y,
    })
    props.setNoteFocus(id)
  }

  const callbacks = {
    onStart: onStart,
    onDrag: updateNotePos,    
  }

  /**
   * Changes width of a note by extending left
   */
   const onDragHorzResizeLeft= (evt) => {    
    const rect = document.querySelector(".basic-container").getBoundingClientRect()    
    const offsetX = evt.clientX - rect.left  
    const wd = x - offsetX + width   
    if(focus){
      props.setNoteConfig(id, {x: offsetX, width: wd})
    } 
  }

  /**
   * Changes width of a note by extending right
   */
  const onDragHorzResizeRight= (evt) => {    
    const rect = document.querySelector(".basic-container").getBoundingClientRect()    
    const offsetX = evt.clientX - rect.left  
    const wd = offsetX - x    
    if(focus){
      props.setNoteConfig(id, {width: wd})
    } 
  }

  /**
   * Changes height of a note by extending upward
   */
   const onDragVertResizeTop = (evt) => {    
    const rect = document.querySelector(".basic-container").getBoundingClientRect()        
    const offsetY = evt.clientY - rect.top    
    const ht = y - offsetY + height
    if(focus){
      props.setNoteConfig(id, {y: offsetY, height: ht})
    } 
  }

  /**
   * Changes height of a note by extending downward
   */
  const onDragVertResizeBottom = (evt) => {    
    const rect = document.querySelector(".basic-container").getBoundingClientRect()        
    const offsetY = evt.clientY - rect.top    
    const ht = offsetY - y    
    if(focus){
      props.setNoteConfig(id, {height: ht})
    } 
  }
  
  /**
   * Sets flag to allow a note to be edited
   * i.e. activate the textarea
   */
  const onSetIsEditing = () =>{    
    props.setNoteConfig(id, {isEditing: true})
  }
  
  return (
    <ContextMenuTrigger id="note_context_menu" renderTag="g" nid={id} collect={collect}>
      <DraggableCore data-testid='dragger' handle=".dragit" {...callbacks}>      
        <g style={{pointerEvents: props.isEdgeDrag ? "none" : "all"}}>
          <rect data-testid='holder' className={`dragit ${ focus ? "holder-focus" : "holder"}`} key={0} x={x-1} y={y-2} width={width+3} height={height+3} />
          {
            isEditing 
            ? <foreignObject x={x} y={y} width={width} height={height}>
                <textarea data-testid='noteTextEdit' className='noteTextBox' value={content} onChange={onChange} />
              </foreignObject>
            : null
          }
          {
            !isEditing 
            ? <foreignObject className={`dragit`} x={x} y={y} width={width} height={height} onDoubleClick={onSetIsEditing} >
                <div className='noteTextDisplay'>{content}</div>
              </foreignObject>
            : null
          }

          <DraggableCore handle=".topVertResizer" onStart={onStart} onDrag={onDragVertResizeTop}>
            <line className='topVertResizer' x1={x} x2={x+width} y1={y} y2={y} />
          </DraggableCore>

          <DraggableCore handle=".bottomVertResizer" onStart={onStart} onDrag={onDragVertResizeBottom}>
            <line className='bottomVertResizer' x1={x} x2={x+width} y1={y+height-2} y2={y+height-2}/>
          </DraggableCore>

          <DraggableCore handle=".leftHorzResizer" onStart={onStart} onDrag={onDragHorzResizeLeft}>
            <line className='leftHorzResizer' x1={x} x2={x} y1={y} y2={y+height} />
          </DraggableCore>
          
          <DraggableCore handle=".rightHorzResizer" onStart={onStart} onDrag={onDragHorzResizeRight}>
            <line className='rightHorzResizer' x1={x+width-2} x2={x+width-2} y1={y} y2={y+height} />
          </DraggableCore>
        </g>      
      </DraggableCore>
    </ContextMenuTrigger>
  );
}

export default Note;
