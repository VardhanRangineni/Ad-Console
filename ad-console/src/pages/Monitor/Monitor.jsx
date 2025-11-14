// src/pages/Monitor/Monitor.jsx - COMPLETE FIX
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Button, Form, Modal } from 'react-bootstrap';
import { useApp } from '../../context/AppContext';
import './Monitor.css';

function Monitor() {
  const { assignments, devices } = useApp();
  const [filterStatus, setFilterStatus] = useState('all');
  const [allContent, setAllContent] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState(null);

  useEffect(() => {
    const loadContent = () => {
      const customContentStr = localStorage.getItem('customContent');
      const customContent = customContentStr ? JSON.parse(customContentStr) : [];
      setAllContent(customContent);
    };

    loadContent();

    const handleStorageChange = (e) => {
      if (e.key === 'customContent') {
        loadContent();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const filteredDevices = devices.filter(device => {
    if (filterStatus === 'all') return true;
    return device.status === filterStatus;
  });

  const getDeviceContent = (deviceId, storeId) => {
    if (!storeId) return null;
    
    const deviceAssignments = assignments.filter(a => a.locationId === storeId);
    if (deviceAssignments.length === 0) return null;
    
    const firstAssignment = deviceAssignments[0];
    const content = allContent.find(c => c.id === firstAssignment.contentId);
    
    // Return null if content not found instead of undefined
    return content || null;
  };

  const showLivePreview = (device) => {
    setPreviewDevice(device);
    setShowPreviewModal(true);
  };

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline' || !d.status).length;

  return (
    <div className="monitor">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <i className="bi bi-tv me-2"></i>
          Monitor Screens
        </h2>
        <div className="d-flex gap-2">
          <Form.Select 
            style={{ width: 'auto' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline Only</option>
          </Form.Select>
          <Button variant="outline-primary" onClick={() => window.location.reload()}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="border-start border-primary border-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Total Screens</h6>
                  <h3 className="mb-0">{devices.length}</h3>
                </div>
                <i className="bi bi-tv text-primary" style={{ fontSize: '2rem' }}></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-start border-success border-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Online</h6>
                  <h3 className="mb-0 text-success">{onlineDevices}</h3>
                </div>
                <i className="bi bi-check-circle text-success" style={{ fontSize: '2rem' }}></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-start border-danger border-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Offline</h6>
                  <h3 className="mb-0 text-danger">{offlineDevices}</h3>
                </div>
                <i className="bi bi-exclamation-circle text-danger" style={{ fontSize: '2rem' }}></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {devices.length === 0 && (
        <Card className="text-center py-5">
          <Card.Body>
            <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
            <p className="mt-3 text-muted">No devices registered yet</p>
            <Button variant="primary" href="/devices">
              <i className="bi bi-plus-circle me-2"></i>
              Add Your First Device
            </Button>
          </Card.Body>
        </Card>
      )}

      {/* Screen Grid */}
      <Row>
        {filteredDevices.map(device => {
          const content = getDeviceContent(device.id, device.storeId);
          const hasContent = content !== null;
          
          return (
            <Col key={device.id} lg={4} md={6} className="mb-4">
              <Card className={`screen-card ${device.status !== 'online' ? 'offline' : ''}`}>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>
                    <i className="bi bi-shop me-2"></i>
                    <strong>{device.name}</strong>
                  </div>
                  <Badge bg={device.status === 'online' ? 'success' : 'danger'}>
                    <span className="status-dot"></span>
                    {device.status || 'inactive'}
                  </Badge>
                </Card.Header>
                <Card.Body>
                  {/* Screen Preview with ACTUAL CONTENT */}
                  <div className={`screen-preview ${device.orientation}`}>
                    {hasContent ? (
                      <>
                        {content.type === 'slideshow' && content.slides ? (
                          <img 
                            src={content.slides[0]}
                            alt={content.title}
                            className="w-100 h-100"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <img 
                            src={content.thumbnail || content.fileUrl}
                            alt={content.title}
                            className="w-100 h-100"
                            style={{ objectFit: 'cover' }}
                          />
                        )}
                        <div className="preview-badge">
                          <Badge bg="info">Live Preview</Badge>
                        </div>
                      </>
                    ) : (
                      <div className="no-content">
                        <i className="bi bi-display" style={{ fontSize: '3rem' }}></i>
                        <p className="mt-2 mb-0">No content assigned</p>
                      </div>
                    )}
                  </div>

                  {/* Screen Info */}
                  <div className="mt-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Device ID:</span>
                      <span className="small font-monospace">{device.id}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Orientation:</span>
                      <span>
                        <i className={`bi ${device.orientation === 'horizontal' ? 'bi-phone-landscape' : 'bi-phone'} me-1`}></i>
                        {device.orientation}
                      </span>
                    </div>
                    {hasContent && (
                      <>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Current Content:</span>
                          <span className="text-truncate ms-2">{content.title}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Type:</span>
                          <Badge bg="secondary">
                            {content.type}
                            {content.slideCount && ` (${content.slideCount})`}
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Last Sync */}
                  <div className="mt-3 pt-3 border-top">
                    <small className="text-muted">
                      <i className="bi bi-clock-history me-1"></i>
                      Last sync: {device.status === 'online' ? '2 mins ago' : 'Unavailable'}
                    </small>
                  </div>
                </Card.Body>
                <Card.Footer className="bg-white border-top-0">
                  <div className="d-grid gap-2">
                    <Button 
                      variant="primary"
                      size="sm"
                      onClick={() => showLivePreview(device)}
                    >
                      <i className="bi bi-eye me-2"></i>
                      Live Preview
                    </Button>
                    <Button 
                      variant="outline-secondary"
                      size="sm"
                      href={`/display/${device.id}`}
                      target="_blank"
                    >
                      <i className="bi bi-box-arrow-up-right me-2"></i>
                      Open Display
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          );
        })}
      </Row>

      {filteredDevices.length === 0 && devices.length > 0 && (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
          <p className="mt-3">No devices found with selected filter</p>
        </div>
      )}

      {/* Live Preview Modal */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-tv me-2"></i>
            Live Preview - {previewDevice?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0" style={{ height: '70vh' }}>
          {previewDevice && (
            <iframe
              src={`${window.location.origin}/display/${previewDevice.id}`}
              title={`Preview - ${previewDevice.name}`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Badge bg="success" className="me-auto">
            <i className="bi bi-broadcast me-1"></i>
            Live Sync
          </Badge>
          <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
            Close Preview
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Monitor;
