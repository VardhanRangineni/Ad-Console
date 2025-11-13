import React from 'react';
import { Card } from 'react-bootstrap';
import './ScreenSimulator.css';

function ScreenSimulator({ content, orientation = 'horizontal' }) {
  if (!content) {
    return (
      <Card className="screen-simulator">
        <Card.Body className="text-center text-muted">
          <i className="bi bi-display" style={{ fontSize: '3rem' }}></i>
          <p className="mt-3">Select content to preview</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="screen-simulator">
      <Card.Header className="bg-dark text-white">
        <i className={`bi ${orientation === 'horizontal' ? 'bi-phone-landscape' : 'bi-phone'} me-2`}></i>
        Screen Preview - {orientation}
      </Card.Header>
      <Card.Body className="p-0">
        <div className={`screen-display ${orientation}`}>
          <img 
            src={content.fileUrl} 
            alt={content.title}
            className="w-100 h-100"
            style={{ objectFit: 'cover' }}
          />
          <div className="screen-overlay">
            <h5>{content.title}</h5>
            <p className="mb-0">
              <i className="bi bi-clock me-1"></i>
              {content.duration}s
            </p>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

export default ScreenSimulator;
