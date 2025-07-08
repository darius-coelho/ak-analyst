import React from 'react';

import "./css/PatternTags.css"


/**
 * Renders a set of tags associated with a pattern 
 * @param {string} view - String indicating the view type - 'detail' or 'peek'
 * @param {json} allTags - An object mapping the names of all pattern tags to colors
 * @param {array} cardTags - List of all tags assigned to this pattern
 * @param {string} size - String indicating the style for the tag - 'Small' or 'Large'
 * @param {string} margin - String for the css margin value
 * @param {boolean} hasAddBtn - Function that handles hiding this component
 * @param {function} onShow - Function to show the tag editor
 */
const PatternTags = (props) => {
  
  const { view, allTags, cardTags, size, margin, hasAddBtn, onShow } = props

  return(
    <div className={view=='detail' ? 'patternDetailTagsBox' : 'patternTagsBox'} style={{margin: margin}}>
      {
        cardTags.map((d,i) => 
          <div className={`patternTag${size}`} key={`tag-${i}`} style={{background: allTags[d]}} title={d}>
            {d}
          </div>
        )
      }
      {
        hasAddBtn
        ? <div className='addTagBtn' onClick={onShow}>+</div>
        : null
      }
    </div>
  )
}

export default PatternTags;
