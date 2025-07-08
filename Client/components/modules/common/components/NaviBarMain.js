import React, { useState, useContext } from 'react';
import axios from 'axios';
import api from '../../../../apis/api';

import { Link, useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPipelineName, setSampleStatus,
	 setAutoSaveName, resetGlobalState,
	 setIsSaved } from "../../global/global.actions";

import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown'

import FileLoader from './FileLoader';
import FileSaver from './FileSaver';

import { ConfirmDialog }  from  './ConfirmDialog';

import AddressContext from "../../../AddressContext";

/** Downloads the logfile */
function onDownloadLogFile(address) {
  const endPoint = address + "DownloadLogFile";
  axios.post(endPoint, {}, {withCredentials: true})
    .then((res)=>{
      // Set loading flag when output ready
      const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(res.data);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "ak_analyst_log.txt");
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }, (error) => {
      console.log(error);
    });
}

const NaviBarMain = (props) => {
  const dispatch = useDispatch();
  const autoSaveName = useSelector(state=>state.global.autoSaveName);
  const isUpToDate = useSelector(state=>state.global.isSaved);
  
  const history = useHistory();
  
  const { onResetPipeline, onLoadPipeline, getPipelineState, onGoToLink } = props

  const context = useContext(AddressContext);
  const isMac = process.platform === 'darwin'

  const [showPipelineLoader, setShowPipelineLoader] = useState(false)
  const [showPipelineSaver, setShowPipelineSaver] = useState(false)
  const [pipelineList, setPipelineList] = useState([])

  /**
   * Shows the pipeline loader popup along with
   * a list of pipeline files on the server
   */
   const onShowPipelineLoader = () => {
    const endPoint = context.address + "GetFilenames" 
    const payload = { folder: "Pipelines"}
    axios.post(endPoint, payload)
    .then(function (response) {
      // handle success

      // exclude the current autosave pipeline
      setPipelineList(response.data.filter(f=>f!==autoSaveName));
      setShowPipelineLoader(true)
    })
    .catch(function (error) {
      // handle error
      console.log(error)
    })    
  }  
  
  /** Updates the redux state by setting the pipeline filename */
  const onPipelineSave = (filename, saveFile) => {
    dispatch(setPipelineName(filename));

    // Even if it was a sample, once explicitely saved it becomes a regular pipeline
    dispatch(setSampleStatus(false));
    dispatch(setIsSaved(true));
    
    const folder = 'Pipelines';
    saveFile(JSON.stringify(getPipelineState()));

    // delete the existing autosave pipeline name.
    api.deleteFile(folder, autoSaveName, ()=>{}, (err)=>console.error(err));
  }

  const onGoToLanding = () => {
    const handleYes = () => {
      // delete the existing autosave pipeline name.
      api.deleteFile('Pipelines', autoSaveName, ()=>{}, (err)=>console.error(err));

      dispatch(resetGlobalState());
      history.push({pathname: '/'});      
    }

    if (isUpToDate) {
      handleYes();
    } else {
      ConfirmDialog(
	`There are unsaved changes that will be discarded. Are you sure you want to continue?`,
	handleYes
      );
    }
  }
  
  return(
    <div>
    <Navbar variant="dark">
      <div className='navbarTitle'></div>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
      {
        isMac
        ?  <Nav className={"justify-content-end"} style={{ width: "100%" }}>
              <div
                className={'navExitMac'}
                style={{color: '#fff', padding: "0px 8px"}}
                as={Link}
                to={null}
                onClick={onGoToLanding} >
                  <i className="material-icons-outlined navMacHome" >
                    home
                  </i> 
              </div>          
            </Nav>
        : <Nav className="me-auto">
            <NavDropdown className='navItem' title="File" id="basic-nav-dropdown1">
          <NavDropdown.Item onClick={onGoToLanding}>
                Go to Main 
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={onResetPipeline}>
                New Pipeline
              </NavDropdown.Item>
              <NavDropdown.Item onClick={onShowPipelineLoader}>
                Load Pipeline
              </NavDropdown.Item>
              <NavDropdown.Item onClick={() => setShowPipelineSaver(true)}>
                Save Pipeline
              </NavDropdown.Item>
              {
                  props.onClose
                  ? <div>
                      <NavDropdown.Divider />
                      <NavDropdown.Item onClick={props.onClose} >
                        Exit
                      </NavDropdown.Item>
                    </div>
                  : null
                }              
            </NavDropdown>
            <NavDropdown className='navItem' title="Help" id="basic-nav-dropdown2">
              <NavDropdown.Item
                onClick={() =>
                  onGoToLink('https://akaikaeru.com/wp-content/uploads/2022/04/AK_Analyst_-_User_Guide.pdf')
                } target="_blank">
                  Documentation
              </NavDropdown.Item>
              <NavDropdown.Item
                onClick={() =>
                  onGoToLink('https://www.youtube.com/channel/UCzkVfxUYVqPYgtttryKZBWA')
                } target="_blank">
                  Tutorial Videos
              </NavDropdown.Item>
              <NavDropdown.Item
                onClick={() =>
                  onGoToLink('https://akaikaeru.com/contact-us/')
                } target="_blank">
                  Contact Us
              </NavDropdown.Item>
              <NavDropdown.Item
                onClick={() =>
                  onGoToLink('https://akaikaeru.com/')
                } target="_blank">
                  About
              </NavDropdown.Item>
              <NavDropdown.Item onClick={()=>onDownloadLogFile(context.address)}>
                Download Logs
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
      }
      </Navbar.Collapse>        
    </Navbar>
    {
      showPipelineLoader
      ? <FileLoader
          folder={"Pipelines"}
          fileList={pipelineList} 
          setFileList={setPipelineList}  
          onOpenFile={onLoadPipeline}
          onHideLoader={() => setShowPipelineLoader(false)} 
        />
      : null               
    } 
    {
      showPipelineSaver
      ? <FileSaver 
          folder={"Pipelines"}
          fextension={'.aka'}
          content={JSON.stringify(getPipelineState())}
          handleSave={onPipelineSave}
          hideSaver={() => setShowPipelineSaver(false)} 
        />
      : null               
    }
    </div>
  )
}

export default NaviBarMain
