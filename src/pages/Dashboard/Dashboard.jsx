// src/pages/Dashboard/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Row, Col, Card, Badge, Modal, Button } from 'react-bootstrap';
import { getAllDevices } from '../../services/deviceIndexeddb';
import { getAllContent } from '../../services/indexeddb';
import { getAllPlaylistsFromDB } from '../ManagePlaylists/ManagePlaylists.jsx';
import { getRecentActions } from '../../services/activityLog';
import './Dashboard.css';
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function Dashboard() {
  const [playlists, setPlaylists] = useState([]);
  const [indexedDevices, setIndexedDevices] = useState(null);
  const [loadingIndexedDevices, setLoadingIndexedDevices] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [allContent, setAllContent] = useState([]);
  const [recentActions, setRecentActions] = useState([]);

  // Load playlists and content from IndexedDB
  useEffect(() => {
    async function loadPlaylistsAndContent() {
      const [dbPlaylists, dbContent] = await Promise.all([
        getAllPlaylistsFromDB(),
        getAllContent()
      ]);
      setPlaylists(dbPlaylists || []);
      setAllContent(dbContent || []);
    }
    loadPlaylistsAndContent();
    const interval = setInterval(loadPlaylistsAndContent, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Load recent actions from activity log (last 15)
  useEffect(() => {
    function loadActions() {
      const acts = getRecentActions(15);
      setRecentActions(acts);
    }
    loadActions();
    // Listen for activity log updates
    function onUpdate(e) {
      loadActions();
    }
    window.addEventListener('activityLogUpdate', onUpdate);
    const interval = setInterval(loadActions, 10000);
    return () => {
      window.removeEventListener('activityLogUpdate', onUpdate);
      clearInterval(interval);
    };
  }, []);

  // Remove assignment delete logic for now (not used for playlists)
  const handleDelete = () => {};

  // Prefer devices loaded from indexedDB
  useEffect(() => {
    let mounted = true;
    async function loadDevices() {
      setLoadingIndexedDevices(true);
      try {
        const dbDevices = await getAllDevices();
        if (!mounted) return;
        setIndexedDevices(dbDevices || []);
      } catch (err) {
        console.error('Error reading devices from indexedDB', err);
        setIndexedDevices([]);
      } finally {
        if (mounted) setLoadingIndexedDevices(false);
      }
    }
    loadDevices();
    const interval = setInterval(loadDevices, 10000); // refresh every 10s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Use indexedDB data when loaded (even if empty); while loading fall back to context devices
  const devicesToUse = indexedDevices || [];
  const disabledList = JSON.parse(localStorage.getItem('disabledDevices') || '[]');
  const isDeviceActive = (d) => {
    if (typeof d?.active === 'boolean') return d.active;
    if (d?.status) return d.status === 'online';
    return !disabledList.includes(d.id);
  };
  const onlineDevices = devicesToUse.filter(d => isDeviceActive(d)).length;
  const totalDevices = devicesToUse.length;
  const offlineDevices = totalDevices - onlineDevices;


  // Only consider approved playlists
  const approvedPlaylists = playlists.filter(p => p.status === 'approved');
  // Calculate expiring approved playlists (end date within 5 days)
  const today = new Date();
  const fiveDaysFromNow = new Date(today);
  fiveDaysFromNow.setDate(today.getDate() + 5);
  const expiringPlaylists = approvedPlaylists.filter(p => {
    if (!p.endDate) return false;
    const end = new Date(p.endDate);
    return end >= today && end <= fiveDaysFromNow;
  });

  // Content counts: prefer 'active' only for the main KPI
  const totalContent = allContent ? allContent.length : 0;
  const activeContentCount = allContent ? allContent.filter(c => c.active !== false).length : 0;
  const inactiveContentCount = Math.max(0, totalContent - activeContentCount);

  // (Click handler for expiring playlists badge removed for now)

  return (
    <div className="dashboard">
      <h2 className="mb-4">
        <i className="bi bi-speedometer2 me-2"></i>
        Dashboard Overview
      </h2>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card bg-primary text-white" style={{ minHeight: 140 }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center" style={{ minHeight: 90 }}>
                <div>
                  <h6 className="text-white-50 mb-2">Total Devices</h6>
                  <h2 className="mb-0">
                    {loadingIndexedDevices ? (
                      <div className="spinner-border spinner-border-sm text-light" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    ) : totalDevices}
                  </h2>
                  <div className="d-flex align-items-center mt-2 small screen-stats">
                    <div className="me-3">Active: <Badge bg="success">{loadingIndexedDevices ? (<span className="text-white-75">-</span>) : onlineDevices}</Badge></div>
                    <div>Inactive: <Badge bg="danger">{loadingIndexedDevices ? (<span className="text-white-75">-</span>) : offlineDevices}</Badge></div>
                  </div>
                </div>
                <i className="bi bi-tv stat-icon"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card bg-success text-white" style={{ minHeight: 140 }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center" style={{ minHeight: 90 }}>
                <div>
                  <h6 className="text-white-50 mb-2">Active Screens</h6>
                  <h2 className="mb-0">{onlineDevices}</h2>
                </div>
                <i className="bi bi-check-circle stat-icon"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card bg-info text-white" style={{ minHeight: 140 }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center" style={{ minHeight: 90 }}>
                <div>
                  <h6 className="text-white-50 mb-2">Content Items</h6>
                  <h2 className="mb-0">{activeContentCount}</h2>
                  <div className="d-flex align-items-center mt-2 small screen-stats">
                    <div>Inactive: <Badge bg="danger">{inactiveContentCount}</Badge></div>
                  </div>
                </div>
                <i className="bi bi-collection-play stat-icon"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card bg-warning text-white" style={{ minHeight: 140 }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center" style={{ minHeight: 90 }}>
                <div>
                  <h6 className="text-white-50 mb-2">Expiring Playlists</h6>
                  <h2 className="mb-0">
                    <Badge
                      bg="danger"
                      pill
                      style={{ fontSize: '1.5rem', verticalAlign: 'middle' }}
                      title="Playlists expiring in 5 days"
                    >
                      {expiringPlaylists.length} <i className="bi bi-exclamation-triangle"></i>
                    </Badge>
                  </h2>
                  {expiringPlaylists.length > 0 && (
                    <div className="small mt-1 text-danger">
                      expiring soon
                    </div>
                  )}
                </div>
                <i className="bi bi-calendar-check stat-icon"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      

      {/* Dashboard Graphs */}
      <Row className="mb-4">
        <Col md={6} className="mb-3">
          <Card>
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-pie-chart me-2"></i>
                Device Status
              </h5>
            </Card.Header>
            <Card.Body>
              <Pie
                data={{
                  labels: ['Active', 'Inactive'],
                  datasets: [
                    {
                      data: [onlineDevices, offlineDevices],
                      backgroundColor: ['#28a745', '#dc3545'],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: { display: true, position: 'bottom' },
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                }}
                height={220}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-3">
          <Card>
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-bar-chart-line me-2"></i>
                Playlists Expiring (Next 5 Days)
              </h5>
            </Card.Header>
            <Card.Body>
              <Bar
                data={{
                  labels: Array.from({ length: 5 }, (_, i) => {
                    const d = new Date(today);
                    d.setDate(today.getDate() + i + 1);
                    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  }),
                  datasets: [
                    {
                      label: 'Expiring Playlists',
                      backgroundColor: '#ffc107',
                      borderColor: '#ff9800',
                      borderWidth: 1,
                      data: Array.from({ length: 5 }, (_, i) => {
                        const day = new Date(today);
                        day.setDate(today.getDate() + i + 1);
                        return approvedPlaylists.filter(p => {
                          if (!p.endDate) return false;
                          const end = new Date(p.endDate);
                          return (
                            end.getFullYear() === day.getFullYear() &&
                            end.getMonth() === day.getMonth() &&
                            end.getDate() === day.getDate()
                          );
                        }).length;
                      }),
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: { display: false },
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
                height={220}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Expiring Playlists */}
      <Row>
        <Col md={12}>
          <Card>
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Expiring Playlists
              </h5>
            </Card.Header>
            <Card.Body>
              {expiringPlaylists.length === 0 ? (
                <p className="text-muted text-center py-4">No expiring playlists</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Playlist Name</th>
                        <th>Region/Territory</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringPlaylists.slice(0, 10).map(playlist => (
                        <tr key={playlist.id}>
                          <td>{playlist.playlistName || '-'}</td>
                          <td>{playlist.territoryType || '-'}</td>
                          <td>{playlist.startDate || '-'}</td>
                          <td>{playlist.endDate || '-'}</td>
                          <td>{playlist.type || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row className="mt-3">
        <Col md={12}>
          <Card>
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-list-task me-2"></i>
                Recent Activity
              </h5>
            </Card.Header>
            <Card.Body>
              {recentActions.length === 0 ? (
                <p className="text-muted text-center py-4">No recent actions</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Actor</th>
                        <th>Action</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActions.slice(0, 15).map(action => (
                        <tr key={action.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{action.timestamp ? new Date(action.timestamp).toLocaleString() : '-'}</td>
                          <td>{action.actor || '-'}</td>
                          <td>{action.message || action.actionType || '-'}</td>
                          <td style={{ maxWidth: 400 }}>{action.details ? JSON.stringify(action.details) : '-'}</td>
                        </tr>
                      ))}
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
