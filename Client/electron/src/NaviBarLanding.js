import React from 'react';

import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

export function NaviBarLanding(props) {
  return(
    <Navbar style={{background: "#0d0034"}} variant="dark">
      <div className='navbarTitle'></div>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
        </Nav>
      </Navbar.Collapse>        
    </Navbar>
  )
}

export default NaviBarLanding
