import React from 'react';
import Select from 'react-select';

import "./css/StatusBar.css"

/**
 * Renders status bar giving a summary of the mining results
 * @param {string} target - The target attribute or feature of the mining procedure
 * @param {string} targetType - The target type - numerical/binary
 * @param {int} patternCount - Number of pattern found by the AK Miner
 * @param {int} dataCount - Number of data items mined over
 * @param {int} featureCount - Number of dfeatures or attributes in the data
 */
const StatusBar = (props) => {  
  
  const { style, targets, selectedTarget, targetType, setSelectedTarget,
          patternCount, dataCount, featureCount } = props
  
  // Dropdown styles
  const customStyles = {
    valueContainer: base => ({
      ...base,
      minHeight: 32,
      overflow: "auto",
      maxHeight: 100,
      margin: 2
    }),
  };

  return (
    <div className="contentdiv" style={{...style}}>
      <div className="statusTarget">Target: </div>
      {
        targets.length > 1
        ? <select className="statusTargetSelect" value={selectedTarget} onChange={(e) => setSelectedTarget(e.target.value)}>
            {targets.map((d,i) => <option key={i} value={d}>{d}</option>)}
          </select>
        : <div className="statusTarget"><b>{selectedTarget}</b></div>
      }
      <div className="statusTarget">{`(${targetType})`}</div>
      
      <div className='statusMiningResult'>
        Mined <b>{parseInt(patternCount)}</b> patterns
        from <b>{parseInt(dataCount)}</b> data items
        with <b>{parseInt(featureCount)}</b> features.
      </div>
    
    </div>
  );  
}

export default StatusBar;