import React, { useState } from 'react';

import TableOutput  from "./TableOutput";

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import { abbreviateNumber } from '../../utilities/utilities';

/** 
 * Renders the File Info tab in the output.
 * @param {array} dims - Contains [num records, num columns].
 * @param {string} path - Filepath.
 * @param {string} lastModified - Datetime of last modification.
 * @param {int} size - Size of file in bytes.
 */
function FileInfo(props) {
  const { dims, path, lastModified, size } = props;

  const labelStyle = {
    textAlign: 'end',
    fontWeight: 'bold',
    fontSize: '0.9rem'
  };

  const valueStyle = {
    fontSize: '0.9rem'
  };

  const filesize = Math.round(size / 1e3);  // filesize in KB
  return (
      <Container>
      <Row>
      <Col lg={2} style={labelStyle}>Path:</Col><Col style={valueStyle}>{path}</Col>
      </Row>
      <Row>
      <Col lg={2} style={labelStyle}># Records:</Col>
      <Col style={valueStyle}>{abbreviateNumber(dims[0])}</Col>
      </Row>
      <Row>
      <Col lg={2} style={labelStyle}># Columns:</Col><Col style={valueStyle}>{dims[1]}</Col>
      </Row>      
      <Row>
      <Col lg={2} style={labelStyle}>Size:</Col><Col style={valueStyle}>{`${filesize}KB`}</Col>
      </Row>      

      <Row>
      <Col lg={2} style={labelStyle}>Last Modified:</Col>
      <Col style={valueStyle}>{lastModified}</Col>
      </Row>      
      </Container>
  );
}

/** Renders the load action output panel. */
export function LoadActionOutput(props) {
  const { pathTo, output } = props;

  if (!output)  return null;
  if (!output[0])  return null;

  const [ tabId, setTabId ] = useState(0)
  
  const tabStyle = {
    display: "inline-block",
    fontSize: 15,
    width: "fit-content",
    background: "#e7e7e7",
    border: "1px solid #c8c9ca",
    borderRadius: "5px 5px 0px 0px",      
    borderBottom: "None",
    margin: "0px 0px",
    padding: "0px 5px",
    cursor: "pointer"
  }

  const tab1Style = {
    ...tabStyle,
    background: tabId == 0 ? "#e7e7e7" : "#ffffff",
    color: tabId == 0 ? "#000000" : "#5e5e5e"
  }
  
  const tab2Style = {
    ...tabStyle,
    background: tabId == 1 ? "#e7e7e7" : "#ffffff",
    color: tabId == 1 ? "#000000" : "#5e5e5e"
  }

  return (
      <div style={{textAlign: "left", height:"calc(100% - 40px)", margin: 10, marginTop:0}}>        
        <div style={tab1Style} onClick={() => setTabId(0)}>Preview</div>
        <div style={tab2Style} onClick={() => setTabId(1)}>File Info</div>
        <div style={{border: "1px solid #c8c9ca", height: "calc(100% - " + 20 + "px)"}}>
          <div style={{display: tabId===0 ? 'block': 'none', height: "100%"}}>            
          <TableOutput {...props} />
          </div>
          <div style={{display: tabId===1 ? 'block': 'none'}}>
            <hr style={{padding: "0px", margin: "0px", marginBottom: "10px"}}/>
            <FileInfo {...output[0]} />
          </div>
        </div>
     </div>    
  );
}

export default LoadActionOutput;
