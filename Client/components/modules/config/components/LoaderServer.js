import React, { useState } from 'react';
import api from '../../../../apis/api';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import { useInfoToastContext } from '../../common/components/InfoToastContext';

import { createFileOutput } from '../../graph/components/Action.prototype';

import FileLoader from '../../common/components/FileLoader'

import "../../../css/Core.css"

import "../css/FileBrowser.css"

/**
 * Functional component that handles loading of data files from the SERVER
 * @param {Object} props.config - File load action config parameters
 * @param {function} props.setParams - Reducer function to set the config of the file load action
 * @param {function} props.setOutput - Reducer function to set the output of the file load action
 */
export function LoaderServer(props) {
  // get react context to set an info toast
  const addInfoToast = useInfoToastContext() 
  
  const folder = "Data"
  
  // State variables to show the initial fileList and the file loader
  const [fileList, setFileList] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const onHideLoader = () => setShowLoader(false)
  
    /**
    * Function that retrieves the list of files
    * in the server workspace and opens the file loader
    * initialized with this list    
    */
    const onShowLoader = () => {
      const handleResponse = (response) => {
	      // handle success        
        setFileList(response.data)
        setShowLoader(true)
      };

      const handleError = (error) => {
	      // handle success        
        setFileList(response.data)
        setShowLoader(true)      
      };
      
      api.getFileDetails(folder, handleResponse, handleError);
    }
    
  /**
   * Function that loads a file stored on the server
   * @param {string} selectedFile - Filename to open.
   * @param {object} config - Configuration parameters.
   */
  const onOpenSelectedFile = (selectedFile, config) => {
    const fileData = {
      name: selectedFile,
      inMemory: config.inMemory,
      options: config.options,
      folder: folder,
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
      onHideLoader()
    };

    const handleError = (error) => {
      console.warn(error)
      if(error.response){
        const errRes = error.response.data
        props.handleNodeError(errRes.nodeID, errRes.action_type, errRes.err)
        addInfoToast(error.response.data.err, 'danger');
	      props.setParams({...config, ...error.response.data.data});
        props.setOutput([null]);
	      onHideLoader();
      }      
    };
    
    api.selectServerDataFile(fileData, handleResponse, handleError);    
    onHideLoader();
  }

  /** Binds the selectedFile to the onOpenSelectedFile function and calls it. */
  const openSelectFileAndBind = (selectedFile, inMemory) => {
    const openFile = onOpenSelectedFile.bind(this, selectedFile);

    if (inMemory !== undefined) {
      props.config.inMemory = inMemory;
    }
    
    props.setOpenSelectedFile(openFile);  // pass the reference to the parent.
    openFile(props.config);
  }
  
  const fileName = props.config ? props.config.name : "No File Selected"

  return (
      <Container>
        <div data-testid='fileInput-container' style={{textAlign: "left", marginTop:10}}>
          <Row><Col lg='12' style={{fontSize: "15px"}}>Select Data</Col></Row>
          <hr className="lineDivide"/>
          <label className="customFileUpload" onClick={onShowLoader}>          
            <div className ="customFileUploadButton" style={{width: 120}}>
              {"Select File"}
            </div>
            <div className ="customFileUploadText">
              {fileName}
            </div>
          </label>        
        </div>    
        { 
          showLoader 
          ? <FileLoader 
              folder={folder}
              fileList={fileList}
	      inMemory={props.config.inMemory}
              setFileList={setFileList}
              onOpenFile={openSelectFileAndBind}
              onHideLoader={onHideLoader} 
            /> 
          : null
        }
      </Container>
  );  
}

export default LoaderServer;
