// src/pages/Dashboard/Dashboard.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pie, Bar, getElementsAtEvent } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Row, Col, Card, Badge, Modal, Button } from 'react-bootstrap';
import { getAllDevices, getAllAssignments } from '../../services/deviceIndexeddb';
import { storeList } from '../../data/storeList';
import { mockLocations } from '../../data/mockLocations';
import { getAllContent } from '../../services/indexeddb';
import { getAllPlaylistsFromDB } from '../ManagePlaylists/ManagePlaylists.jsx';
// activity log removed on dashboard to simplify UI
import './Dashboard.css';
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function Dashboard() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [indexedDevices, setIndexedDevices] = useState(null);
  const [loadingIndexedDevices, setLoadingIndexedDevices] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [allContent, setAllContent] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const pieRef = useRef(null);

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
  // assignedDevicesCount removed (not in use) to avoid ESLint no-unused-vars warning

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
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Load assignments from IndexedDB only; used to compute assigned content
  useEffect(() => {
    let mounted = true;
    async function loadAssignments() {
      try {
        const all = await getAllAssignments();
        if (!mounted) return;
        setAssignments(all || []);
      } catch (err) {
        console.error('Error reading assignments from indexedDB', err);
        setAssignments([]);
      }
    }
    loadAssignments();
    const interval = setInterval(loadAssignments, 10000);
    function onContentUpdate(e) { loadAssignments(); }
    window.addEventListener('contentUpdate', onContentUpdate);
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('contentUpdate', onContentUpdate);
    };
  });

  // Content counts: prefer 'active' only for the main KPI
  // Only consider approved and active playlists (match ManagePlaylists approved rendering)
  const approvedPlaylists = playlists.filter(p => p.status === 'approved' && !p.inactive);
  // Calculate expiring approved playlists (end date within 30 days)
  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  const expiringPlaylists = approvedPlaylists.filter(p => {
    if (!p.endDate) return false;
    const end = new Date(p.endDate);
    return end >= today && end <= thirtyDaysFromNow;
  });
  const totalContent = allContent ? allContent.length : 0;
  const activeContentCount = allContent ? allContent.filter(c => c.active !== false).length : 0;
  const inactiveContentCount = Math.max(0, totalContent - activeContentCount);

  // Assigned content count - count unique contentId from assignments that are currently in date range
  const assignedContentCount = (() => {
    const unique = new Set();
    // Count contentId from content assignments (if any)
    for (const a of assignments || []) {
      const { contentId, startDate, endDate } = a;
      if (!contentId) continue;
      // consider assignment active if no dates or today within range
      if (!startDate && !endDate) {
        unique.add(contentId);
        continue;
      }
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      const within = (!start || start <= today) && (!end || end >= today);
      if (within) unique.add(contentId);
    }
    // Also include content selected in approved playlists that are active (start/end date range or no dates)
    for (const p of approvedPlaylists || []) {
      if (!p.selectedContent || !Array.isArray(p.selectedContent) || p.selectedContent.length === 0) continue;
      const start = p.startDate ? new Date(p.startDate) : null;
      const end = p.endDate ? new Date(p.endDate) : null;
      const within = (!start || start <= today) && (!end || end >= today);
      if (!within) continue;
      for (const cid of p.selectedContent) {
        if (cid) unique.add(cid);
      }
    }
    return unique.size;
  })();

  // (Click handler for expiring playlists badge removed for now)
  // Prebuild storeId -> state mapping helpers
  const normalizeId = (v) => {
    if (v === null || v === undefined) return null;
    try { return String(v).trim(); } catch (err) { return v; }
  };
  const storeById = new Map(storeList.map(s => [normalizeId(s.id), s]));
  const normalizeState = (s) => {
    if (s === null || s === undefined) return null;
    try { return String(s).trim(); } catch (err) { return s; }
  };
  const mockStoreIdToState = (() => {
    const map = new Map();
    function build(node, curState) {
      if (!node) return;
      let stateName = curState;
      if (node.type === 'state') stateName = node.name;
      if (node.type === 'store') {
        map.set(String(node.id), normalizeState(stateName || 'Unknown'));
        return;
      }
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(c => build(c, stateName));
      }
    }
    build(mockLocations, null);
    return map;
  })();

  // State-wise device counts (use devices -> map to store state)
  const stateCounts = (() => {
    const map = new Map();
    // Build device-based sets per state
    const deviceStateSets = new Map(); // state -> Set(deviceId)
    const deviceToStore = new Map();
    for (const a of assignments || []) {
      if (a && (a.deviceId !== undefined && a.deviceId !== null) && (a.locationId || a.storeId || a.storeIdInput || a.store)) {
        const did = normalizeId(String(a.deviceId));
        const sid = normalizeId(String(a.locationId || a.storeId || a.storeIdInput || a.store));
        if (!deviceToStore.has(did)) deviceToStore.set(did, sid);
      }
    }

    for (const d of devicesToUse) {
      if (!d) continue;
      const did = normalizeId(d.id || d.deviceId);
      let storeId = d.storeId || d.storeIdInput || d.storeID || d.store || d.storeId;
      if (!storeId) {
        const mapped = deviceToStore.get(did) || deviceToStore.get(normalizeId(d.deviceId));
        if (mapped) storeId = mapped;
      }
      let state = 'Unassigned';
      if (storeId) {
        const s = storeById.get(normalizeId(String(storeId)));
        if (s && s.state) state = normalizeState(s.state);
        else if (mockStoreIdToState.has(String(storeId)) || mockStoreIdToState.has(normalizeId(storeId))) state = normalizeState(mockStoreIdToState.get(String(storeId)) || mockStoreIdToState.get(normalizeId(storeId)));
        else state = 'Unknown';
      } else if (d.state) {
        state = normalizeState(d.state);
      }
      if (state && state !== 'Unassigned') {
        if (!deviceStateSets.has(state)) deviceStateSets.set(state, new Set());
        deviceStateSets.get(state).add(did);
      }
    }

    const assignmentStateSets = new Map(); // state -> Set(deviceId)
    for (const a of assignments || []) {
      if (!a) continue;
      const did = (a.deviceId !== undefined && a.deviceId !== null) ? normalizeId(String(a.deviceId)) : null;
      let state = null;
      if (a.state) state = normalizeState(a.state);
      const sid = normalizeId(a.locationId || a.storeId || a.storeIdInput || a.store);
      if (!state && sid) {
        const store = storeById.get(normalizeId(String(sid)));
        if (store && store.state) state = normalizeState(store.state);
        else if (mockStoreIdToState.has(String(sid)) || mockStoreIdToState.has(normalizeId(sid))) state = normalizeState(mockStoreIdToState.get(String(sid)) || mockStoreIdToState.get(normalizeId(sid)));
      }
      if (!state && a.locationName) {
        const s = storeList.find(s => s.name === a.locationName || s.name === (a.locationName || '').trim());
        if (s && s.state) state = normalizeState(s.state);
      }
      if (state && state !== 'Unassigned') {
        if (!assignmentStateSets.has(state)) assignmentStateSets.set(state, new Set());
        if (did) assignmentStateSets.get(state).add(did);
      }
    }

    const states = new Set();
    deviceStateSets.forEach((_, st) => states.add(st));
    assignmentStateSets.forEach((_, st) => states.add(st));
    states.forEach(st => {
      const ds = deviceStateSets.get(st) || new Set();
      const as = assignmentStateSets.get(st) || new Set();
      const union = new Set([...Array.from(ds), ...Array.from(as)]);
      map.set(st, union.size);
    });
    return map;
  })();

  // Minimal delete handler for Delete Confirmation Modal
  // Dashboard currently doesn't implement a delete flow here; keep this as a safe no-op
  const handleDelete = async () => {
    setShowDeleteModal(false);
  };

  // Build a full list of states from storeList and mockLocations; ensure chart shows all states
  // Build a full list of states from storeList, mockLocations and devices; ensure chart shows all states
  const statesFromDevices = new Set((devicesToUse || []).map(d => normalizeState(d && d.state)).filter(Boolean));
  // Extract from assignments their known states via store mapping (storeList or mockLocations)
  const statesFromAssignments = new Set();
  (assignments || []).forEach(a => {
    if (!a) return;
    if (a.state) {
      statesFromAssignments.add(normalizeState(a.state));
    }
    const sid = String(a.locationId || a.storeId || a.storeIdInput || a.store);
    if (!sid) return;
    const s = storeById.get(normalizeId(String(sid)));
    if (s && s.state) statesFromAssignments.add(normalizeState(s.state));
    else if (mockStoreIdToState.has(String(sid)) || mockStoreIdToState.has(normalizeId(sid))) statesFromAssignments.add(normalizeState(mockStoreIdToState.get(String(sid)) || mockStoreIdToState.get(normalizeId(sid))));
  });
  const stateSetAll = new Set(storeList.map(s => normalizeState(s.state)).filter(Boolean));
  mockStoreIdToState.forEach((st) => stateSetAll.add(st));
  statesFromDevices.forEach(st => stateSetAll.add(st));
  statesFromAssignments.forEach(st => stateSetAll.add(st));
  // Also add any states that ended up in counts but were not in storeList/mockLocations/devices/assignments sets
  stateCounts.forEach((c, k) => stateSetAll.add(k));
  const stateLabels = Array.from(stateSetAll).sort();
  const stateData = stateLabels.map(l => stateCounts.get(l) || 0);
  // Only show states in the pie that have a non-zero count
  const visibleStateLabels = stateLabels.filter((_, i) => stateData[i] > 0);
  const visibleStateData = visibleStateLabels.map(l => stateCounts.get(l) || 0);
  // Removed debug for state labels & data

  return (
    <div className="dashboard">
      <h2 className="mb-4">
        <i className="bi bi-speedometer2 me-2"></i>
        Dashboard Overview
      </h2>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={4} sm={6} className="mb-3">
          <Card
            className="stat-card bg-primary text-white"
            style={{ minHeight: 140, cursor: 'pointer' }}
            onClick={() => navigate('/devices')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/devices'); }}
          >
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
            {/* Removed dev-only footer to keep KPI card clean */}
          </Card>
        </Col>

        {/* Active Screens KPI removed by request */}

        <Col md={4} sm={6} className="mb-3">
          <Card
            className="stat-card bg-info text-white"
            style={{ minHeight: 140, cursor: 'pointer' }}
            onClick={() => navigate('/assign')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/assign'); }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center" style={{ minHeight: 90 }}>
                <div>
                  <h6 className="text-white-50 mb-2">Assigned Content</h6>
                    <h2 className="mb-0">{assignedContentCount}</h2>
                  <div className="d-flex align-items-center mt-2 small screen-stats">
                    <div>Inactive: <Badge bg="danger">{inactiveContentCount}</Badge></div>
                  </div>
                </div>
                <i className="bi bi-collection-play stat-icon"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} sm={6} className="mb-3">
            <Card
            className="stat-card bg-warning text-white"
            style={{ minHeight: 140, cursor: 'pointer' }}
            onClick={() => navigate('/manage-playlists?expiring=1&expiringDays=30')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/manage-playlists?expiring=1&expiringDays=30'); }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center" style={{ minHeight: 90 }}>
                <div>
                  <h6 className="text-white-50 mb-2">Approved Playlists Expiring in 30 Days</h6>
                  <h2 className="mb-0">
                    <Badge
                      bg="danger"
                      pill
                      style={{ fontSize: '1.5rem', verticalAlign: 'middle' }}
                      title="Playlists expiring in 30 days"
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
          <Card style={{ cursor: 'pointer' }}>
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-pie-chart me-2"></i>
                Devices by State
              </h5>
            </Card.Header>
            <Card.Body>
              <Pie
                data={{
                  labels: visibleStateLabels,
                  datasets: [
                    {
                      data: visibleStateData,
                      backgroundColor: [
                        '#007bff', '#28a745', '#ffc107', '#17a2b8', '#6f42c1', '#dc3545', '#fd7e14', '#20c997'
                      ].slice(0, visibleStateLabels.length),
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: { display: true, position: 'right', labels: { boxWidth: 12, padding: 12 } },
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                }}
                height={220}
                ref={pieRef}
                onClick={(event, elements) => {
                  try {
                    let elts = elements;
                    if ((!elts || elts.length === 0) && pieRef.current) {
                      elts = getElementsAtEvent(pieRef.current, event);
                    }
                    if (!elts || elts.length === 0) return;
                    const idx = elts[0].index;
                    const state = visibleStateLabels[idx];
                    // Removed click debug log
                    if (state) navigate(`/settings?tab=listView&state=${encodeURIComponent(state)}`);
                  } catch (e) {
                    // Best-effort fallback
                    const el = elements && elements[0];
                    const idx = el?.index;
                    // Removed fallback click debug log
                    if (typeof idx === 'number') {
                      const state = visibleStateLabels[idx];
                      if (state) navigate(`/settings?tab=listView&state=${encodeURIComponent(state)}`);
                    }
                  }
                }}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-3">
          <Card style={{ cursor: 'pointer' }}>
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

      {/* Expiring Playlists table removed per request */}

      {/* Recent Activity table removed per request */}

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
