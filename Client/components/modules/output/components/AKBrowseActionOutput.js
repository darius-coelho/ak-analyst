import React from 'react';
import "../../../css/Core.css"

export function AKBrowseActionOutput(props) {
  let msg = `Browse patterns by clicking the pattern browser button in the panel to the left.`

  if (!props.output || !props.output[0] || props.output[0].errMsg.length < 1){
    if(props.output && props.output[0] && props.output[0].selectedPatterns) {      
      return(  
        <div>
          <div style={{margin:20}}>
            <b>Number of Patterns Selected:</b> {props.output[0].selectedPatterns.length}
          </div>
        </div>
      );
    }
    return(  
      <div>
        <div className="placeholderText">{msg}</div>
      </div>
    );
  }  
    
  return(
    <div>
      <div
        className="placeholderText"
        style={{"color": "#ab0000", fontWeight: 800}}>
          {props.output[0].errMsg}
      </div>
    </div>
  );
}

export default AKBrowseActionOutput;
