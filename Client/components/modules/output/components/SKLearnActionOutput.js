import React, { useState } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import ErrorReportOutput from './ErrorReportOutput';

import api from '../../../../apis/api';

import { useInfoToastContext } from '../../common/components/InfoToastContext';

import "../css/Output.css";
import '../../../css/Core.css'

/** Renders the error metrics. */
function ErrorReport(props) {
  const output = props.output;

  return (
    <div style={{textAlign: "left", height:"calc(100% - 40px)", margin: 10, marginTop:0}}>
      <Row><Col lg='12' style={{fontSize: "15px"}}>Model Fit Results</Col></Row>
      <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>
      <ErrorReportOutput output={output} isTrain={true}/>
    </div>
  );
}

/** 
 * Renders the output panel content for the SKLearn action.
 * @param {json} output - Object containing the info for the output panel.
 */
export function SKLearnActionOutput(props) {
  if (!props.output){
    return null
  } 

  const output = props.output[0]
  
  if (!output){
    return null
  }

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();

  /** Exports the model as a pickle file. */
  const onExport = () => {
    const execData = props.pathTo();
    const modelName = execData.config.model.label;

    api.exportModel(execData, (res)=>{
      const blob = new Blob([res.data], {type: "octet/stream"})
      const url = window.URL.createObjectURL(blob);
      
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", url);
      downloadAnchorNode.setAttribute("download", `${modelName}.pickle`);
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();

      window.URL.revokeObjectURL(url);
    }, (error)=>{
      try {
	      const errRes = error.response.data
        addInfoToast(error.response.data.err, 'danger')
      } catch(e) {
        addInfoToast(error, 'danger')
      }
    });
  }
  
  const buttonStyle = {position: "absolute", right: 5, top: 30};
  if (!('summary' in output)) {
    // sklearn model
    return (
	<div>
	<Row><Col><ErrorReport output={output} /></Col></Row>
	<button
          className="coreButtonSmall"
          onClick={onExport}
          style={buttonStyle}>
            Export Model
        </button>
      </div>
    );
  }

  // statsmodels api
  const [ tabId, setTabId ] = useState(0)
  
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

  const nlines = output.summary.split(/\r\n|\r|\n/).length;
  
  const summaryStyle = {
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    height: `${nlines*1.5}rem`,
    overflow: 'auto'
  }

  return (
      <div style={{textAlign: "left", height:"calc(100% - 40px)", margin: 10, marginTop:0}}>
        <div style={tab1Style} onClick={() => setTabId(0)}>Model Summary</div>
        <div style={tab2Style} onClick={() => setTabId(1)}>Error Results</div>
        <div style={{border: "1px solid #c8c9ca", height: 'inherit', width: "calc(100% - 20px)", position: 'absolute', overflow: 'auto'}}>
          <div style={{display: tabId===0 ? 'block': 'none', ...summaryStyle}}>
            {output.summary}
          </div>
          <div style={{display: tabId===1 ? 'block': 'none'}}>
            <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>
            <ErrorReport output={output} />
          </div>
      </div>
      <button
          className="coreButtonSmall"
          onClick={onExport}
          style={buttonStyle}>
            Export Model
        </button>
     </div>
    );
}

export default SKLearnActionOutput;
