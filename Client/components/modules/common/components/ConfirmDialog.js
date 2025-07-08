import React from 'react'
import { confirmAlert } from 'react-confirm-alert'; // Import
import 'react-confirm-alert/src/react-confirm-alert.css'; // Import css
import "../../../css/ConfirmDialog.css"

export function ConfirmDialog(message, handleYes) {
  confirmAlert({
    customUI: ({ onClose }) => {
      return (
        <div className='confirm-dialog'>          
          <p>{message}</p>
          <button
            onClick={() => {
              handleYes();
              onClose();
            }}
          >
            Yes
          </button>
          <button onClick={onClose}>No</button>        
        </div>
      );
    },
    overlayClassName: "confirm-dialog-overlay"
  });
}

