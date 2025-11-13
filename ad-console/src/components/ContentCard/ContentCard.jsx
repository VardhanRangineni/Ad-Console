import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import './ContentCard.css';

function ContentCard({ content, onSelect, isSelected }) {
  const getTypeColor = (type) => {
    switch (type) {
      case 'video': return 'primary';
      case 'image': return 'success';
      case 'slideshow': return 'info';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video': return 'bi-play-circle-fill';
      case 'image': return 'bi-image-fill';
      case 'slideshow': return 'bi-collection-play-fill';
      default: return 'bi-file-earmark';
    }
  };

  return (
    <Card className={`content-card h-100 ${isSelected ? 'selected' : ''}`}>
      <Card.Img 
        variant="top" 
        src={content.thumbnail} 
        alt={content.title}
        style={{ height: '180px', objectFit: 'cover' }}
      />
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title className="mb-0">{content.title}</Card.Title>
          <Badge bg={getTypeColor(content.type)} className="ms-2">
            <i className={`bi ${getTypeIcon(content.type)} me-1`}></i>
            {content.type}
          </Badge>
        </div>
        <Card.Text className="text-muted small">
          <i className="bi bi-clock me-1"></i>
          Duration: {content.duration}s
        </Card.Text>
        <Card.Text className="text-muted small">
          <i className="bi bi-calendar me-1"></i>
          Created: {content.createdAt}
        </Card.Text>
        <Button 
          variant={isSelected ? "success" : "outline-primary"}
          size="sm"
          className="mt-auto"
          onClick={() => onSelect(content)}
        >
          {isSelected ? (
            <>
              <i className="bi bi-check-circle me-1"></i>
              Selected
            </>
          ) : (
            <>
              <i className="bi bi-plus-circle me-1"></i>
              Select
            </>
          )}
        </Button>
      </Card.Body>
    </Card>
  );
}

export default ContentCard;
