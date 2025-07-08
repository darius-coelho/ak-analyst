import React from 'react';

import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

import { Link } from 'react-router-dom';

/**
 * Renders a navigation bar for dashboards on Mac OS X.
 * @param {object} backToData - Object that contains a react-router path 
 *                              and the props for the component being routed to.
 * @param {function} onBack - Function to execute on clicking the back button.
 */
function NaviBarMac(props) {
  const { onBack, backToData } = props
  return(
    <Navbar variant="dark">
      <div className='navbarTitle'></div>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className={"justify-content-end"} style={{ width: "100%" }}>
          <Nav.Link 
            className={'navExitMac'}
            style={{color: '#fff', padding: "0px 8px"}}
            as={Link}
            to={backToData}
            onClick={onBack} >
              <i className="material-icons-outlined navBack" >
                arrow_back_ios
              </i> 
              <i className="material-icons-outlined navBack" style={{color: '#bcbcbc'}}>
                arrow_forward_ios
              </i>
          </Nav.Link>          
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  )

}

/**
 * Renders a navigation bar for dashboards on Windows/Linux.
 * @param {object} backToData - Object that contains a react-router path 
 *                              and the props for the component being routed to.
 * @param {function} onBack - Function to execute on clicking the back button.
 */
function NaviBarWin(props) {
  const { onBack, backToData } = props

  return(
    <Navbar variant="dark">
      <div className='navbarTitle'></div>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className={"me-auto"} style={{ width: "100%" }}>
          <Nav.Link 
            className={'navExit'}
            style={{color: '#fff', padding: "0px 8px"}}
            as={Link}
            to={backToData}
            onClick={onBack} >
              <i className="material-icons-outlined navBack" >
                arrow_back_ios
              </i> 
             <div  className='navBackText'>Back</div>              
          </Nav.Link>          
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  )
  
}

/**
 * Renders a navigation bar for dashboards.
 * @param {object} backToData - Object that contains a react-router path 
 *                              and the props for the component being routed to.
 * @param {function} onBack - Function to execute on clicking the back button.
 */
export function NaviBar(props) {
  if(process.platform === 'darwin')
  {
    return <NaviBarMac {...props} />
  }
  return <NaviBarWin {...props} />  
}

export default NaviBar
