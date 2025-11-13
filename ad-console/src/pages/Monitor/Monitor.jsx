import React, { useState } from 'react';
import { Row, Col, Card, Badge, Button, Form } from 'react-bootstrap';
import { mockLocations } from '../../data/mockLocations';
import { mockContent } from '../../data/mockContent';
import { useApp } from '../../context/AppContext';
import './Monitor.css';

function Monitor() {
  const { assignments } = useApp();
  const [filterStatus, setFilterStatus] = useState('all');

  const getAllStores = (location, stores = []) => {
    if (location.type === 'store') {
      stores.push(location);
    }
    if (location.children) {
      location.children.forEach(child => getAllStores(child, stores));
    }
    return stores;
  };

  const allStores = getAllStores(mockLocations);

  const filteredStores = allStores.filter(store => {
    if (filterStatus === 'all') return true;
    return store.status === filterStatus;
  });

  const getStoreContent = (storeId) => {
    const assignment = assignments.find(a => a.locationId === storeId);
    if (!assignment) return null;
    return mockContent.find(c => c.id === assignment.contentId);
  };

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
          <Button variant="outline-primary">
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
                  <h3 className="mb-0">{allStores.length}</h3>
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
                  <h3 className="mb-0 text-success">
                    {allStores.filter(s => s.status === 'online').length}
                  </h3>
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
                  <h3 className="mb-0 text-danger">
                    {allStores.filter(s => s.status === 'offline').length}
                  </h3>
                </div>
                <i className="bi bi-exclamation-circle text-danger" style={{ fontSize: '2rem' }}></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Screen Grid */}
      <Row>
        {filteredStores.map(store => {
          const content = getStoreContent(store.id);
          return (
            <Col key={store.id} lg={4} md={6} className="mb-4">
              <Card className={`screen-card ${store.status === 'offline' ? 'offline' : ''}`}>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>
                    <i className="bi bi-shop me-2"></i>
                    <strong>{store.name}</strong>
                  </div>
                  <Badge bg={store.status === 'online' ? 'success' : 'danger'}>
                    <span className="status-dot"></span>
                    {store.status}
                  </Badge>
                </Card.Header>
                <Card.Body>
                  {/* Screen Preview */}
                  <div className={`screen-preview ${store.orientation}`}>
                    {content ? (
                      <img 
                        src={content.thumbnail} 
                        alt={content.title}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                      />
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
                      <span className="text-muted">Orientation:</span>
                      <span>
                        <i className={`bi ${store.orientation === 'horizontal' ? 'bi-phone-landscape' : 'bi-phone'} me-1`}></i>
                        {store.orientation}
                      </span>
                    </div>
                    {content && (
                      <>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Current Content:</span>
                          <span className="text-truncate ms-2">{content.title}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Type:</span>
                          <Badge bg="secondary">{content.type}</Badge>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Last Sync */}
                  <div className="mt-3 pt-3 border-top">
                    <small className="text-muted">
                      <i className="bi bi-clock-history me-1"></i>
                      Last sync: {store.status === 'online' ? '2 mins ago' : 'Unavailable'}
                    </small>
                  </div>
                </Card.Body>
                <Card.Footer className="bg-white border-top-0">
                  <div className="d-grid gap-2">
                    <Button 
                      variant={store.status === 'online' ? 'outline-secondary' : 'outline-primary'}
                      size="sm"
                    >
                      <i className="bi bi-gear me-2"></i>
                      Manage Screen
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          );
        })}
      </Row>

      {filteredStores.length === 0 && (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
          <p className="mt-3">No screens found</p>
        </div>
      )}
    </div>
  );
}

export default Monitor;
