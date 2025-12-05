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
      </Container>
    </BSNavbar>
  );
}

export default Navbar;
