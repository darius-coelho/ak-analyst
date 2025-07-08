import React, { useContext, useState, useEffect, useRef } from 'react';
import axios, { CancelToken, isCancel } from 'axios';

import _ from 'lodash';

import AddressContext from '../../../AddressContext';
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'

import {useDropzone} from 'react-dropzone';

/** 
 * Renders the loading progress bar. 
 * @param {int} progressPercent - Progress in percent between 0 and 100.
 * @parma {fun} cancle - Function called when canceling.
 */
function Loading({progressPercent, cancel}) {
  return (
      <div className={"uploadBox"}>
        <div style={{display: "inline-block", verticalAlign: "middle" }}>
          {progressPercent+"%"}
        </div>
        <div className={"uploadPercentageContainer"}>
          <div style={{width: 200*(progressPercent/100), height: 10, background: "#7b92ff" }} />
        </div> 
        <i 
          className="material-icons-outlined"
          style={{cursor: "pointer", verticalAlign: "middle"}}
          onClick={cancel}
        >
          {"clear"}
        </i>         
      </div>
  );
}

/**
 * Functional component that handles uploading files 
 * with drag and drop capabilities
 * @param {String} props.folder - Folder in the workspace where file will be uploaded
 * @param {function} props.setFileList - Function to set the list of files in the folder
 * @param {function} props.onOpenFile - Function to open the uploaded file
*/
export function FileUpload({folder, setFileList, onOpenFile, message=null}) {
  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);

  // State variables to show uploading status and percentage and the selected file
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);  

  const cancelFileUpload = useRef(null)
  /**
  * Function to trigger the cancel upload signal in axios 
  * see axios options in onDrop()    
  */
  const cancelUpload = () => {
    if(cancelFileUpload.current){
      cancelFileUpload.current("Upload Canceled")
    }
  }
  
  /**
   * Function that is triggerd by the onDrop listener 
   * for react-dropzone. All files dropped in the dropzone
   * or opened in the explorer are processed here
   * @param {Object} fileList - list of files opened/dropped. 
  */
  const onDrop = (acceptedFiles) => {
    if(acceptedFiles.length != 1){
      // if no file or more than one file then do not process
      alert("Only one file allowed")
      return null
    }
    
    // Set status to uploading
    setUploading(true)
    
    // Upload file
    let file = acceptedFiles[0];
    let formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    const endPoint = context.address + "UploadAction"
    const options = {
      // Use form for file upload
      headers: { 'Content-Type': 'multipart/form-data' },
      // Track upload percentage
      onUploadProgress: (progressEvent) => {
        const { loaded, total } = progressEvent;
        const percent = Math.floor((loaded * 100) / total);
        if (percent <= 100) {
          setUploadPercent(percent)
        }
      },
      // Set up cancel listener
      cancelToken: new CancelToken( cancel => cancelFileUpload.current = cancel)
    }
    
    // post upload request
    axios.post(endPoint, formData, options)
    .then((res) => {
      // update file list
      // NOTE: we don't need to set the uploading status to false
      // because it is only a visual change and the FileUpload component
      // is closed on success. Additionally, there is a race condition
      // that leads to a memory leak in react when setting the state here.
      setFileList(res.data)      
      onOpenFile(file.name)
    })
    .catch(err => {
      console.warn(err)
      if(isCancel(err)){
        // Alert if upload was canceled
        alert(err.message);
      }
      setUploading(false)
    });    
  }
  
  const {getRootProps, getInputProps} = useDropzone({onDrop});  

  if(uploading){
    return <Loading progressPercent={uploadPercent} cancel={cancelUpload} />
  }

  return(
    
      <div {...getRootProps({className: 'dropzone uploadBox'})}>
      <input {...getInputProps()} />
      <p style={{display: "table-cell", verticalAlign: "middle"}}>
      {
        message === null 
        ? `Drag and drop a file here, or click to upload files`
	      : message
	    }
      </p>
      </div>          
    
  )
}

/**
 * Functional component that handles rendering of the filelist 
 * @param {String} props.folder - Folder in the workspace where file will be uploaded
 * @param {List} props.fileList - List of filenames in the folder
 * @param {String} props.selectedFile - Select filename from the list
 * @param {function} props.setSelectedFile - Function to set the file selected from the list
 * @param {function} props.setFileList - Function to set the list of files in the folder 
*/
const FileListBox = (props) => {
  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);

  const {folder, fileList, selectedFile, setSelectedFile, setFileList} = props

  /**
   * Function that deletes a file stored on the server
   * @param {Object} event - Javascript click event object with the filename.
   */
  const onDeleteSelectedFile = (event) => {
    // delete the file only if it is in the file list
    if(fileList.map(f=>f.name).includes(selectedFile.name)){
      const fileData = {file: selectedFile, folder: folder};
      const endPoint = context.address + "DeleteServerFile"
      axios.post(endPoint, fileData)
      .then((res) => {
        //Update the file list to reflect the files on the server
        setFileList(res.data)
        setSelectedFile("")
      })
      .catch(err => console.warn(err));
    }
  }
  
  return <div className={"fileBox"}>
          {
            // Render file list
            fileList.map((d, i) => (
              <div 
                key={'fname'+i} 
                className={"fileItem"}
                value={d.name}
                onClick={() => setSelectedFile(d)}
                style={{background: selectedFile.name == d.name ? "#d9d9d9": null}}
              >
                <i className="material-icons-round"  style={{verticalAlign: "middle"}}>
                    description
                </i>
                {d.name}
                {
                  selectedFile.name == d.name
                    ? <i 
                        className="material-icons-outlined"
                        style={{position: "absolute", right: 10, cursor: "pointer", verticalAlign: "middle"}}
                        onClick={onDeleteSelectedFile}>
                            {"delete_forever"}
                        </i>
                    : null
                }         
              </div>
            ))
          }
        </div> 
}

/**
 * Functional component that displays a custom file dialog to handle files on the server
 * Allows users to select & load, delete, or upload files to/from 
 * a specified folder in the server workspace
 * @param {String} props.folder - Folder in the workspace where file will be uploaded
 * @param {List} props.fileList - List of filenames in the folder
 * @param {function} props.setFileList - Function to set the list of files in the folder 
 * @param {String} props.onOpenFile - Funtion to open a file in the folder
 * @param {function} props.onHideLoader - Function to hide the file loader (set a flag in the parent) 
*/
export function FileLoader(props){
  const {folder, fileList, inMemory, setFileList, onOpenFile, onHideLoader} = props
  const [selectedFile, setSelectedFile] = useState({});
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  /** Handles opening the file and loading the data. */ 
  function handleFileOpen(selected) {
    if (inMemory && !_.isEmpty(selected) && !show && selected.size > 100000000) {
      onOpenFile(selected.name, /*inMemory=*/false);      
    } else {    
      onOpenFile(selected.name);
    }
    onHideLoader()
  }

  /** Keeps data stored in RAM */
  function storeInRAMAndClose() {
    onOpenFile(selectedFile.name);
  }

  /** Stores the data to disk */
  function storeToDiskAndClose() {
    handleClose();
    onOpenFile(selectedFile.name, /*inMemory=*/false);
  }
  
  return(
    <div className="ak-modal">
      <div className="ak-modal-content" style={{textAlign: "left", height: 400}}>
        <label className="contentDivHead" title={"Open File"}>Open File</label>
      
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

        <FileListBox 
          folder={folder} 
          fileList={fileList.map(d=>(_.isObject(d) ? d : {name: d}))}
          selectedFile={selectedFile}
          setFileList={setFileList}
          setSelectedFile={setSelectedFile}
        />
        <div style={{margin: 10, height: "3em"}}>
          <FileUpload            
            folder={folder}
            setFileList={setFileList}
            onOpenFile={onOpenFile}
          />
        </div>
         
        <div className="ak-modal-buttonBox">
          <input 
            type="button" 
            className="coreButton" 
            onClick={() => handleFileOpen(selectedFile)} 
            value={"Open"} 
          />
          <input 
            type="button" 
            className="coreButton" 
            onClick={() => onHideLoader()} 
            value={"Cancel"} 
          />
        </div>
      </div>            
    </div>  
  )
}

export default FileLoader;
