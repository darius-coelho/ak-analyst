import React, { useState, useContext } from 'react';
import axios from 'axios';

import { isPathReady } from '../../graph/components/Action.prototype';
import DataTable from '../../charts/components/DataTable'

import AddressContext from "../../../AddressContext";

import { useInfoToastContext } from '../../common/components/InfoToastContext';

import '../../../css/Core.css'

/**
  * Displays output of the split data action 
  * as multiple tables that cab be accesed with tabs
  * @param {Object} props.output - the output of the split data action 
  *                                which is a list of data objects.
  */
const SplitDataActionOutput = React.memo((props) => {
    if (!props.output || props.output.length < 2)  return null;
    
    if (!props.output[0] || !props.output[1]){
      return null
    }
    
    const [ tabId, setTabId ] = useState(0)

    const context = useContext(AddressContext);

    // get react context to set an info toast
    const addInfoToast = useInfoToastContext();

    const onDownload = () => {
      const execData = {
        ...props.pathTo(),
        outPort: tabId
      }
      
      const isReady = isPathReady(execData) // check if the current path is ready to be executed      
      if(isReady){
        // Execute if ready
        const endPoint = context.address + "DownloadFileResult"
        axios.post(endPoint, execData, {withCredentials: true})
          .then((res) => {
            // Set loading flag when output ready
            var dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(res.data);
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "data.csv");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
          },
          (error) => {
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

    const buttonStyle = {position: "absolute", right: 5, top: 30};

    return (    
      <div style={{textAlign: "left", height:"calc(100% - 40px)", margin: 10, marginTop:0}}>
        
        <div style={tab1Style} onClick={() => setTabId(0)}>Data 1 Preview</div>
        <div style={tab2Style} onClick={() => setTabId(1)}>Data 2 Preview</div>
        <div style={{border: "1px solid #c8c9ca", height: "calc(100% - " + 20 + "px)"}}>
          <DataTable
            show={true}
            data={props.output[tabId].preview}
            rows={10}
            top={15}
            left={15}
            width={"calc(100% - " + 30 + "px)" }
            height={"calc(100% - " + 30 + "px)" }
          />
        </div>
        <button
          className="coreButtonSmall"
          onClick={onDownload}
          style={buttonStyle}>
            {"Download"}
        </button>

      </div>
    )
  },
  (prevProps, nextProps) => {
    const prevOutput = prevProps.output
    const nextOutput = nextProps.output
    if(prevOutput == null | nextOutput == null) return false;

    if (prevOutput.length < 2 || nextOutput.length < 2) return false;

    if (!prevOutput[0] || !prevOutput[1] || !nextOutput[0] || !nextOutput[1]){
      return null
    }

    // if the same file with the same options do not re-render the table
    if(prevOutput[0].lastModified == nextOutput[0].lastModified & prevOutput[0].path == nextOutput[0].path){
      // If file load options passed the re-render if options have changed
      if(prevOutput[0].options && nextOutput[0].options){
        const options = Object.keys(prevOutput[0].options)
        for(var i=0; i< options.length; i++){
          const k = options[i]
          if(prevOutput[0].options[k] != nextOutput[0].options[k]){
            return false
          }
        }
      }
      return true
    }    
    return false
  }
)


export default SplitDataActionOutput;
