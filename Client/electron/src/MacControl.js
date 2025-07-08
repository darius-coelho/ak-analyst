import React from 'react';

const electron = require('electron');
const { ipcRenderer } = electron;


export function MacControl(props) {

  return(
    <div className='macControlBox'>
      <div className="macControl" style={{background: '#f45450'}} onClick={props.onClose}>
        <i className="material-icons-outlined macControlIcon">close</i>
      </div>
      <div className="macControl" style={{background: '#f5b63e'}} onClick={() => ipcRenderer.send('minimize')}>
        <i className="material-icons-outlined macControlIcon">horizontal_rule</i>
      </div>
      <div className="macControl" style={{background: '#34c249'}} onClick={() => ipcRenderer.send('maximize')}>
        <i className="material-icons-outlined macControlIcon">open_in_full</i>
      </div>
    </div> 
  )
}

export default MacControl
