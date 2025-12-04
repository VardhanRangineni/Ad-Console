import { getAllAssignments, addAssignment, deleteAssignment, bulkAddAssignments } from '../../services/deviceIndexeddb';
// src/pages/DeviceManagement/DeviceManagement.jsx - ENHANCED CONFIGURATOR

import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Row, Col, Button, Form, InputGroup, Modal, Badge, Alert, Tabs, Tab, OverlayTrigger, Tooltip } from 'react-bootstrap';
import AsyncSelect from 'react-select/async';
import * as XLSX from 'xlsx';
// import { useApp } from '../../context/AppContext';
import { storeList } from '../../data/storeList';
// import { getAllContent } from '../../services/indexeddb';
import { getAllDevices, addDevice, updateDevice, deleteDeviceById } from '../../services/deviceIndexeddb';

function DeviceManagement() {
  const location = useLocation();
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
  const [showInlineAssignForm, setShowInlineAssignForm] = React.useState(true);
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

  // Download template for device assignments (fixes missing function error)
  const handleDownloadTemplate = () => {
    // Updated template header to match new expected upload columns
    const csvContent = 'Store ID,Device Type ID,Device MAC Address,POS MAC Address,Orientation\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'device_assignment_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fileInputRef = useRef(null);
  const [selectedStoreForAssignment, setSelectedStoreForAssignment] = React.useState(null);
  const [devicesForSelectedStore, setDevicesForSelectedStore] = React.useState([]);
  const [deviceToAssign, setDeviceToAssign] = React.useState(null);
  const [macAddressToAssign, setMacAddressToAssign] = React.useState('');
  const [posMacToAssign, setPosMacToAssign] = React.useState('');
  const [orientationToAssign, setOrientationToAssign] = React.useState('');

  // MAC address validation helper (must be after macAddressToAssign is declared)
  const isValidMac = macAddressToAssign && /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(macAddressToAssign);
  const isValidPosMac = !posMacToAssign || /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(posMacToAssign);
  const [storeDeviceMap, setStoreDeviceMap] = React.useState([]);
  const [assignments, setAssignments] = React.useState([]); // NEW STATE for assignments
  const [activeSubTab, setActiveSubTab] = React.useState('assign');

  // ...removed Edit Store Modal state...

  // Autocomplete for manual store IDs


  // Inline assign form edit state for Assign tab
  const [assignTabEditMode, setAssignTabEditMode] = React.useState(false);
  // Track staged changes for Assign tab (deactivate toggles)
  const [assignTabAssignments, setAssignTabAssignments] = React.useState([]);
  // When true, the user is editing a specific store from the List View edit button
  const [isEditFromListView, setIsEditFromListView] = React.useState(false);

  // Hierarchical store selection state (using storeList from PDF)

  // Helper functions to get unique options from storeList

  // Validate manual store IDs (must match a store in storeList)

  // Context and device lists must come first
  const [devices, setDevices] = React.useState([]);

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
          posMacAddress: assignment.posMacAddress || deviceModel.posMacAddress || '',
          orientation: assignment.orientation || deviceModel.orientation,
          active: assignment.active !== false // Default to true
        });
      }
      return acc;
    }, {});
    setStoreDeviceMap(Object.values(groupedByStore));
  }, [assignments, devices]);
  // List View column-wise filter state
  const [listViewStoreIdFilter, setListViewStoreIdFilter] = React.useState('');
  const [listViewStoreNameFilter, setListViewStoreNameFilter] = React.useState('');
  const [listViewCityFilter, setListViewCityFilter] = React.useState('');
  const [listViewStateFilter, setListViewStateFilter] = React.useState('');

  // Read query params and set the initial sub tab and filter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const stateParam = params.get('state');
    if (tab === 'listView') {
      setActiveSubTab('listView');
      setActiveTab('assign');
    }
    if (stateParam) {
      setListViewStateFilter(decodeURIComponent(stateParam));
      // When filtering by state we want the List View open
      setActiveSubTab('listView');
      setActiveTab('assign');
    }
  }, [location.search]);

  useEffect(() => {
    if (selectedStoreForAssignment) {
      const storeData = storeDeviceMap.find(s => s.id === selectedStoreForAssignment.value);
      setDevicesForSelectedStore(storeData ? storeData.devices : []);
      // When a store is selected, initialize assignTabAssignments for editing
      setAssignTabAssignments(storeData ? storeData.devices.map(d => ({ ...d })) : []);
      setAssignTabEditMode(false);
    } else {
      setDevicesForSelectedStore([]);
      setAssignTabAssignments([]);
      setAssignTabEditMode(false);
    }
  }, [selectedStoreForAssignment, storeDeviceMap]);

  useEffect(() => {
    if (deviceToAssign) {
      const device = devices.find(d => d.id === deviceToAssign);
      if (device && device.orientation !== 'both') {
        setOrientationToAssign(device.orientation);
      } else {
        setOrientationToAssign(''); // Reset if it's 'both' so user has to choose
      }
    }
  }, [deviceToAssign, devices]);

  // ...existing hooks...
  const [activeTab, setActiveTab] = React.useState('configurator');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showConfigModal, setShowConfigModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [newDeviceName, setNewDeviceName] = React.useState('');
  const [newDeviceOrientation, setNewDeviceOrientation] = React.useState('both');
  const [newDeviceResolutionWidth, setNewDeviceResolutionWidth] = React.useState('1920');
  const [newDeviceResolutionHeight, setNewDeviceResolutionHeight] = React.useState('1080');
  const [isClone, setIsClone] = React.useState(false);
  const [configDevice, setConfigDevice] = React.useState(null);
  const [configName, setConfigName] = React.useState('');
  const [configOrientation, setConfigOrientation] = React.useState('both');
  const [configResolutionWidth, setConfigResolutionWidth] = React.useState('1920');
  const [configResolutionHeight, setConfigResolutionHeight] = React.useState('1080');
  const [deleteDeviceState, setDeleteDeviceState] = React.useState(null);
  // Modal for disable warning and confirmation
  const [showDisableWarning, setShowDisableWarning] = React.useState(false);
  const [disableWarningStores] = React.useState([]);
  const [showDisableConfirm, setShowDisableConfirm] = React.useState(false);
  const [pendingDisableDeviceId, setPendingDisableDeviceId] = React.useState(null);
  // Track disabled devices (array of device IDs)
  // Error Modal State
  const [showErrorModal, setShowErrorModal] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const [disabledDevices, setDisabledDevices] = React.useState(() => {
    const saved = localStorage.getItem('disabledDevices');
    return saved ? JSON.parse(saved) : [];
  });


  const confirmDisableDevice = () => {
    if (pendingDisableDeviceId) {
      const updated = [...disabledDevices, pendingDisableDeviceId];
      setDisabledDevices(updated);
      localStorage.setItem('disabledDevices', JSON.stringify(updated));
      // Persist active state in IndexedDB
      (async () => {
        try {
          const deviceObj = (await getAllDevices()).find(d => d.id === pendingDisableDeviceId);
          if (deviceObj) {
            await updateDevice({ ...deviceObj, active: false });
            const all = await getAllDevices();
            // If the component has setDevices, update local state. Try to setDevices if available.
            // Some pages share devices via context; attempt to set if variable exists in scope
            if (typeof setDevices === 'function') setDevices(all);
          }
        } catch (err) {
          console.error('Error disabling device in DB', err);
        }
      })();
    }
    setShowDisableConfirm(false);
    setPendingDisableDeviceId(null);
  };

  const storeOptions = useMemo(() => storeList.map(store => ({
    value: store.id,
    label: `${store.name} (${store.id})`
  })), []);

  // Async load options for better performance
  const loadStoreOptions = (inputValue, callback) => {
    const filtered = storeOptions.filter(option =>
      option.label.toLowerCase().includes(inputValue.toLowerCase())
    );
    setTimeout(() => callback(filtered), 100); // debounce for smoother UX
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

  // Add Device handler
  const handleAddDevice = async () => {
    if (!newDeviceName.trim()) {
      alert('Please enter device name');
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
  };

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

  const handleResolutionChange = (dimension, value) => {
    if (dimension === 'width') {
      setConfigResolutionWidth(value);
    } else {
      setConfigResolutionHeight(value);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!configName.trim()) {
      alert('Please enter device name');
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
    };
    await updateDevice(updatedDevice);
    const all = await getAllDevices();
    setDevices(all);
    setShowConfigModal(false);
    setConfigDevice(null);
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

  const handleAssignNewDevice = async () => {
    if (!selectedStoreForAssignment || !deviceToAssign || !macAddressToAssign || !orientationToAssign) {
      setErrorMessage('Please fill all fields.');
      setShowErrorModal(true);
      return;
    }
    if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(macAddressToAssign)) {
      setErrorMessage('Please enter a valid MAC address (e.g., 00:1A:2B:3C:4D:5E)');
      setShowErrorModal(true);
      return;
    }
    if (posMacToAssign && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(posMacToAssign)) {
      setErrorMessage('Please enter a valid POS MAC address (or leave empty).');
      setShowErrorModal(true);
      return;
    }

    // Validation: Check if Device Type + MAC Address combination already exists
    const existingDeviceAssignment = assignments.find(a =>
      a.deviceId === deviceToAssign &&
      a.macAddress.toLowerCase() === macAddressToAssign.toLowerCase()
    );

    if (existingDeviceAssignment) {
      setErrorMessage(`Device and MAC address combination already assigned for store ${existingDeviceAssignment.storeId}`);
      setShowErrorModal(true);
      return;
    }

    // Validation: Check if POS MAC Address already exists
    if (posMacToAssign) {
      const existingPosAssignment = assignments.find(a =>
        a.posMacAddress &&
        a.posMacAddress.toLowerCase() === posMacToAssign.toLowerCase()
      );

      if (existingPosAssignment) {
        setErrorMessage(`POS MAC address already assigned with a device in store ${existingPosAssignment.storeId}`);
        setShowErrorModal(true);
        return;
      }
    }

    const findStore = storeList.find(s => s.id === selectedStoreForAssignment.value);
    const newAssignment = {
      assignmentId: `${Date.now()}-new`,
      deviceId: deviceToAssign,
      storeId: selectedStoreForAssignment.value,
      state: findStore && findStore.state ? findStore.state : undefined,
      locationName: findStore && findStore.name ? findStore.name : undefined,
      macAddress: macAddressToAssign,
      posMacAddress: posMacToAssign || '',
      orientation: orientationToAssign,
      active: true,
    };
    await addAssignment(newAssignment);
    const allAssignments = await getAllAssignments();
    setAssignments(allAssignments);
    // Reset form
    setDeviceToAssign(null);
    setMacAddressToAssign('');
    setPosMacToAssign('');
    setOrientationToAssign('');
  };

  const handleDeleteStore = async (storeId) => {
    if (window.confirm(`Are you sure you want to delete all assignments for store ${storeId}?`)) {
      const allAssignments = await getAllAssignments();
      const toDelete = allAssignments.filter(a => a.storeId === storeId);
      for (const a of toDelete) {
        await deleteAssignment(a.assignmentId);
      }
      const updatedAssignments = await getAllAssignments();
      setAssignments(updatedAssignments);
    }
  };



  const handleDownload = () => {
    const dataToExport = [];
    storeDeviceMap.forEach(store => {
      if (store.devices && store.devices.length > 0) {
        store.devices.forEach(device => {
          dataToExport.push({
            'Store ID': store.id,
            'Store Name': store.name,
            'City': store.area,
            'State': store.state,
            'Device': device.name,
            'DeviceID': device.id,
            'MAC Address': device.macAddress,
            'POS MAC': device.posMacAddress || '',
            'Status': device.active ? 'Online' : 'Offline',
            'Orientation': device.orientation === 'both' ? 'Both' : device.orientation === 'horizontal' ? 'Landscape' : device.orientation === 'vertical' ? 'Portrait' : (device.orientation || 'N/A'),
          });
        });
      }
    });

    // Create worksheet and add bold headers
    const headers = [
      'Store ID', 'Store Name', 'City', 'State', 'Device Type', 'Device Type ID', 'MAC Address', 'POS MAC', 'Status', 'Orientation'
    ];
    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
    XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A2', skipHeader: true });
    // Bold header row
    headers.forEach((header, idx) => {
      const cell = worksheet[String.fromCharCode(65 + idx) + '1'];
      if (cell && !cell.s) cell.s = {};
      if (cell) cell.s = { ...cell.s, font: { bold: true } };
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Device Assignments');
    XLSX.writeFile(workbook, 'device-assignments.xlsx');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      const newAssignments = json.map((row, index) => {
        const storeId = row['Store ID'] ? String(row['Store ID']).trim() : '';
        const deviceIdFromRow = row['Device Type ID'] ? String(row['Device Type ID']).trim() : (row['DeviceID'] ? String(row['DeviceID']).trim() : '');
        const deviceNameFromRow = row['Device'] ? String(row['Device']).trim() : '';
        const macAddress = (row['Device MAC Address'] || row['Device MAC'] || row['MAC Address'] || row['MAC']) ? String(row['Device MAC Address'] || row['Device MAC'] || row['MAC Address'] || row['MAC']).trim() : '';
        const posMac = (row['POS MAC Address'] || row['POS MAC'] || row['POS Mac Adress'] || row['POS Mac Address']) ? String(row['POS MAC Address'] || row['POS MAC'] || row['POS Mac Adress'] || row['POS Mac Address']).trim() : '';
        let orientation = row['Orientation'] ? String(row['Orientation']).trim().toLowerCase() : '';

        // Map user-friendly terms to internal values
        if (orientation === 'landscape') orientation = 'horizontal';
        if (orientation === 'portrait') orientation = 'vertical';

        if (!storeId || !macAddress || (!deviceIdFromRow && !deviceNameFromRow)) {
          return null;
        }

        let device = null;
        if (deviceIdFromRow) {
          device = devices.find(d => String(d.id) === deviceIdFromRow);
        }
        if (!device && deviceNameFromRow) {
          device = devices.find(d => d.name === deviceNameFromRow);
        }
        // Acceptable values: 'horizontal', 'vertical', 'both', or fallback to device.orientation
        let normalizedOrientation = orientation;
        if (!['horizontal', 'vertical', 'both'].includes(normalizedOrientation)) {
          normalizedOrientation = device ? device.orientation : '';
        }
        return {
          assignmentId: `${Date.now()}-${index}`,
          deviceId: device ? device.id : null,
          storeId: storeId,
          macAddress: macAddress,
          posMacAddress: posMac || '',
          orientation: normalizedOrientation,
          active: true,
          originalRow: row, // Keep track for error reporting
        };
      });

      const validAssignments = newAssignments.filter(a => a && a.deviceId);
      const invalidAssignments = newAssignments.filter(a => a && !a.deviceId);

      if (invalidAssignments.length > 0) {
        const invalidDevices = invalidAssignments.map(a => (a.originalRow['Device'] || a.originalRow['Device Type ID'] || a.originalRow['DeviceID'] || JSON.stringify(a.originalRow))).join(', ');
        alert(`The following devices could not be found and were not assigned: ${invalidDevices}`);
      }

      const assignmentsToSave = validAssignments.map(({ originalRow, ...rest }) => rest);

      await bulkAddAssignments(assignmentsToSave);
      const allAssignments = await getAllAssignments();
      setAssignments(allAssignments);

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
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
      posMacAddress: d.posMacAddress || '',
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
    setIsEditFromListView(false);
  };

  // List View Edit button handler: go to Assign tab, select store, open assign form in edit mode
  const handleListViewEdit = (store) => {
    setActiveSubTab('assign');
    setActiveTab('assign');
    setSelectedStoreForAssignment({ value: store.id, label: `${store.name} (${store.id})` });
    setShowInlineAssignForm(true);
    setAssignTabEditMode(true);
    setIsEditFromListView(true);
  };

  return (
    <div className="device-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        {/* Error Modal */}
        <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)} centered>
          <Modal.Header closeButton className="bg-danger text-white">
            <Modal.Title><i className="bi bi-exclamation-triangle-fill me-2"></i>Error</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center py-4">
            <p className="lead mb-0">{errorMessage}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowErrorModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
        <h4>
          <i className="bi bi-hdd-network me-2"></i>
          Store Device Mapping
        </h4>
      </div>

      {/* SUB-TABS SECTION (Assign/List View) */}
      <Tabs
        id="device-store-mapping-sub-tabs"
        activeKey={activeSubTab}
        onSelect={(k) => setActiveSubTab(k)}
        className="mb-3"
      >
        <Tab eventKey="assign" title="Assign">
          <div className="d-flex justify-content-end align-items-center mb-3">
            <Button variant="outline-secondary" className="me-2" onClick={handleDownloadTemplate}>
              <i className="bi bi-file-earmark-arrow-down me-2"></i>
              Download Template
            </Button>
            <Button variant="info" className="me-2" onClick={() => fileInputRef.current.click()}>
              <i className="bi bi-upload me-2"></i>
              Upload Assignments
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              accept=".xlsx, .xls"
            />
          </div>
          <Row>
            <Col md={7} style={{ width: '60%' }} className="d-flex align-items-end">
              <Form.Group className="mb-3 flex-grow-1 me-2">
                <Form.Label>Search for a Store by Id or Name</Form.Label>
                <div style={{ position: 'relative' }}>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions={storeOptions.slice(0, 30)}
                    loadOptions={loadStoreOptions}
                    isClearable
                    placeholder="Type to search..."
                    value={selectedStoreForAssignment}
                    onChange={(selected) => {
                      setSelectedStoreForAssignment(selected);
                      setDeviceToAssign(null);
                      setMacAddressToAssign('');
                      setPosMacToAssign('');
                      setOrientationToAssign('');
                      // If user manually changes selection then they are not editing a specific store from List View
                      setIsEditFromListView(false);
                    }}
                    isDisabled={isEditFromListView}
                  />
                  {isEditFromListView && (
                    <span className="badge bg-secondary ms-2" style={{ position: 'absolute', right: -10, top: -8 }}>Editing Store</span>
                  )}
                </div>
              </Form.Group>
            </Col>
          </Row>

          {selectedStoreForAssignment && (
            <>
              {devicesForSelectedStore.length > 0 ? (
                <div className="mt-4">
                  {showInlineAssignForm && (
                    <>
                      <br></br>
                      <h5>Assign Device</h5>
                      <Row className="align-items-end mb-4">
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Select Device Type</Form.Label>
                            <Form.Select
                              value={deviceToAssign || ''}
                              onChange={e => setDeviceToAssign(e.target.value)}
                            >
                              <option value="">-- Select Device Type --</option>
                              {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label>MAC Address</Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="00:00:00:00:00:00"
                              value={macAddressToAssign}
                              maxLength={17}
                              onChange={e => {
                                let value = e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
                                value = value.slice(0, 12); // Limit to 12 hex digits
                                value = value.match(/.{1,2}/g)?.join(':') || '';
                                setMacAddressToAssign(value);
                              }}
                              isInvalid={!!macAddressToAssign && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(macAddressToAssign)}
                            />
                            <Form.Control.Feedback type="invalid">
                              Please enter a valid MAC address (e.g., 00:1A:2B:3C:4D:5E)
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label>POS MAC Address <small className="text-muted">(optional)</small></Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="00:00:00:00:00:00"
                              value={posMacToAssign}
                              maxLength={17}
                              onChange={e => {
                                let value = e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
                                value = value.slice(0, 12);
                                value = value.match(/.{1,2}/g)?.join(':') || '';
                                setPosMacToAssign(value);
                              }}
                              isInvalid={!!posMacToAssign && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(posMacToAssign)}
                            />
                            <Form.Control.Feedback type="invalid">
                              Please enter a valid POS MAC address (e.g., 00:1A:2B:3C:4D:5E)
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        {deviceToAssign && (() => {
                          const selectedDeviceForAssignment = devices.find(d => d.id === deviceToAssign);
                          if (!selectedDeviceForAssignment) return null;
                          return (
                            <Col md={3}>
                              <Form.Group>
                                <Form.Label>Orientation</Form.Label>
                                <div>
                                  {selectedDeviceForAssignment.orientation === 'both' ? (
                                    <>
                                      <Form.Check
                                        inline
                                        type="radio"
                                        id={`orientation-horizontal-${selectedDeviceForAssignment.id}`}
                                        label={<label htmlFor={`orientation-horizontal-${selectedDeviceForAssignment.id}`} style={{ cursor: 'pointer', marginBottom: 0 }}>Landscape</label>}
                                        name={`orientation-${selectedDeviceForAssignment.id}`}
                                        value="horizontal"
                                        checked={orientationToAssign === 'horizontal'}
                                        onChange={e => setOrientationToAssign(e.target.value)}
                                      />
                                      <Form.Check
                                        inline
                                        type="radio"
                                        id={`orientation-vertical-${selectedDeviceForAssignment.id}`}
                                        label={<label htmlFor={`orientation-vertical-${selectedDeviceForAssignment.id}`} style={{ cursor: 'pointer', marginBottom: 0 }}>Portrait</label>}
                                        name={`orientation-${selectedDeviceForAssignment.id}`}
                                        value="vertical"
                                        checked={orientationToAssign === 'vertical'}
                                        onChange={e => setOrientationToAssign(e.target.value)}
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <Form.Check
                                        inline
                                        type="radio"
                                        id={`orientation-only-${selectedDeviceForAssignment.id}`}
                                        label={selectedDeviceForAssignment.orientation === 'horizontal' ? 'Landscape' : 'Portrait'}
                                        checked
                                        disabled
                                      />                                            </>
                                  )}
                                </div>
                              </Form.Group>
                            </Col>
                          );
                        })()}
                        <Col md={2}>
                          <Button
                            variant="primary"
                            onClick={handleAssignNewDevice}
                            disabled={!deviceToAssign || !macAddressToAssign || !orientationToAssign || !isValidMac || !isValidPosMac}
                          >
                            Assign Device
                          </Button>
                        </Col>
                      </Row>
                    </>
                  )}
                  <h5>Assigned Devices</h5>
                  <div className="table-responsive mb-4">
                    <table className="table table-bordered align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Device Type</th>
                          <th>Device Type ID</th>
                          <th>MAC Address</th>
                          <th>POS MAC</th>
                          <th>Orientation</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignTabAssignments.map(device => (
                          <tr key={device.assignmentId}>
                            <td>{device.name}</td>
                            <td>{device.id}</td>
                            <td>{device.macAddress}</td>
                            <td>{device.posMacAddress || <span className="text-muted">-</span>}</td>
                            <td>
                              <div className="d-flex gap-2 align-items-center">
                                {assignTabEditMode && device.orientation === 'both' ? (
                                  <>
                                    <Form.Check
                                      inline
                                      type="radio"
                                      id={`assign-orientation-horizontal-${device.assignmentId}`}
                                      name={`assign-orientation-${device.assignmentId}`}
                                      value="horizontal"
                                      label="Landscape"
                                      checked={device.orientation === 'horizontal'}
                                      onChange={() => setAssignTabAssignments(prev => prev.map(d => d.assignmentId === device.assignmentId ? { ...d, orientation: 'horizontal' } : d))}
                                    />
                                    <Form.Check
                                      inline
                                      type="radio"
                                      id={`assign-orientation-vertical-${device.assignmentId}`}
                                      name={`assign-orientation-${device.assignmentId}`}
                                      value="vertical"
                                      label="Portrait"
                                      checked={device.orientation === 'vertical'}
                                      onChange={() => setAssignTabAssignments(prev => prev.map(d => d.assignmentId === device.assignmentId ? { ...d, orientation: 'vertical' } : d))}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <span className="text-muted small">{device.orientation === 'both' ? 'Both' : (device.orientation === 'horizontal' ? 'Landscape' : (device.orientation === 'vertical' ? 'Portrait' : 'N/A'))}</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td>
                              <Badge bg={device.active ? 'success' : 'danger'}>
                                {device.active ? 'Online' : 'Offline'}
                              </Badge>
                            </td>
                            <td className="d-flex gap-2 align-items-center">
                              <Form.Check
                                type="switch"
                                id={`switch-assign-${device.assignmentId}`}
                                checked={device.active}
                                onChange={() => {
                                  setAssignTabAssignments(prev => prev.map(d =>
                                    d.assignmentId === device.assignmentId ? { ...d, active: !d.active } : d
                                  ));
                                }}
                                label={device.active ? 'Online' : 'Offline'}
                              />
                              <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip id={`tooltip-delete-assign-${device.assignmentId}`}>Delete</Tooltip>}
                              >
                                <Button variant="outline-danger" size="sm" onClick={() => {
                                  setAssignTabAssignments(prev => prev.filter(d => d.assignmentId !== device.assignmentId));
                                }}>
                                  <i className="bi bi-trash"></i>
                                </Button>
                              </OverlayTrigger>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="d-flex justify-content-end mt-3">
                      <Button variant="primary" onClick={handleAssignTabSaveChanges}>
                        <i className="bi bi-save me-2"></i>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <h5>Assign a New Device to {selectedStoreForAssignment.label}</h5>
                  <Row className="align-items-end">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Select Device Type</Form.Label>
                        <Form.Select
                          value={deviceToAssign || ''}
                          onChange={e => setDeviceToAssign(e.target.value)}
                        >
                          <option value="">-- Select Device --</option>
                          {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>MAC Address</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="00:00:00:00:00:00"
                          value={macAddressToAssign}
                          maxLength={17}
                          onChange={e => {
                            let value = e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
                            value = value.slice(0, 12); // Limit to 12 hex digits
                            value = value.match(/.{1,2}/g)?.join(':') || '';
                            setMacAddressToAssign(value);
                          }}
                          isInvalid={!!macAddressToAssign && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(macAddressToAssign)}
                        />
                        <Form.Control.Feedback type="invalid">
                          Please enter a valid MAC address (e.g., 00:1A:2B:3C:4D:5E)
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>POS MAC Address <small className="text-muted">(optional)</small></Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="00:00:00:00:00:00"
                          value={posMacToAssign}
                          maxLength={17}
                          onChange={e => {
                            let value = e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
                            value = value.slice(0, 12);
                            value = value.match(/.{1,2}/g)?.join(':') || '';
                            setPosMacToAssign(value);
                          }}
                          isInvalid={!!posMacToAssign && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(posMacToAssign)}
                        />
                        <Form.Control.Feedback type="invalid">
                          Please enter a valid POS MAC address (e.g., 00:1A:2B:3C:4D:5E)
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    {deviceToAssign && (() => {
                      const selectedDeviceForAssignment = devices.find(d => d.id === deviceToAssign);
                      if (!selectedDeviceForAssignment) return null;
                      return (
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label>Orientation</Form.Label>
                            <div>
                              {selectedDeviceForAssignment.orientation === 'both' ? (
                                <>
                                  <Form.Check
                                    inline
                                    type="radio"
                                    id={`orientation-horizontal-${selectedDeviceForAssignment.id}`}
                                    label="Landscape"
                                    name={`orientation-${selectedDeviceForAssignment.id}`}
                                    value="horizontal"
                                    checked={orientationToAssign === 'horizontal'}
                                    onChange={e => setOrientationToAssign(e.target.value)}
                                  />
                                  <Form.Check
                                    inline
                                    type="radio"
                                    id={`orientation-vertical-${selectedDeviceForAssignment.id}`}
                                    label="Portrait"
                                    name={`orientation-${selectedDeviceForAssignment.id}`}
                                    value="vertical"
                                    checked={orientationToAssign === 'vertical'}
                                    onChange={e => setOrientationToAssign(e.target.value)}
                                  />
                                </>
                              ) : (
                                <Form.Check
                                  inline
                                  type="radio"
                                  id={`orientation-only-${selectedDeviceForAssignment.id}`}
                                  label={selectedDeviceForAssignment.orientation === 'horizontal' ? 'Landscape' : 'Portrait'}
                                  checked
                                  disabled
                                />
                              )}
                            </div>
                          </Form.Group>
                        </Col>
                      );
                    })()}
                    <Col md={2}>
                      <Button
                        variant="primary"
                        onClick={handleAssignNewDevice}
                        disabled={!deviceToAssign || !macAddressToAssign || !orientationToAssign || !isValidMac || !isValidPosMac}
                      >
                        Assign Device
                      </Button>
                    </Col>
                  </Row>
                  <h5 className="mt-4">Assigned Devices</h5>
                  <div className="table-responsive mb-4">
                    <table className="table table-bordered align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Device Type</th>
                          <th>Device Type ID</th>
                          <th>MAC Address</th>
                          <th>POS MAC</th>
                          <th>Orientation</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignTabAssignments.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center text-muted">No records found</td>
                          </tr>
                        ) : (
                          assignTabAssignments.map(device => (
                            <tr key={device.assignmentId}>
                              <td>{device.name}</td>
                              <td>{device.id}</td>
                              <td>{device.macAddress}</td>
                              <td>{device.posMacAddress || <span className="text-muted">-</span>}</td>
                              <td>
                                <div className="d-flex gap-2 align-items-center">
                                  {assignTabEditMode && device.orientation === 'both' ? (
                                    <>
                                      <Form.Check
                                        inline
                                        type="radio"
                                        id={`assign-orientation-horizontal-${device.assignmentId}`}
                                        name={`assign-orientation-${device.assignmentId}`}
                                        value="horizontal"
                                        label="Landscape"
                                        checked={device.orientation === 'horizontal'}
                                        onChange={() => setAssignTabAssignments(prev => prev.map(d => d.assignmentId === device.assignmentId ? { ...d, orientation: 'horizontal' } : d))}
                                      />
                                      <Form.Check
                                        inline
                                        type="radio"
                                        id={`assign-orientation-vertical-${device.assignmentId}`}
                                        name={`assign-orientation-${device.assignmentId}`}
                                        value="vertical"
                                        label="Portrait"
                                        checked={device.orientation === 'vertical'}
                                        onChange={() => setAssignTabAssignments(prev => prev.map(d => d.assignmentId === device.assignmentId ? { ...d, orientation: 'vertical' } : d))}
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-muted small">{device.orientation === 'both' ? 'Both' : (device.orientation === 'horizontal' ? 'Landscape' : (device.orientation === 'vertical' ? 'Portrait' : 'N/A'))}</span>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td>
                                <Badge bg={device.active ? 'success' : 'danger'}>
                                  {device.active ? 'Online' : 'Offline'}
                                </Badge>
                              </td>
                              <td className="d-flex gap-2 align-items-center">
                                <Form.Check
                                  type="switch"
                                  id={`switch-assign-${device.assignmentId}`}
                                  checked={device.active}
                                  onChange={() => {
                                    setAssignTabAssignments(prev => prev.map(d =>
                                      d.assignmentId === device.assignmentId ? { ...d, active: !d.active } : d
                                    ));
                                  }}
                                  label={device.active ? 'Online' : 'Offline'}
                                />
                                <OverlayTrigger
                                  placement="top"
                                  overlay={<Tooltip id={`tooltip-delete-assign-${device.assignmentId}`}>Delete</Tooltip>}
                                >
                                  <Button variant="outline-danger" size="sm" onClick={() => {
                                    setAssignTabAssignments(prev => prev.filter(d => d.assignmentId !== device.assignmentId));
                                  }}>
                                    <i className="bi bi-trash"></i>
                                  </Button>
                                </OverlayTrigger>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <div className="d-flex justify-content-end mt-3">
                      <Button variant="primary" onClick={handleAssignTabSaveChanges}>
                        <i className="bi bi-save me-2"></i>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </Tab>
        <Tab eventKey="listView" title="List View">
          <div className="d-flex justify-content-end align-items-center mb-3">
            <Button variant="success" className="me-2" onClick={handleDownload}>
              <i className="bi bi-download me-2"></i>
              Download
            </Button>
          </div>
          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th>
                    Store ID
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="Filter"
                      value={listViewStoreIdFilter}
                      onChange={e => setListViewStoreIdFilter(e.target.value)}
                      style={{ minWidth: 80, marginTop: 4 }}
                    />
                  </th>
                  <th>
                    Store Name
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="Filter"
                      value={listViewStoreNameFilter}
                      onChange={e => setListViewStoreNameFilter(e.target.value)}
                      style={{ minWidth: 120, marginTop: 4 }}
                    />
                  </th>
                  <th>
                    City
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="Filter"
                      value={listViewCityFilter}
                      onChange={e => setListViewCityFilter(e.target.value)}
                      style={{ minWidth: 100, marginTop: 4 }}
                    />
                  </th>
                  <th>
                    State
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="Filter"
                      value={listViewStateFilter}
                      onChange={e => setListViewStateFilter(e.target.value)}
                      style={{ minWidth: 100, marginTop: 4 }}
                    />
                  </th>
                  <th>Count of Devices</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = storeDeviceMap.filter(store => {
                    // All filters are case-insensitive substring match
                    const idMatch = listViewStoreIdFilter.trim() === '' || store.id.toLowerCase().includes(listViewStoreIdFilter.trim().toLowerCase());
                    const nameMatch = listViewStoreNameFilter.trim() === '' || (store.name && store.name.toLowerCase().includes(listViewStoreNameFilter.trim().toLowerCase()));
                    const cityMatch = listViewCityFilter.trim() === '' || (store.area && store.area.toLowerCase().includes(listViewCityFilter.trim().toLowerCase()));
                    const stateMatch = listViewStateFilter.trim() === '' || (store.state && store.state.toLowerCase().includes(listViewStateFilter.trim().toLowerCase()));
                    return idMatch && nameMatch && cityMatch && stateMatch;
                  });
                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="text-center text-muted">No records found</td>
                      </tr>
                    );
                  }
                  return filtered.map(store => (
                    <tr key={store.id}>
                      <td>{store.id}</td>
                      <td>{store.name}</td>
                      <td>{store.area}</td>
                      <td>{store.state}</td>
                      <td>{store.deviceCount}</td>
                      <td className="d-flex gap-2">
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip id={`tooltip-edit-${store.id}`}>Edit</Tooltip>}
                        >
                          <Button variant="outline-primary" size="sm" onClick={() => handleListViewEdit(store)}>
                            <i className="bi bi-pencil-square"></i>
                          </Button>
                        </OverlayTrigger>
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip id={`tooltip-delete-${store.id}`}>Delete</Tooltip>}
                        >
                          <Button variant="outline-danger" size="sm" onClick={() => handleDeleteStore(store.id)}>
                            <i className="bi bi-trash"></i>
                          </Button>
                        </OverlayTrigger>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </Tab>
      </Tabs>
      {/* End sub-tabs */}

      {/* Add Device Modal */}
      <Modal show={showAddModal} onHide={() => { setShowAddModal(false); setIsClone(false); }} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{isClone ? 'Clone Device' : 'Add New Device'}</Modal.Title>
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
                onChange={(e) => setNewDeviceName(e.target.value)}
              />
            </Form.Group>

            {/* Orientation */}
            <Form.Group className="mb-3">
              <Form.Label>Screen Orientation *</Form.Label>
              <div>
                <Form.Check
                  type="radio"
                  id="new-orientation-both"
                  label={
                    <>
                      <i className="bi bi-arrows-angle-expand me-2"></i>
                      Both (Recommended)
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
              <Form.Text className="text-muted">
                Resolution will auto-swap when changing orientation
              </Form.Text>
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
                      onChange={(e) => setNewDeviceResolutionWidth(e.target.value)}
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
                      onChange={(e) => setNewDeviceResolutionHeight(e.target.value)}
                      min="480"
                      max="4320"
                    />
                    <InputGroup.Text>px</InputGroup.Text>
                  </InputGroup>
                </Col>
              </Row>
              <Form.Text className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Example: 1920×1080 (Full HD)
              </Form.Text>
            </Form.Group>

            {/* Common Resolutions */}
            <Form.Group className="mb-3">
              <Form.Label>Common Resolutions</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setNewDeviceResolutionWidth('1920');
                    setNewDeviceResolutionHeight('1080');
                  }}
                >
                  1920×1080 (Full HD)
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setNewDeviceResolutionWidth('1440');
                    setNewDeviceResolutionHeight('900');
                  }}
                >
                  1440×900
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setNewDeviceResolutionWidth('3840');
                    setNewDeviceResolutionHeight('2160');
                  }}
                >
                  3840×2160 (4K)
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setNewDeviceResolutionWidth('1080');
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
                <div><i className="bi bi-display me-2"></i>Name: {newDeviceName}</div>
                <div><i className="bi bi-aspect-ratio me-2"></i>Resolution: {newDeviceResolutionWidth} × {newDeviceResolutionHeight}</div>
                <div><i className="bi bi-arrows-angle-expand me-2"></i>Orientation: {newDeviceOrientation === 'both' ? 'Both' : newDeviceOrientation}</div>
              </div>
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowAddModal(false); setIsClone(false); }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddDevice}>
            <i className="bi bi-plus-circle me-2"></i>
            {isClone ? 'Clone Device' : 'Add Device'}
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
            {/* Device Type */}
            <Form.Group className="mb-3">
              <Form.Label>Device Type *</Form.Label>
              <Form.Control
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="e.g., Store LA-01 Display"
              />
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
                <Form.Check
                  type="radio"
                  id="config-orientation-both"
                  label={
                    <>
                      <i className="bi bi-arrows-angle-expand me-2"></i>
                      Both (Recommended)
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
                      onChange={(e) => handleResolutionChange('width', e.target.value)}
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
                      onChange={(e) => handleResolutionChange('height', e.target.value)}
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
          <Button variant="primary" onClick={handleSaveConfiguration}>
            <i className="bi bi-check-circle me-2"></i>
            Save Configuration
          </Button>
        </Modal.Footer>
      </Modal>




      {/* Edit Store Modal removed */}
      {/* Save Changes button for Assign tab (inline form) */}
      {activeTab === 'assign' && activeSubTab === 'assign' && selectedStoreForAssignment && showInlineAssignForm && assignTabEditMode && (
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
            <p className="mt-3 mb-0">This device is assigned to the following store(s):</p>
            <ul className="list-unstyled fw-bold">
              {disableWarningStores.map((store, idx) => (
                <li key={idx}>{store}</li>
              ))}
            </ul>
            <p className="text-danger">You cannot disable a device that is assigned to a store.</p>
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
            <p className="mt-3 mb-0">Are you sure you want to disable this device?</p>
            <p className="text-danger">This action cannot be undone and you will not be able to enable it again.</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDisableConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDisableDevice}>
            Disable
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
export default DeviceManagement;