import React, { useContext } from 'react';
import axios from 'axios';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import { isPathReady } from '../../graph/components/Action.prototype';

import AddressContext from "../../../AddressContext";

import { useInfoToastContext } from '../../common/components/InfoToastContext';

import "../css/Output.css"

export function AKMineActionOutput(props) {
  
  if (!props.output){
    return null
  } 

  const output = props.output[0]
  
  if (!output){
    return null
  }

  const { target } = props;
  
  const context = useContext(AddressContext);

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();
  
  const divStyle = {
    top:  85,
    left: 10,
    width: "calc(100% - 25px)",
    height: "calc(100% - 90px)",
    overflow: 'auto',
    zIndex: 0
  }
  
  const buttonStyle = {position: "absolute", right: 5, top: 30};

  /** Handles request to generate csv description of the patterns. */
  const onExportPatterns = () => {
    const execData = props.pathTo()
    const isReady = isPathReady(execData) // check if the current path is ready to be executed

    if(isReady){
      // Execute if ready
      const endPoint = context.address + "ExportPatterns"

      axios.post(endPoint, execData, {withCredentials: true})
        .then((res) => {  
          // Set loading flag when output ready	  
          var dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(res.data);
          var downloadAnchorNode = document.createElement('a');
          downloadAnchorNode.setAttribute("href", dataStr);
          downloadAnchorNode.setAttribute("download", `patterns_for_${target}.csv`);
          document.body.appendChild(downloadAnchorNode); // required for firefox
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
	  
        }, (error) => {
          const errRes = error.response.data
          props.handleNodeError(errRes.nodeID, errRes.action_type, errRes.err)
          props.setOutput([null]);
          addInfoToast(error.response.data.err, 'danger');
        })
    }
    else{
      // Alert user that path not ready for execution      
      addInfoToast(
        "Could not run as the action or its predecessors are not ready.",
        'danger'
      );
    }
  }

  
  return (
    <div style={{textAlign: "left", height:"calc(100% - 40px)", margin: 10, marginTop:0}}>
        <Row><Col lg='12' style={{fontSize: "15px"}}>Mining Results</Col></Row>
        <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>
        <Row style={{height:"calc(100% - 40px)"}}><Col lg='12'>
          <div className="contentInnerdiv" style={divStyle}>

          <div className='tableContainer'>
            <div className='tableHead'>Input Data Properties</div>

            <div 
              className='tableRow' 
              title={`${output.itemCount} data items were used for pattern mining.`}
              >
              <label className='labelCell'>
                {"Item Count"}
              </label>
              <label className='valueCell'>
                {output.itemCount}
              </label>
            </div>

            <div 
              className='tableRow' 
              title={`${output.featureCount - 1} data features or attributes were used for pattern mining.`}
              >
              <label className='labelCell'>
                {"Feature Count"}
              </label>
              <label className='valueCell'>
                {output.featureCount - 1}
              </label>              
            </div>
          </div>

          <div className='tableContainer'>
            <div className='tableHead'>Mined Patterns - Details</div>

            <div 
              className='tableRow' 
              title={`${output.patternCount} patterns are found.`}
              >
              <label className='labelCell'>
                {"Pattern Count"}
              </label>
              <label className='valueCell'>
                {output.patternCount}
              </label>
            </div>

            <div 
              className='tableRow' 
              title={`${output.maxItems} data items are in the largest pattern.`}
              >
              <label className='labelCell'>
                {"Largest Pattern"}
              </label>
              <label className='valueCell'>
                {output.maxItems}
              </label>              
            </div>

            <div 
              className='tableRow' 
              title={`${output.minItems} data items are in the smallest pattern.`}
              >
              <label className='labelCell'>
                {"Smallest Pattern"}
              </label>
              <label className='valueCell'>
                {output.minItems}
              </label>              
            </div>

            <div 
              className='tableRow' 
              title={`${output.maxAttr} features are the maximum used to define a pattern.`}
              >
              <label className='labelCell'>
                {"Maximum Feature Count"}
              </label>
              <label className='valueCell'>
                {output.maxAttr}
              </label>              
            </div>

            <div 
              className='tableRow' 
              title={`${output.minAttr} features are the minimum used to define a pattern.`}
              >
              <label className='labelCell'>
                {"Minimum Feature Count"}
              </label>
              <label className='valueCell'>
                {output.minAttr}
              </label>              
            </div>
          </div>

          </div>          
          </Col>
      </Row>
      <button
        className="coreButtonSmall"
        onClick={onExportPatterns}
        style={buttonStyle}>
          {"Export Patterns"}
      </button>
    </div>
  );  
}

export default AKMineActionOutput;
