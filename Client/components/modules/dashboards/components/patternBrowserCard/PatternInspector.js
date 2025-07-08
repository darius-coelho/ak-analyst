import React from 'react';

import PatternPeek from './PatternPeek';
import PatternDetail from './PatternDetail';

import { Transition } from 'react-transition-group'

import "./css/PatternInspector.css"

const duration = 300;

const defaultStyle = {
  transition: `opacity ${duration}ms ease-in-out, width ${duration}ms ease-in-out, left ${duration}ms ease-in-out`,
  opacity: 0,
  display: 'inline-block',
}

const transitionStyles = {
  entering: { opacity: 0},
  entered: { opacity: 1},
  exiting: { opacity: 1},
  exited: { opacity: 0},
};

/**
 * Renders a view the pattern details
 * @param {json} style - A style object for the div containing the pattern detail.
 * @param {json} pattern - object containing the selected pattern details.
 * @param {json} selectedPattern - Object containing the list id and card id of the selected pattern
 * @param {json} overallSummary - Summary of the dataset and mining results
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {list} data - The data sample 
 * @param {string} target - The target attribute 
 * @param {string} targetType - The mining target type
 * @param {function} changePatternName - Function to change the name of a pattern
 * @param {function} changeFilter - Function to set a filter on the data
 * @param {function} onShowTable - Function to show the data table
 * @param {function} onDownloadData - Function to download the data as a csv
 */
const PatternInspector = (props) => {
  const { view, selectedPattern, patternList } = props

  if(view == 'default' || selectedPattern == null){
    return null
  }

  if(selectedPattern.listID >= patternList.length || selectedPattern.cardID >= patternList[selectedPattern.listID].patterns.length){
    return null
  }
  
  const pattern = patternList[selectedPattern.listID].patterns[selectedPattern.cardID]
  let enhance = []
  let generalize = []
  let related = []

  if(view == 'detail'){
    for(let i=0; i<patternList.length; i++){
      const listID = i;
      const patterns = patternList[i].patterns
      for(let j=0; j<patterns.length; j++){
        const pID = patterns[j].ID
        if(pattern.enhance.includes(pID)){
          enhance.push({
            ...patterns[j],
            listID: listID,
            cardID: j
          })
        }
        if(pattern.generalize.includes(pID)){
          generalize.push({
            ...patterns[j],
            listID: listID,
            cardID: j
          })
        }
        if(pattern.related.includes(pID)){
          related.push({
            ...patterns[j],
            listID: listID,
            cardID: j
          })
        }
      }
    }
  }
  
  return(
    <Transition  in={true} timeout={duration} appear={true}>
      {(state) => (
        <div
          className="contentdiv"
          style={{
            ...props.style,
            ...defaultStyle,
            ...transitionStyles[state]
          }}>
            { view == 'detail'
            ? <PatternDetail {...props} {...{pattern, enhance, generalize, related}} />
          : <PatternPeek {...props} pattern={pattern} />}
        </div>
      )}
    </Transition>
  );
}

export default PatternInspector;