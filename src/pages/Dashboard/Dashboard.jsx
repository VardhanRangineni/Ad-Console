// src/pages/Dashboard/Dashboard.jsx

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pie, Bar, getElementsAtEvent } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip as ChartJsTooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Row, Col, Card, Badge, Modal, Button } from 'react-bootstrap';
import KpiCard from '../../components/common/KpiCard/KpiCard';
import { getAllDevices, getAllAssignments } from '../../services/deviceIndexeddb';
import { storeList } from '../../data/storeList';
import { mockLocations } from '../../data/mockLocations';
import { getAllContent } from '../../services/indexeddb';
import { getAllPlaylistsFromDB } from '../ManagePlaylists/ManagePlaylists.jsx';
// activity log removed on dashboard to simplify UI
import './Dashboard.css';
Chart.register(ArcElement, ChartJsTooltip, Legend, CategoryScale, LinearScale, BarElement);

function Dashboard() {
  const navigate = useNavigate();
  // Stable navigation callbacks to avoid re-creating functions on render
  const handleAssignedDevicesClick = useCallback(() => navigate('/settings?tab=listView'), [navigate]);
  const handleAssignedStoresClick = useCallback(() => navigate('/settings?tab=listView'), [navigate]);
  const handleActivePlaylistsClickLeft = useCallback(() => navigate('/manage-playlists?tab=approved'), [navigate]);
  const handleActivePlaylistsClickRight = useCallback(() => navigate('/manage-playlists?tab=approved&expiring=1&expiringDays=30'), [navigate]);
  const handleContentImagesClick = useCallback(() => navigate('/content-library?filter=hasImages'), [navigate]);
  const handleContentVideosClick = useCallback(() => navigate('/content-library?filter=hasVideos'), [navigate]);
  const handleTotalContentClick = useCallback(() => navigate('/content'), [navigate]);
  const handleBarClick = useCallback(() => navigate('/manage-playlists?tab=approved&expiring=1&expiringDays=5'), [navigate]);
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
  const devicesToUse = useMemo(() => indexedDevices || [], [indexedDevices]);
  // Memoize deviceById to avoid rebuilding on each render
  const deviceById = useMemo(() => new Map((devicesToUse || []).map(d => [normalizeId(d.id || d.deviceId), d])), [devicesToUse]);
  const disabledList = useMemo(() => JSON.parse(localStorage.getItem('disabledDevices') || '[]'), []);
  const isDeviceActive = useCallback((d) => {
    if (typeof d?.active === 'boolean') return d.active;
    if (d?.status) return d.status === 'online';
    return !disabledList.includes(d.id);
  }, [disabledList]);
  // onlineDevices & totalDevices were unused in the UI; remove to avoid lint warnings
  // offlineDevices intentionally removed (not used in this UI)
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
  }, []);

  // Content counts: prefer 'active' only for the main KPI
  // Only consider approved and active playlists (match ManagePlaylists approved rendering)
  const approvedPlaylists = useMemo(() => (playlists || []).filter(p => p.status === 'approved' && !p.inactive), [playlists]);
  // Calculate expiring approved playlists (end date within 30 days)
  const today = useMemo(() => new Date(), []);
  const thirtyDaysFromNow = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 30);
    return d;
  }, [today]);
  const expiringPlaylists = useMemo(() => approvedPlaylists.filter(p => {
    if (!p.endDate) return false;
    const end = new Date(p.endDate);
    return end >= today && end <= thirtyDaysFromNow;
  }), [approvedPlaylists, today, thirtyDaysFromNow]);
  // totalContent & activeContentCount removed as they are not used in the UI to avoid lint warnings
  // inactiveContentCount intentionally removed as not used by UI to avoid lint warnings

  // Assigned content count - count unique contentId from assignments that are currently in date range
  // assigned content count calculation removed (not currently displayed)

  // Assigned Devices and assigned store counts
  // (computed below - dependent on deviceToStoreMap)

  // Content map to resolve content type by id
  // Memoize contentById to avoid recalculating map on each render
  // contentById removed (no longer used) to avoid lint warnings; compute inline when needed in future

  // Helpers to classify content items
  const contentHasImage = (c) => {
    if (!c) return false;
    if (c.type === 'image') return true;
    if (Array.isArray(c.slides)) return c.slides.some(s => s && s.type === 'image');
    return false;
  };
  const contentHasVideo = (c) => {
    if (!c) return false;
    if (c.type === 'video') return true;
    if (Array.isArray(c.slides)) return c.slides.some(s => s && s.type === 'video');
    return false;
  };

  const activeContent = useMemo(() => (allContent || []).filter(c => c && c.active !== false), [allContent]);
  const contentWithImagesCount = useMemo(() => activeContent.filter(c => contentHasImage(c)).length, [activeContent]);
  const contentWithVideosCount = useMemo(() => activeContent.filter(c => contentHasVideo(c)).length, [activeContent]);

  // videoOnlyPlaylistsCount and imageOnlyPlaylistsCount removed as they are unused in the UI

  // (Click handler for expiring playlists badge removed for now)
  // Prebuild storeId -> state mapping helpers
  function normalizeId(v) {
    if (v === null || v === undefined) return null;
    try { return String(v).trim(); } catch (err) { return v; }
  }
  const storeById = useMemo(() => new Map(storeList.map(s => [normalizeId(s.id), s])), []);
  function normalizeState(s) {
    if (s === null || s === undefined) return null;
    try { return String(s).trim(); } catch (err) { return s; }
  }
  const mockStoreIdToState = useMemo(() => {
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
  }, []);

  // Prebuild a global deviceId->storeId mapping using assignments (used by several metrics)
  const deviceToStoreMap = useMemo(() => {
    const map = new Map();
    for (const a of assignments || []) {
      if (a && (a.deviceId !== undefined && a.deviceId !== null) && (a.locationId || a.storeId || a.storeIdInput || a.store)) {
        const did = normalizeId(String(a.deviceId));
        const sid = normalizeId(String(a.locationId || a.storeId || a.storeIdInput || a.store));
        if (!map.has(did)) map.set(did, sid);
      }
    }
    return map;
  }, [assignments]);

  // Assigned Devices and assigned store counts (dependent on assignments)
  const assignedAssignments = useMemo(() => (assignments || []).filter(a => a && (a.deviceId !== undefined && a.deviceId !== null) && (a.locationId || a.storeId || a.storeIdInput || a.store)), [assignments]);
  const assignedDevicesCount = assignedAssignments.length;
  const assignedOnlineCount = useMemo(() => assignedAssignments.filter(a => {
    if (typeof a.active === 'boolean') return a.active === true;
    const dev = deviceById.get(normalizeId(String(a.deviceId)));
    if (dev) return isDeviceActive(dev);
    return false;
  }).length, [assignedAssignments, deviceById, isDeviceActive]);
  const assignedOfflineCount = Math.max(0, assignedDevicesCount - assignedOnlineCount);
  const uniqueAssignedStoreCount = useMemo(() => {
    const s = new Set();
    for (const a of assignedAssignments) {
      const sid = normalizeId(a.locationId || a.storeId || a.storeIdInput || a.store);
      if (sid) s.add(String(sid));
    }
    return s.size;
  }, [assignedAssignments]);

  // State-wise device counts (use devices -> map to store state)
  const stateCounts = useMemo(() => {
    const map = new Map();
    // Build device-based sets per state
    const deviceStateSets = new Map(); // state -> Set(deviceId)
    const deviceToStore = deviceToStoreMap;

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
  }, [devicesToUse, assignments, deviceToStoreMap, storeById, mockStoreIdToState]);

  // Minimal delete handler for Delete Confirmation Modal
  // Dashboard currently doesn't implement a delete flow here; keep this as a safe no-op
  const handleDelete = async () => {
    setShowDeleteModal(false);
  };

  // Build a full list of states from storeList and mockLocations; ensure chart shows all states
  // Build a full list of states from storeList, mockLocations and devices; ensure chart shows all states
  const statesFromDevices = useMemo(() => new Set((devicesToUse || []).map(d => normalizeState(d && d.state)).filter(Boolean)), [devicesToUse]);
  // Extract from assignments their known states via store mapping (storeList or mockLocations)
  const statesFromAssignments = useMemo(() => {
    const sset = new Set();
    (assignments || []).forEach(a => {
      if (!a) return;
      if (a.state) sset.add(normalizeState(a.state));
      const sid = String(a.locationId || a.storeId || a.storeIdInput || a.store);
      if (!sid) return;
      const s = storeById.get(normalizeId(String(sid)));
      if (s && s.state) sset.add(normalizeState(s.state));
      else if (mockStoreIdToState.has(String(sid)) || mockStoreIdToState.has(normalizeId(sid))) sset.add(normalizeState(mockStoreIdToState.get(String(sid)) || mockStoreIdToState.get(normalizeId(sid))));
    });
    return sset;
  }, [assignments, storeById, mockStoreIdToState]);
  const [stateLabels, stateData] = useMemo(() => {
    const stateSetAll = new Set(storeList.map(s => normalizeState(s.state)).filter(Boolean));
    mockStoreIdToState.forEach((st) => stateSetAll.add(st));
    statesFromDevices.forEach(st => stateSetAll.add(st));
    statesFromAssignments.forEach(st => stateSetAll.add(st));
    // Also add any states that ended up in counts but were not in storeList/mockLocations/devices/assignments sets
    stateCounts.forEach((_, k) => stateSetAll.add(k));
    const labels = Array.from(stateSetAll).sort();
    const data = labels.map(l => stateCounts.get(l) || 0);
    return [labels, data];
  }, [mockStoreIdToState, statesFromDevices, statesFromAssignments, stateCounts]);
  // Only show states in the pie that have a non-zero count
  const [visibleStateLabels, visibleStateData] = useMemo(() => {
    const labels = stateLabels.filter((_, i) => stateData[i] > 0);
    const data = labels.map(l => stateCounts.get(l) || 0);
    return [labels, data];
  }, [stateLabels, stateData, stateCounts]);

  // Pie chart data and options memoized to avoid repeated calculation during interaction
  const pieChartData = useMemo(() => ({
    labels: visibleStateLabels,
    datasets: [
      {
        data: visibleStateData,
        backgroundColor: ['#007bff', '#28a745', '#ffc107', '#17a2b8', '#6f42c1', '#dc3545', '#fd7e14', '#20c997'].slice(0, visibleStateLabels.length),
        borderWidth: 1,
      }
    ]
  }), [visibleStateLabels, visibleStateData]);
  const pieChartOptions = useMemo(() => ({
    plugins: { legend: { display: true, position: 'right', labels: { boxWidth: 12, padding: 12 } } },
    responsive: true,
    maintainAspectRatio: false,
  }), []);

  // Bar chart: next 5 days
  const barChartData = useMemo(() => {
    const labels = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i + 1);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });
    const dataPoints = Array.from({ length: 5 }, (_, i) => {
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
    });
    return {
      labels,
      datasets: [{ label: 'Expiring Playlists', backgroundColor: '#ffc107', borderColor: '#ff9800', borderWidth: 1, data: dataPoints }]
    };
  }, [approvedPlaylists, today]);
  const barChartOptions = useMemo(() => ({
    plugins: { legend: { display: false } },
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    onHover: (event, elements) => {
      try {
        if (event && event.native && event.native.target) {
          event.native.target.style.cursor = (elements && elements.length) ? 'pointer' : 'default';
        }
      } catch (e) {
        // ignore
      }
    }
  }), []);
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
          <KpiCard
            title="Assigned Devices"
            bgClass="bg-primary"
            left={{
              sub: '',
              main: loadingIndexedDevices ? (
                <div className="spinner-border spinner-border-sm text-light" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              ) : assignedDevicesCount,
              subItems: [
                <span key="online">Online: <Badge bg="success">{loadingIndexedDevices ? (<span className="text-white-75">-</span>) : assignedOnlineCount}</Badge></span>,
                <span key="offline">Offline: <Badge bg="danger">{loadingIndexedDevices ? (<span className="text-white-75">-</span>) : assignedOfflineCount}</Badge></span>
              ]
            }}
            right={{ main: uniqueAssignedStoreCount, header: 'Stores' }}
            onClickLeft={handleAssignedDevicesClick}
            onClickRight={handleAssignedStoresClick}
          />
        </Col>

        <Col md={4} sm={6} className="mb-3">
          <KpiCard
            title="Active Playlists"
            bgClass="bg-info"
            left={{ sub: '', main: approvedPlaylists.length, subItems: [] }}
            right={{ main: expiringPlaylists.length, header: 'Near Expiring', info: 'Expiring in 10 days' }}
            onClickLeft={handleActivePlaylistsClickLeft}
            onClickRight={handleActivePlaylistsClickRight}
          />
        </Col>

        <Col md={4} sm={6} className="mb-3">
          <KpiCard
            title="Total Content"
            bgClass="bg-warning"
            left={{ sub: '', main: activeContent.length, subItems: [
              <span key="images" onClick={(e) => { e.stopPropagation(); handleContentImagesClick(); }} style={{ cursor: 'pointer' }}>Images: <Badge bg="primary">{contentWithImagesCount}</Badge></span>,
              <span key="videos" onClick={(e) => { e.stopPropagation(); handleContentVideosClick(); }} style={{ cursor: 'pointer' }}>Videos: <Badge bg="secondary">{contentWithVideosCount}</Badge></span>
            ] }}
            right={{ sub: '', main: '', header: '' }}
            onClickLeft={handleTotalContentClick}
            centerBottom={true}
          />
        </Col>
      
      </Row>

      

      {/* Dashboard Graphs */}
      <Row className="mb-4">
        <Col md={6} className="mb-3">
          <Card style={{ cursor: 'pointer' }} onClick={handleBarClick}>
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-pie-chart me-2"></i>
                  Assigned Devices per State
              </h5>
            </Card.Header>
            <Card.Body>
              <Pie
                data={pieChartData}
                options={pieChartOptions}
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
          <Card style={{ cursor: 'pointer' }} onClick={() => navigate('/manage-playlists?tab=approved&expiring=1&expiringDays=5')}>
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-bar-chart-line me-2"></i>
                Playlists Expiring (Next 5 Days)
              </h5>
            </Card.Header>
            <Card.Body>
              <Bar
                data={barChartData}
                options={barChartOptions}
                height={220}
                onClick={(event, elements) => {
                  try {
                    // elements may be empty if click on chart background
                    if (!elements || elements.length === 0) return;
                    const idx = elements[0].index;
                    if (typeof idx !== 'number') return;
                    const d = new Date(today);
                    d.setDate(today.getDate() + idx + 1);
                    const dateStr = d.toISOString().split('T')[0];
                    if (event && event.native && typeof event.native.stopImmediatePropagation === 'function') {
                      event.native.stopImmediatePropagation();
                    } else if (event && typeof event.stopPropagation === 'function') {
                      event.stopPropagation();
                    }
                    // Navigate to ManagePlaylists approved tab with exact date filter
                    navigate(`/manage-playlists?tab=approved&expiring=1&expiringDate=${encodeURIComponent(dateStr)}`);
                  } catch (err) {
                    // fallback to the general 5-day view
                    navigate('/manage-playlists?tab=approved&expiring=1&expiringDays=5');
                  }
                }}
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
