import React, { useState } from 'react';

import TableOutput  from "./TableOutput";

import ErrorReportOutput from './ErrorReportOutput';

export function PredictActionOutput(props) {
  if (!props.output)  return null;
  if (!props.output[0]) return null;

  const [ tabId, setTabId ] = useState(0)

  const { preview, error } = props.output[0];

  if (!preview)  return null;
  
  if (Object.keys(error).length == 0) {
    return <TableOutput {...props} />;
  }

  const output = props.output[0];
  
  const tabStyle = {
    display: "inline-block",
    fontSize: 15,
    width: "fit-content",
    background: "#e7e7e7",
    border: "1px solid #c8c9ca",
    borderRadius: "5px 5px 0px 0px",      
    borderBottom: "None",
    margin: "0px 0px",
    padding: "0px 5px",
    cursor: "pointer"
  }

  const tab1Style = {
    ...tabStyle,
    background: tabId == 0 ? "#e7e7e7" : "#ffffff",
    color: tabId == 0 ? "#000000" : "#5e5e5e"
  }
  
  const tab2Style = {
    ...tabStyle,
    background: tabId == 1 ? "#e7e7e7" : "#ffffff",
    color: tabId == 1 ? "#000000" : "#5e5e5e"
  }

    return (
      <div style={{textAlign: "left", height:"calc(100% - 40px)", margin: 10, marginTop:0}}>       
        <div style={tab1Style} onClick={() => setTabId(0)}>Prediction Results</div>
        <div style={tab2Style} onClick={() => setTabId(1)}>Error Results</div>
        <div style={{border: "1px solid #c8c9ca", height: "calc(100% - " + 20 + "px)"}}>
          <div style={{display: tabId===0 ? 'block': 'none', height: "100%"}}>
	    <TableOutput {...props} />
          </div>
          <div style={{display: tabId===1 ? 'block': 'none'}}>
            <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>
            <ErrorReportOutput output={output} isTrain={false}/>
          </div>
        </div>
     </div>
  );
}

export default PredictActionOutput;
