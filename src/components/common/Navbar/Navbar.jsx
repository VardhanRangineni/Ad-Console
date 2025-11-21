import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navbar as BSNavbar, Nav, Container } from 'react-bootstrap';
import './Navbar.css';

function Navbar() {
  const location = useLocation();

  return (
    <BSNavbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
      <Container fluid>
        <BSNavbar.Brand as={Link} to="/">
          <i className="bi bi-display me-2"></i>
          Ad Console HQ
        </BSNavbar.Brand>
        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BSNavbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link 
              as={Link} 
              to="/" 
              active={location.pathname === '/'}
            >
              <i className="bi bi-speedometer2 me-1"></i>
              Dashboard
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/content" 
              active={location.pathname === '/content'}
            >
              <i className="bi bi-collection-play me-1"></i>
              Content Library
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/assign" 
              active={location.pathname === '/assign'}
            >
              <i className="bi bi-plus-circle me-1"></i>
              Playlists
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/devices" 
              active={location.pathname === '/devices'}
            >
              <i className="bi bi-hdd-network me-1"></i>
              Devices
            </Nav.Link>
            {/* Monitor page removed - link omitted */}
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
}

export default Navbar;
