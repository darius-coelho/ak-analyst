import React, { useCallback, useContext, useState, createContext } from 'react'

import Toast from 'react-bootstrap/Toast'
import ToastContainer from 'react-bootstrap/ToastContainer'

const InfoToastContext = createContext();

export default InfoToastContext;

/**
 * Component which renders an information toast with the message.
 * It disappears after 15 seconds.
 * @param {string} message - Message to display.
 * @param {string} type - The type of alert, defaults to error/danger.
 * @param {function} onClose - Called on close (e.g. to clear error state of parent).
 */
export function InfoToastContextProvider({children}) { 
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState("")
  const [type, setType] = useState('danger')  

  const addToast = useCallback(
    function (message, type) {
      setShow(true)
      setType(type)
      setMessage(message)
    },
    [setShow, setMessage, setType]
  );

  /** Is called on toast close. */
  const toastClose = () => {
    setShow(false)
    setMessage("")
    setType("danger")
  };

  const header = type == 'danger' ? 'Error' : 'Info'
  const bodyClass = ['danger', 'success', 'primary', 'secondary'].includes(type) 
                    ? 'text-white' : 'text-dark'

  return (
    <InfoToastContext.Provider value={addToast}>
      {children}
      <ToastContainer position="top-center" style={{zIndex: 5, marginTop: '35px'}}>
        <Toast onClose={toastClose}
          show={show}
          delay={15000}
          autohide
          bg={type}>
            <Toast.Header>
              <strong className="me-auto">{header}</strong>
            </Toast.Header>
            <Toast.Body className={bodyClass}>{message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </InfoToastContext.Provider>
  );
}

export function useInfoToastContext() {
  return useContext(InfoToastContext);
}