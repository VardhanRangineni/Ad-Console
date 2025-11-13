// src/pages/Dashboard/Dashboard.jsx
import React, { useState } from 'react';
import { Row, Col, Card, Badge, Modal, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { mockContent } from '../../data/mockContent';
import { mockLocations } from '../../data/mockLocations';
import './Dashboard.css';

function Dashboard() {
  const { assignments, deleteAssignment } = useApp();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const countStores = (location) => {
    if (location.type === 'store') return 1;
    if (!location.children) return 0;
    return location.children.reduce((sum, child) => sum + countStores(child), 0);
  };

  const totalStores = countStores(mockLocations);
  const activeScreens = totalStores - 1;

  // Load custom content
  const customContentStr = localStorage.getItem('customContent');
  const customContent = customContentStr ? JSON.parse(customContentStr) : [];
  const allContent = [...mockContent, ...customContent];

  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleDelete = () => {
    deleteAssignment(deleteId);
    setShowDeleteModal(false);
    setDeleteId(null);
  };

  return (
    <div className="dashboard">
      <h2 className="mb-4">
        <i className="bi bi-speedometer2 me-2"></i>
        Dashboard Overview
      </h2>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card bg-primary text-white">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-2">Total Screens</h6>
                  <h2 className="mb-0">{totalStores}</h2>
                </div>
                <i className="bi bi-tv stat-icon"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card bg-success text-white">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-2">Active Screens</h6>
                  <h2 className="mb-0">{activeScreens}</h2>
                </div>
                <i className="bi bi-check-circle stat-icon"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card bg-info text-white">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-2">Content Items</h6>
                  <h2 className="mb-0">{allContent.length}</h2>
                </div>
                <i className="bi bi-collection-play stat-icon"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card bg-warning text-white">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-2">Active Assignments</h6>
                  <h2 className="mb-0">{assignments.length}</h2>
                </div>
                <i className="bi bi-calendar-check stat-icon"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-lightning-charge me-2"></i>
                Quick Actions
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4} className="mb-3 mb-md-0">
                  <Link to="/content" className="action-link">
                    <div className="action-card text-center p-4 border rounded">
                      <i className="bi bi-collection-play display-4 text-primary"></i>
                      <h5 className="mt-3">Browse Content</h5>
                      <p className="text-muted">View and manage media library</p>
                    </div>
                  </Link>
                </Col>
                <Col md={4} className="mb-3 mb-md-0">
                  <Link to="/assign" className="action-link">
                    <div className="action-card text-center p-4 border rounded">
                      <i className="bi bi-plus-circle display-4 text-success"></i>
                      <h5 className="mt-3">Assign Content</h5>
                      <p className="text-muted">Create new content assignments</p>
                    </div>
                  </Link>
                </Col>
                <Col md={4}>
                  <Link to="/monitor" className="action-link">
                    <div className="action-card text-center p-4 border rounded">
                      <i className="bi bi-tv display-4 text-info"></i>
                      <h5 className="mt-3">Monitor Screens</h5>
                      <p className="text-muted">Check screen status and activity</p>
                    </div>
                  </Link>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Assignments */}
      <Row>
        <Col md={12}>
          <Card>
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Recent Assignments
              </h5>
            </Card.Header>
            <Card.Body>
              {assignments.length === 0 ? (
                <p className="text-muted text-center py-4">No assignments yet</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Content</th>
                        <th>Location</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Orientation</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.slice(0, 10).map(assignment => {
                        const content = allContent.find(c => c.id === assignment.contentId);
                        return (
                          <tr key={assignment.id}>
                            <td>
                              <i className="bi bi-play-circle me-2 text-primary"></i>
                              {content?.title || 'Unknown'}
                              {content?.custom && <Badge bg="success" className="ms-2">Custom</Badge>}
                            </td>
                            <td>{assignment.locationName}</td>
                            <td>{assignment.startDate}</td>
                            <td>{assignment.endDate}</td>
                            <td>
                              <Badge bg="secondary">
                                <i className={`bi ${assignment.orientation === 'horizontal' ? 'bi-phone-landscape' : 'bi-phone'} me-1`}></i>
                                {assignment.orientation}
                              </Badge>
                            </td>
                            <td>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => confirmDelete(assignment.id)}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
            <p className="mt-3 mb-0">Are you sure you want to delete this assignment?</p>
            <p className="text-muted">This action cannot be undone.</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            <i className="bi bi-trash me-2"></i>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Dashboard;
