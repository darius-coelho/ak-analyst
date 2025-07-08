import React from 'react';

const electron = require('electron');
const { ipcRenderer } = electron;


export function WindowControl(props) {

  return(
    <div className='windowControlBox'>
      <div className="windowControl"  onClick={() => ipcRenderer.send('minimize')}>
        <i className="material-icons-outlined windowControlIcon">minimize</i>
      </div>
      <div className="windowControl"  onClick={() => ipcRenderer.send('maximize')}>
        <i className="material-icons-outlined windowControlIcon">square</i>
      </div>
      <div className="windowControl"  onClick={props.onClose}>
        <i className="material-icons-outlined windowControlIcon">close</i>
      </div>
    </div> 
  )
}

export default WindowControl
