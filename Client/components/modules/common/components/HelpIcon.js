import React from 'react'

import Tooltip from "@material-ui/core/Tooltip";


/**
 * Component which renders a help icon with the message. 
 * @param {string} content - text content to display. 
 */
export function HelpIcon(props) {
  const { content, textStyle, iconStyle } = props;  
  
  return (
    <Tooltip title={<div className='helpIconText' style={textStyle}>{content}</div>} placement="bottom">
      <i className="material-icons-outlined helpIcon" style={iconStyle}>info</i>
    </Tooltip>
  );
  
}

export default HelpIcon;