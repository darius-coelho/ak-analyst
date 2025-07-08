import React, { useState, useEffect } from 'react';
import { Droppable } from "react-beautiful-dnd";

import { DraggablePatternCard } from './PatternCard';

import "./css/PatternList.css"
import PatternListFilter from './PatternListFilter';
import { difference} from 'lodash';
import { max } from 'd3';

/**
 * Renders all pattern cards
 * @param {string} target - The mining target attribute or feature
 * @param {string} targetType - The mining target type
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {json} overallSummary - Summary of the dataset and mining results
 * @param {int} listId - The list ID or index
 * @param {list} patterns - List of mined patterns belonging to this pattern list
 * @param {json} filters - All the filters applied to the pattern list
 * @param {array} patternSetMin - A minimal version of the pattern list set
 * @param {array} highlightedFeatures - List og highlighted features
 * @param {function} changePatternName - Function to change the name of a pattern
 * @param {json} selectedPattern - Object containing details of the selected pattern
 * @param {function} onSelectPattern - Function to select a pattern card
 * @param {function} changeList - Function that handles moving a pattern to a different list
 * @param {array} likedPatterns - The list patterns that have been added to the output/liked
 * @param {function} toggleAddOutput -  The function that handles adding/removing a pattern from the output/liked list
 * @param {json} allTags - An object mapping the names of all pattern tags to colors
 * @param {json} cardEditParams - An object containign the indices of the list and card being edited
 * @param {boolean} showCardEdit - Flag indicating if the card edit menu is shown
 * @param {function} onShowCardEdit - Function to show the card edit menu
 */
const PatternListItems = (props) => {
  const { target, targetType, catLabels, overallSummary, listId, patterns, filters, patternSetMin,
	  highlightedFeatures, changePatternName, selectedPattern, onSelectPattern, changeList,
	  likedPatterns, toggleAddOutput, allTags, cardEditParams, showCardEdit, onShowCardEdit } = props
  
  const isPatternShown = (d) => {
    const minSize = 100*(+d.stats[target].size)/overallSummary.stats[target].size
    const maxSize = 100*(+d.stats[target].size)/overallSummary.stats[target].size
    const stat = targetType == 'numeric' 
                 ? (+d.stats[target].mu - overallSummary.stats[target].mu)
                 : (+d.stats[target].prob - overallSummary.stats[target].prob)*100
    
    const inRanges =  minSize >= filters.size.selected[0] && maxSize <= filters.size.selected[1]
                      && ((stat >= filters.stat[target].selected[0] && stat <= filters.stat[target].selected[1]) 
                          || (filters.stat[target].domain[0] == filters.stat[target].selected[0] 
                              && filters.stat[target].domain[1] == filters.stat[target].selected[1])
                         )
                      && d.core.length >= filters.numCore.selected[0] && d.core.length <= filters.numCore.selected[1]

    const hasCore = difference(filters.features, d.core).length == 0

    return inRanges && hasCore
  }
  
  return(
    patterns.map( (d, i) =>
      <DraggablePatternCard
        view={'list'}
        showPattern={isPatternShown(d)}
        patternSetMin={patternSetMin}
        changeList={changeList}
        target={target}
        targetType={targetType}
        listId={listId}
        data={d}
        catLabels={catLabels}
        overallSummary={overallSummary}
        highlightedFeatures={highlightedFeatures}
        index={i}
        key={i}
        changePatternName={changePatternName}
        selectedPattern={selectedPattern}
        onSelectPattern={onSelectPattern}
        toggleAddOutput={toggleAddOutput}
        likedPatterns={likedPatterns}
        allTags={allTags}
        cardEditParams={cardEditParams}
        showCardEdit={showCardEdit}
        onShowCardEdit={onShowCardEdit}
      />
    )
  )
}

/**
 * Renders a patterns list
 * @param {string} target - The mining target attribute or feature
 * @param {string} targetType - The mining target type
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {json} overallSummary - Summary of the dataset and mining results
 * @param {list} patterns - List of mined patterns belonging to this pattern list
 * @param {json} filters - The status of filters and options for the list
 * @param {function} changeFilter -Function to set filters on a pattern list
 * @param {function} sortList - Function to sort a pattern list
 * @param {int} id - The list ID or index
 * @param {string} name - The list name
 * @param {array} patternSetMin - A minimal version of the pattern list set
 * @param {Array} highlightedFeatures - List of highligeted features
 * @param {function} changeListName - Function to change the list name
 * @param {function} removeList - Function to delete a pattern list
 * @param {function} changePatternName - Function to change the name of a pattern
 * @param {json} selectedPattern - Object containing details of the selected pattern
 * @param {function} onSelectPattern - Function to select a pattern card
 * @param {function} changeList - Function that handles moving a pattern to a different list
 * @param {array} likedPatterns - The list patterns that have been added to the output/liked
 * @param {function} toggleAddOutput -  The function that handles adding/removing a pattern from the output/liked list
 * @param {json} allTags - An object mapping the names of all pattern tags to colors
 * @param {json} cardEditParams - An object containign the indices of the list and card being edited
 * @param {boolean} showCardEdit - Flag indicating if the card edit menu is shown
 * @param {function} onShowCardEdit - Function to show the card edit menu
 */
const PatternList = (props) => {
  const { target, targetType, catLabels, overallSummary, patterns, filters,
	  changeFilter, sortList, id, name, patternSetMin, highlightedFeatures,
	  changeListName, removeList, changePatternName, selectedPattern,
	  onSelectPattern, changeList, likedPatterns, toggleAddOutput, allTags,
    cardEditParams, showCardEdit, onShowCardEdit, onShowPatternBuilder} = props

  const [ showEdit, setShowEdit ] = useState(false)
  const [ newName, setNewName ] = useState(name)

  // Forwared escape key press to rename function
  useEffect(() => {
    function onKeyup(e) {
      if (e.key === 'Escape') onRename(e)
    }
    window.addEventListener('keyup', (onKeyup));
    return () => window.removeEventListener('keyup', onKeyup);
  }, []);

  // When name changes from parent set newName to name
  useEffect(() => {
    setNewName(name)
  }, [name, setNewName])
  
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
        changeListName(id, newName)
      }
      setShowEdit(false)
    }
    if(ev.key === "Escape") {
      ev.preventDefault();
      setNewName(name)
      setShowEdit(false)
    }
  }

  /**
   * Resets newName to name when clicking outside the text box and hides text input.
   */
  const onBlurNewName = () => {
    setNewName(name)
    setShowEdit(false)
  }

  /**
   * Changes list background when item is dragged over it
   * @param {boolean} isDraggingOver - Flag indicating if an item is dragged over the list.
   */
  const getListStyle = isDraggingOver => ({
    background: isDraggingOver ? "#b6d6ac" : "#edf0f1"
  });

  return (
    <div className='patternList'>
      <div className='patternListHead'>
        <div style={{display: showEdit ? 'none' : 'inline-block'}}>
          {name}
          { // Prevent renaming first list i.e. mined patterns
            id !== 0
            ? <i
                className="material-icons-round patternListHeadEdit"
                onClick={() => setShowEdit(true)}>
                  edit
              </i>
            : null
          }
        </div>
        <div style={{display: showEdit ? 'inline-block' : 'none'}}>
          <input
            type="text"
            className="coreTextInput"
            value={newName}
            style={{margin: 0, width: "10em"}}
            onChange={onChangeNewName}
            onKeyPress={onRename}
            onBlur={onBlurNewName}
          />
        </div>
      </div>
      { // Prevent deleting i.e. mined patterns
        id !== 0
        ? <div className='patternListDelete' onClick={() => removeList(id)}>
            <i className="material-icons-round" style={{fontSize: 22}}>delete</i>
          </div>
        : null
      }

      <PatternListFilter
        target={target}
        targetType={targetType}
        listId={id}
        attributes={Object.keys(overallSummary.attributes)}
        patterns={patterns}
        maxCore={max(patterns, d => d.shaps.length)}
        filters={filters}
        changeFilter={changeFilter}
        sortList={sortList}
      />

      <Droppable droppableId={`${id}`}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            className="patternInnerList"
            style={getListStyle(snapshot.isDraggingOver)}
            {...provided.droppableProps}
          >
          
            {
              <PatternListItems
                target={target}
                patternSetMin={patternSetMin}
                changeList={changeList}
                targetType={targetType}
                patterns={patterns}
                filters={filters}
                overallSummary={overallSummary}
                highlightedFeatures={highlightedFeatures}
                catLabels={catLabels}
                listId={id}
                changePatternName={changePatternName}
                selectedPattern={selectedPattern}
                onSelectPattern={onSelectPattern}
                likedPatterns={likedPatterns}
                toggleAddOutput={toggleAddOutput}
                allTags={allTags}
                cardEditParams={cardEditParams}
                showCardEdit={showCardEdit}
                onShowCardEdit={onShowCardEdit}
              />
            }
            <div style={{textAlign: 'center'}}>
            <div
              style={{
                background: "#afafaf",
                margin: 15,
                width: 70,
                borderRadius: 3,
                display: 'inline-block',
                verticalAlign:'middle',
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onClick={() => onShowPatternBuilder(id)}>
              <i className="material-icons-round" style={{fontSize: 30, marginTop: 5, color: '#505050'}}>add</i>
            </div>
            </div>
            {provided.placeholder}
          </div>
        )}
    </Droppable>
    </div>
  );
}

export default PatternList;
