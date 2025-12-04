import { getAllAssignments, deleteAssignment, bulkAddAssignments } from '../../services/deviceIndexeddb';
// src/pages/DeviceManagement/DeviceManagement.jsx - ENHANCED CONFIGURATOR

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Row, Col, Button, Form, InputGroup, Modal, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import * as XLSX from 'xlsx';
// import { useApp } from '../../context/AppContext';
import { storeList } from '../../data/storeList';
// import { getAllContent } from '../../services/indexeddb';
import { getAllDevices, addDevice, updateDevice, deleteDeviceById } from '../../services/deviceIndexeddb';

function DeviceManagement() {
  // Load assignments from IndexedDB on mount
  React.useEffect(() => {
    async function loadAssignmentsFromDB() {
      const all = await getAllAssignments();
      setAssignments(all);
    }
    loadAssignmentsFromDB();
  }, []);
  // ...existing state...
  // Fix: Add missing state for configMacAddress and showInlineAssignForm
  const [configMacAddress, setConfigMacAddress] = React.useState('');
  // (No UI code here, but ensure that when rendering, use Bootstrap classes for all forms, tables, and modals)
  // For example, wrap main content in <div className="container-fluid py-4 bg-light min-vh-100">
  // Use .card, .shadow, .rounded, .table, .btn, .form-control, .form-label, .row, .col, etc. for all UI elements
  // Add .fw-bold, .text-primary, .mb-3, .mb-4, .p-3, .bg-white, .border, .rounded-pill, etc. for visual polish
  // For modals, use .modal-content, .modal-header, .modal-body, .modal-footer, and add .bg-white .rounded
  // For tabs, use .nav-tabs, .nav-link, .active, etc.
  // For alerts, use .alert, .alert-info, .alert-warning, .alert-success, etc.
  // For buttons, use .btn, .btn-primary, .btn-outline-primary, .btn-danger, .btn-outline-danger, .shadow-sm, .px-3, .rounded-pill
  // For tables, use .table, .table-bordered, .table-hover, .table-light, .align-middle, .shadow-sm, .rounded
  // For section headers, use .fw-bold, .text-primary, .mb-3, .mb-4
  // For spacing, use .mb-2, .mb-3, .mb-4, .py-2, .py-3, .px-2, .px-3
  // For cards, use .card, .card-body, .shadow, .rounded, .mb-3, .bg-white
  // For dropdowns and selects, use .form-select, .form-control
  // For search bars, use .input-group, .form-control, .input-group-text
  // For preview modals, use .modal-lg, .modal-dialog-centered, .bg-dark, .rounded
  // For confirmation dialogs, use .modal, .modal-content, .modal-header, .modal-body, .modal-footer, .text-center, .text-danger, .fw-bold
  // For all icons, use Bootstrap Icons with .me-2, .me-1, etc.

  // ...existing code...

  const [selectedStoreForAssignment, setSelectedStoreForAssignment] = React.useState(null);

  // MAC address validation helper (must be after macAddressToAssign is declared)
  const [storeDeviceMap, setStoreDeviceMap] = React.useState([]);
  const [assignments, setAssignments] = React.useState([]); // NEW STATE for assignments
  const [activeSubTab, setActiveSubTab] = React.useState('assign');
  const location = useLocation();

  // Sync activeSubTab with query param `sub` if present (e.g., ?sub=listView)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sub = params.get('sub');
    if (sub) {
      setActiveSubTab(sub);
    }
  }, [location.search]);

  // ...removed Edit Store Modal state...

  // Autocomplete for manual store IDs


  // Inline assign form edit state for Assign tab
  const [assignTabEditMode, setAssignTabEditMode] = React.useState(false);
  // Track staged changes for Assign tab (deactivate toggles)
  const [assignTabAssignments, setAssignTabAssignments] = React.useState([]);

  // Hierarchical store selection state (using storeList from PDF)

  // Helper functions to get unique options from storeList

  // Validate manual store IDs (must match a store in storeList)

  // Context and device lists must come first
  const [devices, setDevices] = React.useState([]);

  function formatDateShort(dt) {
    if (!dt) return '-';
    const d = new Date(dt);
    // Format dd-MMM-yy, hh:mm
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = pad(d.getDate());
    const mon = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${day}-${mon}-${year}, ${hours}:${mins}`;
  }

  function generateCreatorId(device, idx) {
    // Deterministic mock creator id in format OTGxxxxxA
    // Use last 5 alphanumeric chars of device.id or pad with digits
    let base = String(device?.id || `DEV${idx}`).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    // last 5 chars
    let suffix = base.slice(-5);
    if (suffix.length < 5) suffix = suffix.padStart(5, '0');
    // Add trailing letter based on checksum
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += base.charCodeAt(i);
    const letter = String.fromCharCode(65 + (sum % 26));
    return `OTG${suffix}${letter}`;
  }

  // Load devices from IndexedDB on mount
  useEffect(() => {
    async function loadDevicesFromDB() {
      const all = await getAllDevices();
      setDevices(all);
    }
    loadDevicesFromDB();
  }, []);

  // Re-calculate the store-to-device mapping whenever assignments or device models change
  useEffect(() => {
    const groupedByStore = assignments.reduce((acc, assignment) => {
      const storeId = assignment.storeId;
      if (!acc[storeId]) {
        const storeDetails = storeList.find(s => s.id === storeId);
        acc[storeId] = {
          id: storeId,
          name: storeDetails ? storeDetails.name : assignment.storeName || 'Unknown Store',
          area: storeDetails ? storeDetails.area : assignment.area || '',
          state: storeDetails ? (storeDetails.state && String(storeDetails.state).trim()) : (assignment.state && String(assignment.state).trim()) || '',
          deviceCount: 0,
          devices: [] // This will hold device instances with assignment info
        };
      }
      const deviceModel = devices.find(d => d.id === assignment.deviceId);
      if (deviceModel) {
        acc[storeId].deviceCount++;
        acc[storeId].devices.push({
          ...deviceModel,
          assignmentId: assignment.assignmentId,
          macAddress: assignment.macAddress,
          orientation: assignment.orientation || deviceModel.orientation,
          active: assignment.active !== false // Default to true
        });
      }
      return acc;
    }, {});
    setStoreDeviceMap(Object.values(groupedByStore));
  }, [assignments, devices]);

  useEffect(() => {
    if (selectedStoreForAssignment) {
      const storeData = storeDeviceMap.find(s => s.id === selectedStoreForAssignment.value);
      // When a store is selected, initialize assignTabAssignments for editing
      setAssignTabAssignments(storeData ? storeData.devices.map(d => ({ ...d })) : []);
      setAssignTabEditMode(false);
    } else {
      setAssignTabAssignments([]);
      setAssignTabEditMode(false);
    }
  }, [selectedStoreForAssignment, storeDeviceMap]);

  // ...existing hooks...
  const [activeTab] = React.useState('configurator');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showConfigModal, setShowConfigModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [newDeviceName, setNewDeviceName] = React.useState('');
  const [newDeviceNameError, setNewDeviceNameError] = React.useState('');
  const [newDeviceOrientation, setNewDeviceOrientation] = React.useState('both');
  const [newDeviceResolutionWidth, setNewDeviceResolutionWidth] = React.useState('1920');
  const [newDeviceResolutionHeight, setNewDeviceResolutionHeight] = React.useState('1080');
  const [newDeviceResolutionError, setNewDeviceResolutionError] = React.useState('');
  const [isClone, setIsClone] = React.useState(false);
  const [configDevice, setConfigDevice] = React.useState(null);
  const [configName, setConfigName] = React.useState('');
  const [configNameError, setConfigNameError] = React.useState('');
  const [configOrientation, setConfigOrientation] = React.useState('both');
  const [configResolutionWidth, setConfigResolutionWidth] = React.useState('1920');
  const [configResolutionHeight, setConfigResolutionHeight] = React.useState('1080');
  const [configResolutionError, setConfigResolutionError] = React.useState('');
  const [deleteDeviceState, setDeleteDeviceState] = React.useState(null);
  // Modal for disable warning and confirmation
  const [showDisableWarning, setShowDisableWarning] = React.useState(false);
  const [disableWarningStores, setDisableWarningStores] = React.useState([]);
  const [showDisableConfirm, setShowDisableConfirm] = React.useState(false);
  const [pendingDisableDeviceId, setPendingDisableDeviceId] = React.useState(null);
  // Track disabled devices (array of device IDs)
  const [disabledDevices, setDisabledDevices] = React.useState(() => {
    const saved = localStorage.getItem('disabledDevices');
    return saved ? JSON.parse(saved) : [];
  });

  function orientationLabel(orientation) {
    if (!orientation) return 'Both';
    const o = String(orientation).toLowerCase();
    if (o === 'horizontal') return 'Landscape';
    if (o === 'vertical') return 'Portrait';
    return 'Both';
  }

  const handleDownloadDeviceTypes = () => {
    // Build data copy same as table displayed
    const data = (devices || []).map((d, idx) => {
      const isDisabled = (typeof d.active === 'boolean') ? !d.active : disabledDevices.includes(d.id);
      const statusLabel = isDisabled ? 'Inactive' : 'Active';
      return ({
        'Device Type ID': d.id,
        'Device Type': d.name || '-',
        'Possible Orientations': orientationLabel(d.orientation || 'both'),
        'Resolution (W × H)': `${(d.resolution && d.resolution.width) || 1920} × ${(d.resolution && d.resolution.height) || 1080}`,
        'Created By': d.createdBy || generateCreatorId(d, idx),
        'Created On': d.createdAt ? formatDateShort(d.createdAt) : formatDateShort(new Date(Date.now() - ((idx + 1) * 60 * 60 * 1000) - (idx * 60000))),
        'Status': statusLabel
      });
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DeviceTypes');
    XLSX.writeFile(workbook, 'device-types.xlsx');
  };

  // Disable device handler
  const handleToggleDisableDevice = async (deviceId, isCurrentlyDisabled) => {
    // If currently disabled -> enabling flow is not allowed (permanently disabled)
    if (isCurrentlyDisabled) {
      alert('This device is permanently disabled and cannot be enabled again.');
      return;
    }
    const assignedStores = assignments.filter(a => a.deviceId === deviceId).map(a => a.storeName || a.storeId);
    if (assignedStores.length > 0) {
      setDisableWarningStores(assignedStores);
      setShowDisableWarning(true);
      return;
    }
    setPendingDisableDeviceId(deviceId);
    setShowDisableConfirm(true);
  };

  const confirmDisableDevice = async () => {
    if (pendingDisableDeviceId) {
      const updated = [...disabledDevices, pendingDisableDeviceId];
      setDisabledDevices(updated);
      localStorage.setItem('disabledDevices', JSON.stringify(updated));
      try {
        const deviceObj = devices.find(d => d.id === pendingDisableDeviceId);
        if (deviceObj) {
          await updateDevice({ ...deviceObj, active: false });
          const all = await getAllDevices();
          setDevices(all);
        }
      } catch (err) {
        console.error('Error disabling device in DB', err);
      }
    }
    setShowDisableConfirm(false);
    setPendingDisableDeviceId(null);
  };

  // Add Device orientation change handler
  const handleNewDeviceOrientationChange = (newOrientation) => {
    setNewDeviceOrientation(newOrientation);
    // Auto-swap logic
    if (newOrientation === 'vertical') {
      if (parseInt(newDeviceResolutionWidth) > parseInt(newDeviceResolutionHeight)) {
        const temp = newDeviceResolutionWidth;
        setNewDeviceResolutionWidth(newDeviceResolutionHeight);
        setNewDeviceResolutionHeight(temp);
      }
    } else if (newOrientation === 'horizontal') {
      if (parseInt(newDeviceResolutionHeight) > parseInt(newDeviceResolutionWidth)) {
        const temp = newDeviceResolutionWidth;
        setNewDeviceResolutionWidth(newDeviceResolutionHeight);
        setNewDeviceResolutionHeight(temp);
      }
    }
  };
  // Re-validate new device resolution when orientation changes
  React.useEffect(() => {
    if (newDeviceOrientation) {
      setNewDeviceResolutionError(validateResolution(newDeviceOrientation, newDeviceResolutionWidth, newDeviceResolutionHeight));
    }
  }, [newDeviceOrientation, newDeviceResolutionWidth, newDeviceResolutionHeight]);

  // Clear add modal errors when modal closes
  React.useEffect(() => {
    if (!showAddModal) {
      setNewDeviceNameError('');
      setNewDeviceResolutionError('');
    }
  }, [showAddModal]);

  function isDuplicateActiveDeviceName(name, excludeId = null) {
    if (!name) return false;
    const n = name.trim().toLowerCase();
    return (devices || []).some(d => d && d.active && d.name && String(d.name).trim().toLowerCase() === n && (excludeId ? d.id !== excludeId : true));
  }

  async function asyncIsDuplicateActiveDeviceName(name, excludeId = null) {
    if (!name) return false;
    const n = name.trim().toLowerCase();
    try {
      const allDevices = await getAllDevices();
      return (allDevices || []).some(d => d && d.active && d.name && String(d.name).trim().toLowerCase() === n && (excludeId ? d.id !== excludeId : true));
    } catch (err) {
      console.error('Error checking device names', err);
      return false; // Fail open: don't block adding if DB fails
    }
  }

  function validateResolution(orientation, widthStr, heightStr) {
    const w = parseInt(widthStr, 10);
    const h = parseInt(heightStr, 10);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return 'Please enter a valid resolution for the selected orientation';
    const orient = orientation || 'both';
    if (orient === 'horizontal' || orient === 'both') {
      if (w <= h) return 'Please enter a valid resolution for landscape orientation';
    }
    if (orient === 'vertical') {
      if (h <= w) return 'Please enter a valid resolution for portrait orientation';
    }
    return '';
  }

  // Add Device handler
  const handleAddDevice = async () => {
    const trimmedName = newDeviceName.trim();
    if (!trimmedName) {
      setNewDeviceNameError('Please enter device name');
      return;
    }
    // Validate resolution first
    const resErr = validateResolution(newDeviceOrientation, newDeviceResolutionWidth, newDeviceResolutionHeight);
    if (resErr) {
      setNewDeviceResolutionError(resErr);
      return;
    }
    // Re-check in DB in case local state is stale
    if (await asyncIsDuplicateActiveDeviceName(trimmedName)) {
      setNewDeviceNameError('Multiple active Device Types cannot exist with same name');
      return;
    }
    const newDevice = {
      id: Date.now().toString(),
      name: newDeviceName,
      orientation: newDeviceOrientation,
      resolution: {
        width: parseInt(newDeviceResolutionWidth),
        height: parseInt(newDeviceResolutionHeight)
      }
      ,
      active: true,
    };
    await addDevice(newDevice);
    const all = await getAllDevices();
    setDevices(all);
    setShowAddModal(false);
    setIsClone(false);
    setNewDeviceName('');
    setNewDeviceOrientation('both');
    setNewDeviceResolutionWidth('1920');
    setNewDeviceResolutionHeight('1080');
    setNewDeviceNameError('');
    setNewDeviceResolutionError('');
  };

  // Reset the Add Device modal form fields to default values (keep modal open)
  const handleResetAddModal = () => {
    setNewDeviceName('');
    setNewDeviceOrientation('both');
    setNewDeviceResolutionWidth('1920');
    setNewDeviceResolutionHeight('1080');
    setIsClone(false);
    setNewDeviceNameError('');
    setNewDeviceResolutionError('');
  };

  // openConfigModal removed: configure action removed from the actions column. The configure modal remains but won't be opened via the table actions.

  const handleOrientationChange = (newOrientation) => {
    setConfigOrientation(newOrientation);

    // Auto-swap resolution when changing orientation
    if (newOrientation === 'vertical') {
      // If current is landscape (width > height), swap
      if (parseInt(configResolutionWidth) > parseInt(configResolutionHeight)) {
        const temp = configResolutionWidth;
        setConfigResolutionWidth(configResolutionHeight);
        setConfigResolutionHeight(temp);
      }
    } else if (newOrientation === 'horizontal') {
      // If current is portrait (height > width), swap
      if (parseInt(configResolutionHeight) > parseInt(configResolutionWidth)) {
        const temp = configResolutionWidth;
        setConfigResolutionWidth(configResolutionHeight);
        setConfigResolutionHeight(temp);
      }
    }
  };
  // Re-validate config resolution when orientation or resolution values change
  React.useEffect(() => {
    setConfigResolutionError(validateResolution(configOrientation, configResolutionWidth, configResolutionHeight));
  }, [configOrientation, configResolutionWidth, configResolutionHeight]);

  // Clear config modal errors when modal closes
  React.useEffect(() => {
    if (!showConfigModal) {
      setConfigNameError('');
      setConfigResolutionError('');
    }
  }, [showConfigModal]);

  const handleResolutionChange = (dimension, value) => {
    if (dimension === 'width') {
      setConfigResolutionWidth(value);
    } else {
      setConfigResolutionHeight(value);
    }
  };

  const handleSaveConfiguration = async () => {
    const trimmedName = configName.trim();
    if (!trimmedName) {
      setConfigNameError('Please enter device name');
      return;
    }
    // Re-check in DB in case local state is stale
    if (await asyncIsDuplicateActiveDeviceName(trimmedName, configDevice?.id)) {
      setConfigNameError('Multiple active Device Types cannot exist with same name');
      return;
    }
    // Validate resolution
    const resErr = validateResolution(configOrientation, configResolutionWidth, configResolutionHeight);
    if (resErr) {
      setConfigResolutionError(resErr);
      return;
    }
    const updatedDevice = {
      ...configDevice,
      name: configName,
      orientation: configOrientation,
      resolution: {
        width: parseInt(configResolutionWidth),
        height: parseInt(configResolutionHeight)
      }
      ,
      active: typeof configDevice?.active === 'boolean' ? configDevice.active : true,
    };
    await updateDevice(updatedDevice);
    const all = await getAllDevices();
    setDevices(all);
    setShowConfigModal(false);
    setConfigDevice(null);
    setConfigNameError('');
    setConfigResolutionError('');
  };


  const handleDeleteDevice = async () => {
    if (deleteDeviceState) {
      await deleteDeviceById(deleteDeviceState.id);
      const all = await getAllDevices();
      setDevices(all);
      setShowDeleteModal(false);
      setDeleteDeviceState(null);
    }
  };

  // Removed unused: openAssignModal, handleStageAssignment, handleRemoveStagedAssignment, handleAssignToStore

  // Clone device handler (must be outside JSX)
  const handleCloneDevice = (device) => {
    setNewDeviceName('');
    setNewDeviceOrientation(device.orientation || 'both');
    setNewDeviceResolutionWidth(device.resolution?.width?.toString() || '1920');
    setNewDeviceResolutionHeight(device.resolution?.height?.toString() || '1080');
    setIsClone(true);
    setShowAddModal(true);
  };

  // Save Changes in Assign tab (writes to IndexedDB, returns to List View)
  const handleAssignTabSaveChanges = async () => {
    if (!selectedStoreForAssignment) return;
    // Remove all assignments for this store
    const allAssignments = await getAllAssignments();
    const toDelete = allAssignments.filter(a => a.storeId === selectedStoreForAssignment.value);
    for (const a of toDelete) {
      await deleteAssignment(a.assignmentId);
    }
    // Add updated assignments
    const newAssignments = assignTabAssignments.map(d => ({
      assignmentId: d.assignmentId,
      deviceId: d.id,
      storeId: selectedStoreForAssignment.value,
      macAddress: d.macAddress,
      orientation: d.orientation,
      active: d.active,
    }));
    await bulkAddAssignments(newAssignments);
    const updatedAssignments = await getAllAssignments();
    setAssignments(updatedAssignments);
    // Return to List View
    setActiveSubTab('listView');
    setSelectedStoreForAssignment(null);
    setAssignTabEditMode(false);
  };

  return (
    <div className="device-management">

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div></div>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          <Button variant="secondary" onClick={handleDownloadDeviceTypes} disabled={!devices || devices.length === 0}>
            <i className="bi bi-download me-2"></i>
            Download
          </Button>
          <Button variant="primary" onClick={() => { setShowAddModal(true); setIsClone(false); setNewDeviceName(''); setNewDeviceNameError(''); setNewDeviceOrientation('both'); setNewDeviceResolutionWidth('1920'); setNewDeviceResolutionHeight('1080'); }}>
            Add Device Type
          </Button>
        </div>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>
          <i className="bi bi-hdd-network me-2"></i>
          Device Type List
        </h4>
      </div>
      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-light">
            <tr>
              <th>Device Type ID</th>
              <th>Device Type</th>
              <th>Possible Orientations</th>
              <th>Resolution (W × H)</th>
              <th>Created By</th>
              <th>Created On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted">No records found</td>
              </tr>
            ) : (
              devices.map((device, idx) => {
                // Determine disabled status from DB active flag or fallback to localStorage
                const isDisabled = (typeof device.active === 'boolean') ? !device.active : disabledDevices.includes(device.id);
                // Determine if device is assigned to any store
                const isAssignedToStore = assignments.some(a => a.deviceId === device.id);
                return (
                  <tr key={device.id}>
                    <td>{device.id}</td>
                    <td className="font-monospace small">{device.name}</td>
                    <td>
                      {/* Display orientation as text only (Both / Landscape / Portrait) */}
                      <div>
                        {(() => {
                          const orientation = (device.orientation || 'both');
                          if (orientation === 'horizontal') return 'Landscape';
                          if (orientation === 'vertical') return 'Portrait';
                          return 'Both';
                        })()}
                      </div>
                    </td>
                    <td>{device.resolution?.width || 1920} × {device.resolution?.height || 1080}</td>
                    <td className="font-monospace small">{device.createdBy || generateCreatorId(device, idx)}</td>
                    <td>{device.createdAt ? formatDateShort(device.createdAt) : formatDateShort(new Date(Date.now() - ((idx + 1) * 60 * 60 * 1000) - (idx * 60000)))}</td>
                    <td>
                      {/* Disable/Enable Toggle Switch */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        {/* Edit/Configure removed from actions per UX request */}
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip id={`tooltip-clone-${device.id}`}>Clone</Tooltip>}
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleCloneDevice(device)}
                          >
                            <i className="bi bi-files"></i>
                          </Button>
                        </OverlayTrigger>

                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip id={`tooltip-disable-${device.id}`}>{isDisabled ? 'This device has been disabled and cannot be re-enabled.' : (isAssignedToStore && device.active ? 'Cannot disable while assigned to a store. Unassign first.' : (isDisabled ? 'Disabled' : !isDisabled ? 'Disable device' : 'Enable device'))}</Tooltip>}
                        >
                          <div>
                            <Form.Check
                              type="switch"
                              id={`disable-switch-${device.id}`}
                              checked={!isDisabled}
                              onChange={() => handleToggleDisableDevice(device.id, isDisabled)}
                              disabled={isDisabled || (isAssignedToStore && device.active)}
                              label={!isDisabled ? 'Active' : 'Inactive'}
                              style={{ marginBottom: 0, marginRight: 8 }}
                            />
                          </div>
                        </OverlayTrigger>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>


      {/* Add Device Modal */}
      <Modal show={showAddModal} onHide={() => { setShowAddModal(false); setIsClone(false); }} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{isClone ? 'Clone Device' : 'Add Device Type'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Device Type */}
            <Form.Group className="mb-3">
              <Form.Label>Device Type *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Samsung 4k display"
                value={newDeviceName}
                onChange={(e) => { setNewDeviceName(e.target.value); if (newDeviceNameError) setNewDeviceNameError(''); }}
                onBlur={() => {
                  const n = newDeviceName.trim();
                  if (!n) setNewDeviceNameError('Please enter device name');
                  else if (isDuplicateActiveDeviceName(n)) setNewDeviceNameError('Multiple active Device Types cannot exist with same name');
                  else setNewDeviceNameError('');
                }}
                isInvalid={!!newDeviceNameError}
              />
              <Form.Control.Feedback type="invalid">{newDeviceNameError}</Form.Control.Feedback>
            </Form.Group>

            {/* Orientation */}
            <Form.Group className="mb-3">
              <Form.Label>Possible Screen Orientations *</Form.Label>
              <div>
                <Form.Check
                  type="radio"
                  id="new-orientation-both"
                  label={
                    <>
                      <i className="bi bi-arrows-angle-expand me-2"></i>
                      Both
                    </>
                  }
                  value="both"
                  checked={newDeviceOrientation === 'both'}
                  onChange={(e) => handleNewDeviceOrientationChange(e.target.value)}
                />
                <Form.Check
                  type="radio"
                  id="new-orientation-horizontal"
                  label={
                    <>
                      <i className="bi bi-phone-landscape me-2"></i>
                      Landscape
                    </>
                  }
                  value="horizontal"
                  checked={newDeviceOrientation === 'horizontal'}
                  onChange={(e) => handleNewDeviceOrientationChange(e.target.value)}
                />
                <Form.Check
                  type="radio"
                  id="new-orientation-vertical"
                  label={
                    <>
                      <i className="bi bi-phone me-2"></i>
                      Portrait
                    </>
                  }
                  value="vertical"
                  checked={newDeviceOrientation === 'vertical'}
                  onChange={(e) => handleNewDeviceOrientationChange(e.target.value)}
                />
              </div>
            </Form.Group>

            {/* Display Resolution */}
            <Form.Group className="mb-3">
              <Form.Label>Display Resolution (pixels) *</Form.Label>
              <Row>
                <Col md={5}>
                  <InputGroup>
                    <InputGroup.Text>Width</InputGroup.Text>
                    <Form.Control
                      type="number"
                      value={newDeviceResolutionWidth}
                      onChange={(e) => { setNewDeviceResolutionWidth(e.target.value); if (newDeviceResolutionError) setNewDeviceResolutionError(''); }}
                      onBlur={() => setNewDeviceResolutionError(validateResolution(newDeviceOrientation, newDeviceResolutionWidth, newDeviceResolutionHeight))}
                      min="640"
                      max="7680"
                    />
                    <InputGroup.Text>px</InputGroup.Text>
                  </InputGroup>
                </Col>
                <Col md={2} className="text-center">
                  <div className="pt-2">×</div>
                </Col>
                <Col md={5}>
                  <InputGroup>
                    <InputGroup.Text>Height</InputGroup.Text>
                    <Form.Control
                      type="number"
                      value={newDeviceResolutionHeight}
                      onChange={(e) => { setNewDeviceResolutionHeight(e.target.value); if (newDeviceResolutionError) setNewDeviceResolutionError(''); }}
                      onBlur={() => setNewDeviceResolutionError(validateResolution(newDeviceOrientation, newDeviceResolutionWidth, newDeviceResolutionHeight))}
                      min="480"
                      max="4320"
                    />
                    <InputGroup.Text>px</InputGroup.Text>
                  </InputGroup>
                </Col>
              </Row>
              {newDeviceOrientation === 'both' && (
                <Form.Text className="text-muted d-block mt-2">
                  <strong>Note:</strong> If both orientations are possible, enter the resolution for landscape mode.
                </Form.Text>
              )}
              {newDeviceResolutionError && (
                <Form.Text className="text-danger d-block mt-2">{newDeviceResolutionError}</Form.Text>
              )}
              <Form.Text className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Example: 1920×1080
              </Form.Text>

            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleResetAddModal}>
            Reset
          </Button>
          <Button variant="primary" onClick={handleAddDevice} disabled={!!newDeviceNameError || !newDeviceName.trim() || !!newDeviceResolutionError}>
            Submit
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Device Configuration Modal */}
      <Modal show={showConfigModal} onHide={() => setShowConfigModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-gear me-2"></i>
            Configure Device
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            Configuring: <strong>{configDevice?.name}</strong>
          </Alert>

          <Form>
            {/* Device Name */}
            <Form.Group className="mb-3">
              <Form.Label>Device Name *</Form.Label>
              <Form.Control
                type="text"
                value={configName}
                onChange={(e) => { setConfigName(e.target.value); if (configNameError) setConfigNameError(''); }}
                onBlur={() => {
                  const n = configName.trim();
                  if (!n) setConfigNameError('Please enter device name');
                  else if (isDuplicateActiveDeviceName(n, configDevice?.id)) setConfigNameError('Multiple active Device Types cannot exist with same name');
                  else setConfigNameError('');
                }}
                placeholder="e.g., Store LA-01 Display"
                isInvalid={!!configNameError}
              />
              <Form.Control.Feedback type="invalid">{configNameError}</Form.Control.Feedback>
            </Form.Group>
            {/* MAC Address */}
            <Form.Group className="mb-3">
              <Form.Label>MAC Address *</Form.Label>
              <Form.Control
                type="text"
                placeholder="00:00:00:00:00:00"
                value={configMacAddress}
                maxLength={17}
                onChange={e => {
                  let value = e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
                  value = value.slice(0, 12); // Limit to 12 hex digits
                  value = value.match(/.{1,2}/g)?.join(':') || '';
                  setConfigMacAddress(value);
                }}
                isInvalid={!!configMacAddress && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(configMacAddress)}
              />
              <Form.Control.Feedback type="invalid">
                Please enter a valid MAC address (e.g., 00:1A:2B:3C:4D:5E)
              </Form.Control.Feedback>
            </Form.Group>

            {/* Orientation */}
            <Form.Group className="mb-3">
              <Form.Label>Screen Orientation *</Form.Label>
              <div>
                {configOrientation === 'both' && (
                  <Form.Text className="text-muted d-block mt-2">
                    If both orientations are possible, enter the resolution for landscape mode.
                  </Form.Text>
                )}
                <Form.Check
                  type="radio"
                  id="config-orientation-both"
                  label={
                    <>
                      <i className="bi bi-arrows-angle-expand me-2"></i>
                      Both
                    </>
                  }
                  value="both"
                  checked={configOrientation === 'both'}
                  onChange={(e) => handleOrientationChange(e.target.value)}
                />
                <Form.Check
                  type="radio"
                  id="config-orientation-horizontal"
                  label={
                    <>
                      <i className="bi bi-phone-landscape me-2"></i>
                      Horizontal (Landscape)
                    </>
                  }
                  value="horizontal"
                  checked={configOrientation === 'horizontal'}
                  onChange={(e) => handleOrientationChange(e.target.value)}
                />
                <Form.Check
                  type="radio"
                  id="config-orientation-vertical"
                  label={
                    <>
                      <i className="bi bi-phone me-2"></i>
                      Vertical (Portrait)
                    </>
                  }
                  value="vertical"
                  checked={configOrientation === 'vertical'}
                  onChange={(e) => handleOrientationChange(e.target.value)}
                />
              </div>
            </Form.Group>

            {/* Display Resolution */}
            <Form.Group className="mb-3">
              <Form.Label>Display Resolution (pixels) *</Form.Label>
              <Row>
                <Col md={5}>
                  <InputGroup>
                    <InputGroup.Text>Width</InputGroup.Text>
                    <Form.Control
                      type="number"
                      value={configResolutionWidth}
                      onChange={(e) => { handleResolutionChange('width', e.target.value); if (configResolutionError) setConfigResolutionError(''); }}
                      onBlur={() => setConfigResolutionError(validateResolution(configOrientation, configResolutionWidth, configResolutionHeight))}
                      min="640"
                      max="7680"
                    />
                    <InputGroup.Text>px</InputGroup.Text>
                  </InputGroup>
                </Col>
                <Col md={2} className="text-center">
                  <div className="pt-2">×</div>
                </Col>
                <Col md={5}>
                  <InputGroup>
                    <InputGroup.Text>Height</InputGroup.Text>
                    <Form.Control
                      type="number"
                      value={configResolutionHeight}
                      onChange={(e) => { handleResolutionChange('height', e.target.value); if (configResolutionError) setConfigResolutionError(''); }}
                      onBlur={() => setConfigResolutionError(validateResolution(configOrientation, configResolutionWidth, configResolutionHeight))}
                      min="480"
                      max="4320"
                    />
                    <InputGroup.Text>px</InputGroup.Text>
                  </InputGroup>
                </Col>
              </Row>
              <Form.Text className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Resolution automatically swaps when changing orientation
              </Form.Text>
              {configResolutionError && (
                <Form.Text className="text-danger d-block mt-2">{configResolutionError}</Form.Text>
              )}
            </Form.Group>

            {/* Common Resolutions */}
            <Form.Group className="mb-3">
              <Form.Label>Common Resolutions</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setConfigResolutionWidth('1920');
                    setConfigResolutionHeight('1080');
                  }}
                >
                  1920×1080 (Full HD)
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setConfigResolutionWidth('1440');
                    setConfigResolutionHeight('900');
                  }}
                >
                  1440×900
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setConfigResolutionWidth('3840');
                    setConfigResolutionHeight('2160');
                  }}
                >
                  3840×2160 (4K)
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setConfigResolutionWidth('1080');
                    setNewDeviceResolutionHeight('1920');
                  }}
                >
                  1080×1920 (Portrait)
                </Button>
              </div>
            </Form.Group>

            {/* Preview */}
            <Alert variant="secondary">
              <strong>Current Configuration:</strong>
              <div className="mt-2">
                <div><i className="bi bi-display me-2"></i>Name: {configName}</div>
                <div><i className="bi bi-aspect-ratio me-2"></i>Resolution: {configResolutionWidth} × {configResolutionHeight}</div>
                <div><i className="bi bi-arrows-angle-expand me-2"></i>Orientation: {configOrientation === 'both' ? 'Both' : configOrientation}</div>
              </div>
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfigModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveConfiguration} disabled={!!configNameError || !configName.trim() || !!configResolutionError}>
            <i className="bi bi-check-circle me-2"></i>
            Save Configuration
          </Button>
        </Modal.Footer>
      </Modal>




      {/* Edit Store Modal removed */}
      {/* Save Changes button for Assign tab (inline form) */}
      {activeTab === 'assign' && activeSubTab === 'assign' && selectedStoreForAssignment && assignTabEditMode && (
        <div className="d-flex justify-content-end mb-3">
          <Button variant="success" onClick={handleAssignTabSaveChanges}>
            <i className="bi bi-save me-2"></i>Save Changes
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
            <p className="mt-3 mb-0">Are you sure you want to delete device:</p>
            <p className="fw-bold">{deleteDeviceState?.name}</p>
            <p className="text-muted">This action cannot be undone.</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteDevice}>
            <i className="bi bi-trash me-2"></i>
            Delete Device
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Custom Tooltip Styles */}
      <style>
        {`
          .device-management {
            padding: 20px;
          }
          
          .device-card {
            transition: all 0.3s ease;
          }
          
          .device-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          }
          
          .pairing-code-display {
            font-size: 1.5rem;
            font-weight: bold;
            letter-spacing: 0.2rem;
            color: #0d6efd;
            font-family: 'Courier New', monospace;
          }
          
          .url-input {
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
          }
          
          .qr-code-container {
            padding: 20px;
            background: white;
            border-radius: 10px;
            display: inline-block;
          }
          
          .custom-tooltip.bs-tooltip-top .tooltip-inner,
          .custom-tooltip.bs-tooltip-bottom .tooltip-inner,
          .custom-tooltip.bs-tooltip-left .tooltip-inner,
          .custom-tooltip.bs-tooltip-right .tooltip-inner {
            background-color: #f8f9fa !important;
            color: #212529 !important;
            border: 1px solid #dee2e6 !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            font-size: 0.95rem;
          }
        `}
      </style>
      {/* Disable Warning Modal */}
      <Modal show={showDisableWarning} onHide={() => setShowDisableWarning(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cannot Disable Device</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '2.5rem' }}></i>
            <p className="mt-3 mb-0">Devices of this type are associated at stores, please de-activate such associations to de-activate the device type</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDisableWarning(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Disable Confirm Modal */}
      <Modal show={showDisableConfirm} onHide={() => setShowDisableConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Disable Device</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '2.5rem' }}></i>
            <p className="mt-3 mb-0">Do you confirm to de-activate the device?</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDisableConfirm(false)}>
            Go Back
          </Button>
          <Button variant="danger" onClick={confirmDisableDevice}>
            Proceed
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
export default DeviceManagement;