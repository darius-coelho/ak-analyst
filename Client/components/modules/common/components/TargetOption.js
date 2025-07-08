import React from 'react';

/** 
 * Component which helps with rendering the react-select target options. 
 * @param {string} name - Attributes name
 * @param {string} dtype - Data type of the attribute.
 */
export function TargetOption({name, dtype, message}) {
  const iconStyle = {
    fontSize: '16px',
    padding: 5,
    marginTop: '5px',
    color: "#7f8ae0"
  };
  
  
  if (dtype != "Numerical") {
    return (
	<span title={message}>
	{name}
	<i className="material-icons" style={iconStyle}>info</i>
	</span>
    );
  }
  
  return (<span>{name}</span>);  
}

export default TargetOption;
