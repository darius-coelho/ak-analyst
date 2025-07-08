import React, { useRef, useEffect }from 'react';
import { DragDropContext } from "react-beautiful-dnd";

import PatternList from './PatternList';
import HelpIcon from '../../../common/components/HelpIcon';

import { Transition } from 'react-transition-group'

const duration = 300;

const defaultStyle = {
  transition: `opacity ${duration}ms ease-in-out, width ${duration}ms ease-in-out, left ${duration}ms ease-in-out`,
  opacity: 0,
  display: 'inline-block',
}

const transitionStyles = {
  entering: { opacity: 1},
  entered: { opacity: 1},
  exiting: { opacity: 1},
  exited: { opacity: 0},
};

/**
 * Renders an set of pattern lists
 * @param {json} style - A style object for the div containing the list set.
 * @param {string} target - The mining target attribute or feature
 * @param {list} patternSet - List of pattern lists
 * @param {function} addList - Function to create a new a pattern list
 * @param {function} removeList - Function to delete a pattern list
 * @param {function} changeListName - Function to change the name of a pattern list
 * @param {function} changeFilter -Function to set filters on a pattern list
 * @param {function} sortList - Function to sort a pattern list
 * @param {array} patternSetMin - A minimal version of the pattern list set
 * @param {string} targetType - The mining target type
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {json} overallSummary - Summary of the dataset and mining results
 * @param {Array} highlightedFeatures - List of highligeted features
 * @param {function} onDragCard - Function to handle dragging a card within/between lists
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
const PatternListSet = (props) => {
  const { target, patternSet, addList, removeList, changeListName, changeFilter,
	  sortList, patternSetMin, targetType, catLabels,  overallSummary,
	  highlightedFeatures, onDragCard, changePatternName, selectedPattern,
	  onSelectPattern, changeList, likedPatterns, toggleAddOutput, allTags, cardEditParams, showCardEdit, onShowCardEdit, onShowPatternBuilder } = props

  const selectedRef = useRef(null)
  const executeScroll = () => {
    if(selectedRef.current) selectedRef.current.scrollIntoView({ inline: "center", behavior: 'smooth' })   
  }  

  return (
    <Transition in={true} timeout={duration} appear={true} 
    addEndListener={
      (node, done) => {
        node.addEventListener('transitionend',(e) => {
          executeScroll();
          done(e);
        }, false);
      }
    }
    >
    {(state) => (
      <div
        className="contentdiv"
        style={{
          ...props.style,
          overflowX: "auto",
          overflowY: "auto",
          whiteSpace: "nowrap",
          ...defaultStyle,
          ...transitionStyles[state]
        }}>
        <DragDropContext onDragEnd={onDragCard}>
        {
          patternSet.map((d,i) => {
            const itemProps = selectedPattern && selectedPattern.listID == i ? { ref: selectedRef } : {};
            return (

              <div key={`list-${i}`} style={{display: 'inline-block', height: "calc(100% - 5px)"}} {...itemProps}>
                <PatternList
                  id={i}
                  key={`list-${i}`}
                  patternSetMin={patternSetMin}
                  changeList={changeList}
                  target={target}
                  targetType={targetType}
                  name={d.name}
                  patterns={d.patterns}
                  filters={d.filters}
                  catLabels={catLabels}
                  overallSummary={overallSummary}
                  highlightedFeatures={highlightedFeatures}
                  changeListName={changeListName}
                  removeList={removeList}
                  changePatternName={changePatternName}
                  changeFilter={changeFilter}
                  sortList={sortList}
                  selectedPattern={selectedPattern}
                  onSelectPattern={onSelectPattern}
                  likedPatterns={likedPatterns}
                  toggleAddOutput={toggleAddOutput}
                  allTags={allTags}
                  cardEditParams={cardEditParams}
                  showCardEdit={showCardEdit}
                  onShowCardEdit={onShowCardEdit}
                  onShowPatternBuilder={onShowPatternBuilder}
                />
              </div>
            )
          })
        }
        </DragDropContext>
        <div
          style={{
            background: "#edf0f1",
            margin: 15,
            width: 100,
            display: 'inline-block',
            verticalAlign:'top',
            textAlign: 'center',
            cursor: 'pointer'
          }}
          onClick={addList}>
          <i className="material-icons-round" style={{fontSize: 40, color: '#505050'}}>add</i>
        </div>
        {
          props.style.width > 350 
          ? <HelpIcon        
              content={
                `This panel shows all the mined patterns with a card representation.
                Each card shows the top 3 core attributes that define the pattern, the effect on the target attribute and the percentage of the dataset that the pattern includes.
                The cards are initially placed in the mined patterns list.
                You can create more lists and rename them. Patterns can be moved to different lists. Lists can be sorted, filtered and rearranged.`
              }
            />
          : null
        }
      </div>  
    )}
    </Transition>
  );  
}

export default PatternListSet;
