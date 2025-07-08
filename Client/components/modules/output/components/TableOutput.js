import React, { useContext } from 'react';
import axios from 'axios';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import { isPathReady } from '../../graph/components/Action.prototype';
import DataTable from '../../charts/components/DataTable'

import AddressContext from "../../../AddressContext";

import { useInfoToastContext } from '../../common/components/InfoToastContext';

import '../../../css/Core.css'

function TableTitle(props) {
  const { includeTitle } = props;
  if (!includeTitle)  return false;

  return (
    <div>
      <Row>
        <Col lg='12' style={{fontSize: "15px"}}>
          Data Preview 
        </Col>
      </Row>
      <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>
    </div>
  );
}

const TableOutput = React.memo((props) => {
    if (!props.output) return null;
    if (!props.output[0]) return null;

    const includeTitle = props.includeTitle === undefined ? true : props.includeTitle;
    const { preview } = props.output[0];

    if (!preview)  return null;
  
    const context = useContext(AddressContext);

    // get react context to set an info toast
    const addInfoToast = useInfoToastContext();

    const dims = 'dims' in props.output[0] ? props.output[0].dims : null;
  
    const onDownload = () => {
      const execData = props.pathTo()
      const isReady = isPathReady(execData) // check if the current path is ready to be executed
      if(isReady){
        // Execute if ready
        const endPoint = context.address + "DownloadFileResult"
        axios.post(endPoint, execData, {withCredentials: true})
          .then((res) => {
            // Set loading flag when output ready
            const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(res.data);
            const downloadAnchorNode = document.createElement('a');
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

    const buttonStyle = {position: "absolute", right: 5, top: 30};
  
    return (
      <div style={{textAlign: "left", height:"calc(100% - 40px)", margin: 10, marginTop:0}}>
        <TableTitle includeTitle={includeTitle} dims={dims} />
        <Row style={{height:"calc(100% - 40px)"}}><Col lg='12'>
            <DataTable
              show={true}
              data={preview}
              rows={10}
              top={0}
              left={0}
              width={"100%"}
              height={"100%"}
            />
        </Col>
        </Row>
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
    if(prevOutput == null || nextOutput == null) return false;
    if(prevOutput[0] == null || nextOutput[0] == null) return false;

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

export default TableOutput;
