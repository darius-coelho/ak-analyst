import React from 'react';

import HelpIcon from "../../../common/components/HelpIcon"
import PatternBubblePlot from './charts/PatternBubblePlot';

import { Transition } from 'react-transition-group'

const duration = 300;

const defaultStyle = {
  transition: `opacity ${duration}ms ease-in-out, width ${duration}ms ease-in-out, height ${duration}ms ease-in-out, top ${duration}ms ease-in-out, left ${duration}ms ease-in-out`,
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
 * Renders a view the pattern details
 * @param {json} style - A style object for the div containing the pattern detail.
 * @param {function} toggleExpandBubble - function to toggle the size of the bubble component
 * @param {string} target - The target attribute or feature of the mining procedure
 * @param {string} targetType - The target type - numerical/binary
 * @param {json} overallSummary - Summary stats of the dataset that was mined
 * @param {array} features - List of feature objects
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {array} patternSet - Array of array of objects representing lists of patterns.
 * @param {array} highlightedFeatures - Array of features that have been highlighted in the interface
 * @param {json} selectedPattern - Object contianing the listID, cardID and patternID of the selected pattern
 * @param {function} onSelectPattern - Function to be triggered when a bubble is clicked/selected
 */
const PatternBubble = (props) => {
  const { style, targetType, layout, toggleExpandBubble } = props
  
  if(style == null || layout == 'detail') {
    return null
  }
  
  return(
    <Transition in={true} timeout={duration} appear={true}>
      {(state) => (
        <div
          className="contentdiv"
          style={{
            ...style,
            ...defaultStyle,
            ...transitionStyles[state]
          }}>
            <label className="contentDivHead" title={"Pattern Overview"}>Pattern Overview</label>
            <i
              className="material-icons-round closeIcon"
              style={{position: 'absolute', right: 8, top: 30, fontSize: 17, cursor: "pointer"}}
              onClick={toggleExpandBubble}>
                {layout=='bubble' ? 'close_fullscreen' : 'open_in_full'}
            </i>
            <HelpIcon
              content={
                `This panel shows an overview of the patterns with a bubble plot.
                Here each bubble's size represents the number of data points that the pattern encompasses.
                The y-position represents the ${targetType == 'numeric' ? "mean value of the target across points in the pattern." : "the probability of a point's target value within the pattern being 1."}
                The x-position represents the mean(numeric) or most frequent(nominal) value of the selected x-attribute for the pattern. You can change the selected attribute via the dropdown below the x-axis.
                Bubbles are colored green if a pattern has an increased ${targetType == 'numeric' ? "target mean" : "probability"} over that of the entire dataset.
                They are colored red otherwise.`
              }/>
            <PatternBubblePlot
              {...props}
              width={style.width}
              height={style.height-40}
              padding={60}
            />
        </div>
      )}
    </Transition>
  );
}

export default PatternBubble;