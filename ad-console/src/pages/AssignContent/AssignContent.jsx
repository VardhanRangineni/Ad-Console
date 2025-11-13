import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import LocationSelector from '../../components/LocationSelector/LocationSelector';
import ScreenSimulator from '../../components/ScreenSimulator/ScreenSimulator';
import { useApp } from '../../context/AppContext';
import { mockContent } from '../../data/mockContent';
import './AssignContent.css';

function AssignContent() {
  const { selectedContent, selectedLocation, setSelectedLocation, addAssignment } = useApp();
  const [contentId, setContentId] = useState(selectedContent?.id || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [orientation, setOrientation] = useState('horizontal');
  const [showSuccess, setShowSuccess] = useState(false);
  const [allContent, setAllContent] = useState([]);

  // Load all content (mock + custom uploaded)
  useEffect(() => {
    const loadAllContent = () => {
      const customContentStr = localStorage.getItem('customContent');
      const customContent = customContentStr ? JSON.parse(customContentStr) : [];
      const combined = [...mockContent, ...customContent];
      setAllContent(combined);
    };

    loadAllContent();

    // Listen for storage changes
    const handleStorageChange = (e) => {
      if (e.key === 'customContent') {
        loadAllContent();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update contentId when selectedContent changes
  useEffect(() => {
    if (selectedContent) {
      setContentId(selectedContent.id);
    }
  }, [selectedContent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!contentId || !selectedLocation || !startDate || !endDate) {
      alert('Please fill all fields');
      return;
    }

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

    // Reset form
    setContentId('');
    setStartDate('');
    setEndDate('');
    setSelectedLocation(null);
  };

  const previewContent = allContent.find(c => c.id === parseInt(contentId));

  return (
    <div className="assign-content">
      <h2 className="mb-4">
        <i className="bi bi-plus-circle me-2"></i>
        Assign Content to Screens
      </h2>

      {showSuccess && (
        <Alert variant="success" dismissible onClose={() => setShowSuccess(false)}>
          <i className="bi bi-check-circle me-2"></i>
          Content assigned successfully!
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
                {/* Content Selection */}
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
                    {allContent.length} total content items available ({allContent.filter(c => c.custom).length} custom uploads)
                  </Form.Text>
                </Form.Group>

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
                    Create Assignment
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
                <h6 className="mb-3">Content Details</h6>
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
