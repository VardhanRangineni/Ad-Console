// src/pages/AssignContent/AssignContent.jsx
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Alert, Badge } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import LocationSelector from '../../components/LocationSelector/LocationSelector';
import ScreenSimulator from '../../components/ScreenSimulator/ScreenSimulator';
import { useApp } from '../../context/AppContext';
import './AssignContent.css';

function AssignContent() {
  const [searchParams] = useSearchParams();
  const isBulkMode = searchParams.get('bulk') === 'true';
  
  const { 
    selectedContent, 
    selectedLocation, 
    setSelectedLocation, 
    addAssignment,
    bulkAssignContent,
    setBulkAssignContent 
  } = useApp();
  
  const [contentId, setContentId] = useState(selectedContent?.id || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [orientation, setOrientation] = useState('horizontal');
  const [showSuccess, setShowSuccess] = useState(false);
  const [allContent, setAllContent] = useState([]);
  const [bulkItems, setBulkItems] = useState([]);

  useEffect(() => {
    const loadAllContent = () => {
      const customContentStr = localStorage.getItem('customContent');
      const customContent = customContentStr ? JSON.parse(customContentStr) : [];
      setAllContent(customContent);
    };

    loadAllContent();

    // Handle bulk mode
    if (isBulkMode) {
      // Try to get from Context first
      if (bulkAssignContent && bulkAssignContent.length > 0) {
        setBulkItems(bulkAssignContent);
      } else {
        // Fallback: load from localStorage IDs
        const idsStr = localStorage.getItem('bulkAssignContentIds');
        if (idsStr) {
          const ids = JSON.parse(idsStr);
          const customContentStr = localStorage.getItem('customContent');
          const customContent = customContentStr ? JSON.parse(customContentStr) : [];
          const items = ids.map(id => customContent.find(c => c.id === id)).filter(Boolean);
          setBulkItems(items);
        }
      }
    }

    const handleStorageChange = (e) => {
      if (e.key === 'customContent') {
        loadAllContent();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isBulkMode, bulkAssignContent]);

  useEffect(() => {
    if (selectedContent) {
      setContentId(selectedContent.id);
    }
  }, [selectedContent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedLocation || !startDate || !endDate) {
      alert('Please fill all required fields');
      return;
    }

    if (isBulkMode && bulkItems.length > 0) {
      // Bulk assign all selected items
      bulkItems.forEach(item => {
        addAssignment({
          contentId: item.id,
          locationId: selectedLocation.id,
          locationName: selectedLocation.name,
          startDate,
          endDate,
          orientation
        });
      });

      // Clear bulk data
      localStorage.removeItem('bulkAssignContentIds');
      setBulkAssignContent([]);
      
      setShowSuccess(true);
      setTimeout(() => {
        window.location.href = '/content';
      }, 2000);
    } else if (contentId) {
      // Single assignment
      addAssignment({
        contentId: parseInt(contentId),
        locationId: selectedLocation.id,
        locationName: selectedLocation.name,
        startDate,
        endDate,
        orientation
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      setContentId('');
      setStartDate('');
      setEndDate('');
      setSelectedLocation(null);
    } else {
      alert('Please select content');
    }
  };

  const previewContent = isBulkMode && bulkItems.length > 0 
    ? bulkItems[0] 
    : allContent.find(c => c.id === parseInt(contentId));

  return (
    <div className="assign-content">
      <h2 className="mb-4">
        <i className="bi bi-plus-circle me-2"></i>
        {isBulkMode ? 'Bulk Assign Content to Screens' : 'Assign Content to Screens'}
      </h2>

      {showSuccess && (
        <Alert variant="success" dismissible onClose={() => setShowSuccess(false)}>
          <i className="bi bi-check-circle me-2"></i>
          {isBulkMode 
            ? `Successfully assigned ${bulkItems.length} content items!` 
            : 'Content assigned successfully!'}
        </Alert>
      )}

      {isBulkMode && bulkItems.length > 0 && (
        <Alert variant="info">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Bulk Assignment Mode:</strong> Assigning {bulkItems.length} content item(s)
          <div className="mt-2">
            {bulkItems.map((item, idx) => (
              <Badge key={item.id} bg="primary" className="me-2">
                {idx + 1}. {item.title}
              </Badge>
            ))}
          </div>
        </Alert>
      )}

      <Row>
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Assignment Configuration</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                {/* Only show content selector if NOT in bulk mode */}
                {!isBulkMode && (
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">Select Content</Form.Label>
                    <Form.Select 
                      value={contentId}
                      onChange={(e) => setContentId(e.target.value)}
                      required
                    >
                      <option value="">Choose content...</option>
                      {allContent.map(content => (
                        <option key={content.id} value={content.id}>
                          {content.title} ({content.type}) {content.custom ? '- Custom Upload' : ''}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      {allContent.length} total content items available
                    </Form.Text>
                  </Form.Group>
                )}

                {/* Location Selection */}
                <LocationSelector 
                  selectedLocation={selectedLocation}
                  onSelect={setSelectedLocation}
                />

                {/* Date Range */}
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold">Start Date</Form.Label>
                      <Form.Control 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold">End Date</Form.Label>
                      <Form.Control 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Orientation */}
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Screen Orientation</Form.Label>
                  <div>
                    <Form.Check
                      inline
                      type="radio"
                      id="horizontal"
                      label={
                        <>
                          <i className="bi bi-phone-landscape me-2"></i>
                          Horizontal
                        </>
                      }
                      value="horizontal"
                      checked={orientation === 'horizontal'}
                      onChange={(e) => setOrientation(e.target.value)}
                    />
                    <Form.Check
                      inline
                      type="radio"
                      id="vertical"
                      label={
                        <>
                          <i className="bi bi-phone me-2"></i>
                          Vertical
                        </>
                      }
                      value="vertical"
                      checked={orientation === 'vertical'}
                      onChange={(e) => setOrientation(e.target.value)}
                    />
                    <Form.Check
                      inline
                      type="radio"
                      id="both"
                      label="Both"
                      value="both"
                      checked={orientation === 'both'}
                      onChange={(e) => setOrientation(e.target.value)}
                    />
                  </div>
                </Form.Group>

                {/* Submit Button */}
                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    type="submit"
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    {isBulkMode ? `Assign ${bulkItems.length} Items` : 'Create Assignment'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Preview */}
        <Col lg={4}>
          <ScreenSimulator 
            content={previewContent}
            orientation={orientation}
          />
          {previewContent && (
            <Card className="mt-3">
              <Card.Body>
                <h6 className="mb-3">
                  {isBulkMode ? 'Preview (First Item)' : 'Content Details'}
                </h6>
                <p className="mb-2"><strong>Title:</strong> {previewContent.title}</p>
                <p className="mb-2"><strong>Type:</strong> {previewContent.type}</p>
                <p className="mb-2"><strong>Duration:</strong> {previewContent.duration}s</p>
                {previewContent.custom && (
                  <p className="mb-0 text-success">
                    <i className="bi bi-star-fill me-1"></i>
                    Custom Upload
                  </p>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}

export default AssignContent;
