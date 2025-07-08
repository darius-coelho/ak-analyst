import React from 'react';


import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import FormControl from 'react-bootstrap/FormControl'
import InputGroup from 'react-bootstrap/InputGroup'

import "../../../css/Core.css"

import "../css/FileBrowser.css"

/**
 * Functional component that handles loading of data files from the SERVER
 * @param {Object} props.config - File load action config parameters
 * @param {function} props.setParams - Reducer function to set the config of the file load action
 * @param {function} props.setOutput - Reducer function to set the output of the file load action
*/
export function LoaderCloud(props) {
    
  const onChange = (evt) => {    
    props.setParams({
      ...props.config,
      [evt.target.name]: evt.target.value
    })
  }
  
  return (
      <Container>
        <div data-testid='fileInput-container' style={{textAlign: "left", marginTop:10}}>
          <Row><Col lg='12' style={{fontSize: "15px"}}>Datalake Credentials</Col></Row>
          <hr className="lineDivide"/>

          <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon1" style={{width: 120, height: 32}}>IP Address</InputGroup.Text>
            <FormControl
              name="ipAddr"
              aria-label="ipAddr"
              aria-describedby="basic-addon1"
              value={props.config.ipAddr}
              onChange={onChange}
            />
          </InputGroup>

          <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon1" style={{width: 120, height: 32}}>Username</InputGroup.Text>
            <FormControl
              name="uname"
              aria-label="uname"
              aria-describedby="basic-addon1"
              value={props.config.uname}
              onChange={onChange}
            />
          </InputGroup>

          <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon1" style={{width: 120, height: 32}}>Secret Key</InputGroup.Text>
            <FormControl
              name="secretKey"
              aria-label="secretKey"
              aria-describedby="basic-addon1"
              value={props.config.secretKey}
              onChange={onChange}
            />
          </InputGroup>

          <InputGroup size='sm' className="mb-3">
          <InputGroup.Text id="basic-addon1" style={{width: 120, height: 32}}>Bucket</InputGroup.Text>
            <FormControl
              name="bucket"
              aria-label="bucket"
              aria-describedby="basic-addon1"
              value={props.config.bucket}
              onChange={onChange}
            />
          </InputGroup>

          <InputGroup size='sm' className="mb-3">
            <InputGroup.Text id="basic-addon1" style={{width: 120, height: 32}}>File Path</InputGroup.Text>
            <FormControl
              name="filepath"
              aria-label="filepath"
              aria-describedby="basic-addon1"
              value={props.config.filepath}
              onChange={onChange}
            />            
          </InputGroup>
        </div>         
      </Container>
  );  
}

export default LoaderCloud;