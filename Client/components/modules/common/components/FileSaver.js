import React, { useContext, useState } from 'react';

import axios from "axios"
import { useSelector } from 'react-redux';

import FormControl from 'react-bootstrap/FormControl'
import InputGroup from 'react-bootstrap/InputGroup'

import AddressContext from '../../../AddressContext';
import api from '../../../../apis/api';

import "../../../css/Core.css"

/**
 * Functional component that saves content to a file on the server
 * @param {String} props.folder - Folder in the server workspace where file will be saved
 * @param {String} props.content - The content to be saved in the form of a string
 * @param {String} props.fextension - The file extension
 * @param {String} props.hideSaver - Function to hide the file saver (set a flag in the parent) 
*/
export function FileSaver({ folder, content, fextension, hideSaver, handleSave=null }){
  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);

  const oldPipelineName = useSelector(state=>state.global.pipelineName);
  const autoSaveName = useSelector(state=>state.global.autoSaveName);
  
  const [filename, setFilename] = useState("");
  const [saveFilename, setSaveFilename] = useState("");
  
  /**
   * Sets a display display name and a secure name for the file
   * Non-alphanumeric characted in the display name 
   * are replaced by _ to create the secure filename
   */
  const onChangeFilename = (event) => {
    const name = event.target.value
    setSaveFilename(name.trim().replace(/[^a-z0-9]/gi, '_'))
    setFilename(name)   
  }

  /**
   * Sends a call to the server to save the current pipeline 
   * @param  {string} fname - filename for pipeline
   */
  const onSave = () => {
    const fname = saveFilename + (fextension ? fextension : "");
    
    const saveFile = (content) => {
      const nameInfo = {filename: fname, oldName: autoSaveName};    
      api.saveFile(folder, nameInfo, content,
		   (response) => {
		     const alertText = `${saveFilename} Saved Successfully!`
		     // handle success            
		     hideSaver()
		     alert(alertText)
		   },
		   (error)=>console.error(error));      
    }
    
    if (handleSave !== null) {
      handleSave(fname, saveFile);
    } else {
      saveFile(content);
    }
  }

  return(
    <div className="ak-modal">
      <div className="ak-modal-content" style={{textAlign: "left", minHeight: 165}}>
        <label className="contentDivHead" title={"Save Pipeline"}>Save Pipeline</label>
        <div style={{margin: "25px 25px 0px 25px"}}>
          <InputGroup size='sm' className="mb-3" style={{margin: 0}}>
            <InputGroup.Text id="basic-addon2" style={{width: 100, height: 32}}>Name</InputGroup.Text>
            <FormControl              
              name="pipelineName"
              aria-label="pipelineName"
              aria-describedby="basic-addon2"
              value={filename}
              onChange={onChangeFilename}
            />      
          </InputGroup> 
        </div>   

        {
          filename != saveFilename
          ? <div style={{margin: "-10px 25px 5px 130px", fontSize: 12, color: "#6d71be"}}>
              {`The file will be saved as ${saveFilename}`}
            </div>
          : null
        }
       
        <div className="ak-modal-buttonBox">
          <input 
            type="button" 
            className="coreButton" 
            onClick={onSave}
            disabled={saveFilename===""}
            value={"Save"} 
          />
          <input 
            type="button" 
            className="coreButton" 
            onClick={hideSaver} 
            value={"Cancel"} 
          />
        </div>
      </div>            
    </div>  
  )
}

export default FileSaver
