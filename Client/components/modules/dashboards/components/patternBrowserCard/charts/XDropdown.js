import React from 'react';

/**
 * Renders a dropdown for the X axis label in a chart
 * @param {string} selected - The target attribute or feature of the mining procedure
 * @param {list} options - The target type - numerical/binary
 * @param {int} width - width of parent chart
 * @param {int} height - height of parent chart
 * @param {int} padding - padding of parent chart
 * @param {function} onChange - function to be triggered on change of the dropdown
 */
const XDropdown = (props) => {
  const { selected, options, width, height, padding, onChange } = props

  const optionChanged = (e) => {
    onChange(e.target.value)
  } 
  
  return (
    <select
        value={selected}
        style={{
          position: "absolute",
          width: 120,
          marginTop: height-padding+31,
          marginLeft: width-padding-110,
          fontSize: 12,
          fontWeight: "bold",
          border: "none",
          cursor: "pointer",
          textAlign: "right"
        }}
        onChange={optionChanged}
      >
        {options.map(
          (option, index) => <option value={option} key={`opt-${index}`}>{option}</option>
        )}
      </select>
  );  
}

export default XDropdown;