import React from 'react';
import { Card as BSCard } from 'react-bootstrap';
import './Card.css';

function Card({ children, className = '', ...props }) {
  return (
    <BSCard className={`custom-card ${className}`} {...props}>
      {children}
    </BSCard>
  );
}

export default Card;
