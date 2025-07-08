import React, { useState } from 'react';
import api from '../../../../apis/api';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'

import { useInfoToastContext } from '../../common/components/InfoToastContext';

import { createFileOutput } from '../../graph/components/Action.prototype';

import "../../../css/Core.css"

/**
 * Functional component that handles loading of data files from the LOCAL machine
 * with electron
 * @param {Object} props.config - File load action config parameters
 * @param {function} props.setParams - Reducer function to set the config of the file load action
 * @param {function} props.setOutput - Reducer function to set the output of the file load action
*/
function LoaderLocal(props) {
  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();
  const [selectedFile, setSelectedFile] = useState({});
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  
  /**
  * Function that points the server to the selected file 
  * in the react-select CreatableSelect component
  * @param {Object} event - Javascript file open event object.
  */
  function fileSelect(file, config) {
    const fileData = {
      name: file.name,      
      options: config.options,
      inMemory: config.inMemory,
      path: file.path,
      lastModified: file.lastModified / 1000, // Divide convert ms to sec for python backend
      ID: props.ID
    };

    const handleResponse = (res) => {
      // Set any null values in options to empty strings for input boxes
      let result = res.data.outputList
      let options = result[0].options
      if(options){
        const keys = Object.keys(options)
        for(var i=0; i<keys.length; i++){
          if(options[keys[i]] == null){
            options[keys[i]] = ""
          }
        }
      }
      result[0].options = options
      result[0].isAvailable = true
      props.setParams({...config, ...result[0]});
      props.setOutput([createFileOutput(result[0])]);
    };

    const handleError = (error) => {
      const errRes = error.response.data
        props.handleNodeError(errRes.nodeID, errRes.action_type, errRes.err)
        addInfoToast(error.response.data.err, 'danger');
	      props.setParams({...config, ...error.response.data.data});
        props.setOutput([null]);
    };

    api.localLoadAction(fileData, handleResponse, handleError);
  }

  /** Binds the selectedFile to the onOpenSelectedFile function and calls it. */
  const openSelectFileAndBind = (selectedFile, inMemory) => {
    const openFile = fileSelect.bind(this, selectedFile);
    props.setOpenSelectedFile(openFile);  // pass the reference to the parent.

    if (inMemory !== undefined) {
      props.config.inMemory = inMemory;
    }
    
    openFile(props.config);
  }


  /** Handles opening the file and loading the data. */ 
  function handleFileOpen(evt) {
    const selected = evt.target.files[0];
    if (props.config.inMemory && !show && selected.size > 100000000) {
      setSelectedFile(selected);      
      openSelectFileAndBind(selected, /*inMemory=*/false);
    } else {    
      openSelectFileAndBind(selected);
    }
  }

  /** Keeps data stored in RAM */
  function storeInRAMAndClose() {
    handleClose();
    openSelectFileAndBind(selectedFile);
  }

  /** Stores the data to disk */
  function storeToDiskAndClose() {
    handleClose();
    openSelectFileAndBind(selectedFile, /*inMemory=*/false);
  }

  
  const fileName = props.config ? props.config.name : "No File Selected"

  return (
      <Container>
       <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Large Data Warning</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          The data is fairly large. You should consider
          selecting the "Store on Disk" option.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={storeInRAMAndClose}>
            Store in RAM
          </Button>
          <Button variant="primary" onClick={storeToDiskAndClose}>
            Store on Disk
          </Button>
        </Modal.Footer>
      </Modal>

    
      <div data-testid='fileInput-container' style={{textAlign: "left", marginTop:10}}>
      <Row><Col lg='12' style={{fontSize: "15px"}}>Select Data</Col></Row>
      <hr className="lineDivide"/>
      <label className="customFileUpload">
        <input
          data-testid='fileInput'
          type="file"
          onChange={handleFileOpen}
          onClick={(event)=> { event.target.value = null }}
          style={{display: "none"}}
        />
        <div className ="customFileUploadButton">
          {"Select File"}
        </div>
        <div className ="customFileUploadText">
          {fileName}
        </div>
      </label>
      </div>
      </Container>
  );  
}
    
export default LoaderLocal;
