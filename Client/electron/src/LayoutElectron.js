import React from "react";

import Layout from "../../components/Layout";
import WindowControl from "./WindowControl"
import MacControl from "./MacControl"

import { ConfirmDialog } from '../../components/modules/common/components/ConfirmDialog';
import { store } from '../../components/modules/store';

const fs = require("fs");
const path = require('path');

import { ipcRenderer, shell } from 'electron';
import { machineIdSync } from 'node-machine-id';
import io from 'socket.io-client';

import api from '../../apis/api';
import mixpanel from 'mixpanel-browser';

mixpanel.init('20bdc38e95a94b09a1caf0d6b0f35e9e', {debug: false});

// disable tracking for developers
if (process.env.AK_DEV)  mixpanel.disable()

mixpanel.identify(machineIdSync())

// Get path from where the electron exe is started
const basepath = require('@electron/remote').app.getAppPath()

// Connects to electron.js for loading piplines
ipcRenderer.on('open-file', (event, fileData) => {
	// Gets state as a string and set it in the store
	const appState = JSON.parse(fileData)
	store.dispatch(setStateFromFile(appState))
  // Check if the files in the load nodes are present
  const loadNodes = selectNodes(store.getState(), 'LOAD_FILE')
  for(var i=0; i<loadNodes.length; i++){
    const path = loadNodes[i].config.path
    if(fs.existsSync(path)) {
      store.dispatch(setIsFileAvailable(loadNodes[i].ID, /*isAvailable=*/ true))
    }
    else{
      store.dispatch(setIsFileAvailable(loadNodes[i].ID, /*isAvailable=*/ false))
    }
  }
});

// Connects to electron.js for saving pipelines
ipcRenderer.on('save-file', (event, type) => {
	// Gets current state strom store and sends it as a string to be saved
	const appState = JSON.stringify(store.getState())
	ipcRenderer.send('save-file-reply', appState)
});

/**
 * Checks if the current date is the same or past the provided expiry date
 * @param {string} date - the expiry date
 */
const isExpired = (date) => {  
  console.log("Checking validity...")
  const curr_date = new Date() 
  const exp_date = new Date(date) 
 
  return curr_date.setHours(0,0,0,0) >= exp_date.setHours(0,0,0,0)
}

export default class LayoutElectron extends React.Component {

  /**
   * Searches for available ports in a range and
   * runs the app.exe on the first available port.
   * @param {Number} from - first port to check.
   * @param {Number} to - last port to check.
   */
  startExe(from, to, getStatus, setState){
    //const setState = this.setState.bind(this)
    const runExe = this.runExe.bind(this)
    //const getStatus = this.getStatus.bind(this)

    const portastic = require('portastic');

    portastic.find({
      min: from,
      max: to
    })
    .then(function(ports){
        if(ports.length > 0){
          let address = `http://127.0.0.1:${ports[0]}/`
	  api.init(address);  // initialize the api
	  
          console.log("Using address: ", address )
          setState({
            address: address,
            socket: io(address)
          })
          getStatus()
          if(!process.env.DEV || process.env.exe) {
            // Start python exe if not in dev mode or if forced to use exe
            console.log("Starting Ak Engine")
            runExe(ports[0])
          }
        }
        else{
          alert("No open ports")
        }
    });
  }

  
  /**
   * Runs the app.exe as a background process on a given port
   * If port not given it defaults to 5000
   * @param {Number} from - port number
   */
  runExe(port=5000){
    // Get the platform specific app string
    const isLinux = window.navigator.platform.includes("Linux")
    const isMac = window.navigator.platform.includes("Mac")
    const app = ( isLinux || isMac
      ? process.env.exe ? "background_tasks/app/app" : "app/app"
      : process.env.exe ? "background_tasks/app/app.exe" : "app/app.exe");

    let processPath = path.join(basepath, '../'+app)
    if(process.env.exe) {
      // When testing with a build python exe use this path
      // Use npm run start-exe for this option
      console.log("Development with production EXE")
      processPath = path.join(basepath, app)
    }
    console.log("Starting exe: " + processPath)
    console.log("On Port: " + port)
    const execfile = window.require('child_process').execFile;

    execfile(
      processPath,
      [port.toString()],
       {
         windowsHide: true,
       },
       (err, stdout, stderr) => {
         if (err) {
           console.log(err);
         }
        if (stdout) {
          console.log(stdout);
        }
        if (stderr) {
          console.log(stderr);
        }
      }
    )
  }

  /**
   * Opens a link in a new tab
   * @param {string} link - The link to open.
   */
  onGoToLink(link) {
    shell.openExternal(link)
  }

  /**
   * Close electron app
   */
  onClose() {
    if(process.env.EXP_DATE && isExpired(process.env.EXP_DATE)) {
      ipcRenderer.send('close-exp');      
    }

    const autoSaveName = store.getState().global.autoSaveName;
    const isUpToDate = store.getState().global.isSaved;
    
    const handleYes = () => {
      // delete the existing autosave pipeline name.
      api.deleteFile('Pipelines', autoSaveName, ()=>{}, (err)=>console.error(err));
      ipcRenderer.send('close');
    }
    
    if (!isUpToDate) {
      ConfirmDialog(
        `There are unsaved changes that will be discarded. Are you sure you want to continue?`,
        handleYes
      );
    } else {
      console.log("close")      
      ipcRenderer.send('close');      
    }    
  }
  
  render() {
    const isMac = process.platform === 'darwin';
    const control = isMac
	  ? <MacControl onClose={this.onClose.bind(this)} />
	  : <WindowControl onClose={this.onClose.bind(this)} />;
    
    // Do not load interface is current date has passed EXP_DATE
    if(process.env.EXP_DATE && isExpired(process.env.EXP_DATE)) {      
      return(
        <div className="expBox">
          <div className="expContent">
            <div className="expTitle">Trial Expired</div>
            <div className="expText">
              <div>This version of the AK-Analyst has expired.</div>
              <div>Visit <a href="" onClick={() => this.onGoToLink('https://akaikaeru.com/')}>akaikaeru.com</a> to purchase the latest version.</div>
            </div>
          </div>
          <div className="expHeadBar"></div>
          {control}
        </div>
      ) 
    }
    
    return (
	    <Layout
        onGoToLink={this.onGoToLink}
        isWeb={false}
        onClose={this.onClose.bind(this)}
        control={control}
        startExe={this.startExe.bind(this)}
	    />
    );
  }

}
