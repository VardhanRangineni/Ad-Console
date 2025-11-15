// src/pages/DeviceManagement/DeviceManagement.jsx - ENHANCED CONFIGURATOR

import React, { useEffect, useMemo, useRef } from 'react';
import { Row, Col, Button, Form, InputGroup, Modal, Badge, Alert, Tabs, Tab, OverlayTrigger, Tooltip } from 'react-bootstrap';
import AsyncSelect from 'react-select/async';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { storeList } from '../../data/storeList';

function DeviceManagement() {
    // MAC address for config modal
    const [configMacAddress, setConfigMacAddress] = React.useState('');
  // State to control showing the assign form inline
  const [showInlineAssignForm, setShowInlineAssignForm] = React.useState(true);

  // ...existing code...

  // Download template for device assignments (fixes missing function error)
  const handleDownloadTemplate = () => {
    const csvContent = 'Store ID,Device,MAC Address,State,City,Orientation\n';
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
  const [orientationToAssign, setOrientationToAssign] = React.useState('');

  // MAC address validation helper (must be after macAddressToAssign is declared)
  const isValidMac = macAddressToAssign && /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(macAddressToAssign);
  const [storeDeviceMap, setStoreDeviceMap] = React.useState([]);
  const [assignments, setAssignments] = React.useState([]); // NEW STATE for assignments
  const [activeSubTab, setActiveSubTab] = React.useState('assign');
  
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
  const { devices = [], loadDevices, deleteDevice } = useApp();

  // Load assignments from localStorage on mount
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'deviceAssignments') {
        setAssignments(event.newValue ? JSON.parse(event.newValue) : []);
      }
    };
    
    const assignmentsStr = localStorage.getItem('deviceAssignments');
    setAssignments(assignmentsStr ? JSON.parse(assignmentsStr) : []);
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
          state: storeDetails ? storeDetails.state : assignment.state || '',
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
  // List View column-wise filter state
  const [listViewStoreIdFilter, setListViewStoreIdFilter] = React.useState('');
  const [listViewStoreNameFilter, setListViewStoreNameFilter] = React.useState('');
  const [listViewCityFilter, setListViewCityFilter] = React.useState('');
  const [listViewStateFilter, setListViewStateFilter] = React.useState('');

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
  const handleAddDevice = () => {
    if (!newDeviceName.trim()) {
      alert('Please enter device name');
      return;
    }
    const devicesStr = localStorage.getItem('devices');
    const devicesList = devicesStr ? JSON.parse(devicesStr) : [];
    const newDevice = {
      id: Date.now().toString(),
      name: newDeviceName,
      orientation: newDeviceOrientation,
      resolution: {
        width: parseInt(newDeviceResolutionWidth),
        height: parseInt(newDeviceResolutionHeight)
      }
    };
    devicesList.push(newDevice);
    localStorage.setItem('devices', JSON.stringify(devicesList));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'devices',
      newValue: JSON.stringify(devicesList)
    }));
    setShowAddModal(false);
    setIsClone(false);
    setNewDeviceName('');
    setNewDeviceOrientation('both');
    setNewDeviceResolutionWidth('1920');
    setNewDeviceResolutionHeight('1080');
    loadDevices && loadDevices();
  };

  const openConfigModal = (device) => {
    setConfigDevice(device);
    setConfigName(device.name);
    setConfigOrientation(device.orientation || 'both');
    setConfigResolutionWidth(device.resolution?.width || 1920);
    setConfigResolutionHeight(device.resolution?.height || 1080);
    setConfigMacAddress(device.macAddress || '');
    setShowConfigModal(true);
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

  const handleSaveConfiguration = () => {
    if (!configName.trim()) {
      alert('Please enter device name');
      return;
    }

    const devicesStr = localStorage.getItem('devices');
    const devicesList = devicesStr ? JSON.parse(devicesStr) : [];
    
    const updatedDevices = devicesList.map(d => 
      d.id === configDevice.id 
        ? {
            ...d,
            name: configName,
            orientation: configOrientation,
            resolution: {
              width: parseInt(configResolutionWidth),
              height: parseInt(configResolutionHeight)
            }
          }
        : d
    );
    
    localStorage.setItem('devices', JSON.stringify(updatedDevices));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'devices',
      newValue: JSON.stringify(updatedDevices)
    }));

    setShowConfigModal(false);
    setConfigDevice(null);
    window.location.reload();
  };

  const confirmDeleteDevice = (device) => {
    setDeleteDeviceState(device);
    setShowDeleteModal(true);
  };

  const handleDeleteDevice = () => {
    if (deleteDeviceState) {
      deleteDevice(deleteDeviceState.id);
      setShowDeleteModal(false);
      setDeleteDeviceState(null);
    }
  };

  // Removed unused: openAssignModal, handleStageAssignment, handleRemoveStagedAssignment, handleAssignToStore

  const handleAssignNewDevice = () => {
    if (!selectedStoreForAssignment || !deviceToAssign || !macAddressToAssign || !orientationToAssign) {
      alert('Please fill all fields.');
      return;
    }
    if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(macAddressToAssign)) {
      alert('Please enter a valid MAC address (e.g., 00:1A:2B:3C:4D:5E)');
      return;
    }

    const assignmentsStr = localStorage.getItem('deviceAssignments');
    let allAssignments = assignmentsStr ? JSON.parse(assignmentsStr) : [];

    const newAssignment = {
      assignmentId: `${Date.now()}-new`,
      deviceId: deviceToAssign,
      storeId: selectedStoreForAssignment.value,
      macAddress: macAddressToAssign,
      orientation: orientationToAssign,
      active: true,
    };

    const updatedAssignments = [...allAssignments, newAssignment];
    localStorage.setItem('deviceAssignments', JSON.stringify(updatedAssignments));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'deviceAssignments',
      newValue: JSON.stringify(updatedAssignments)
    }));

    // Reset form
    setDeviceToAssign(null);
    setMacAddressToAssign('');
    setOrientationToAssign('');
  };

  const handleDeleteStore = (storeId) => {
    if (window.confirm(`Are you sure you want to delete all assignments for store ${storeId}?`)) {
        const assignmentsStr = localStorage.getItem('deviceAssignments');
        let allAssignments = assignmentsStr ? JSON.parse(assignmentsStr) : [];
        const updatedAssignments = allAssignments.filter(a => a.storeId !== storeId);
        localStorage.setItem('deviceAssignments', JSON.stringify(updatedAssignments));
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'deviceAssignments',
            newValue: JSON.stringify(updatedAssignments)
        }));
    }
};

  // Clone device handler (must be outside JSX)
  const handleCloneDevice = (device) => {
    setNewDeviceName('');
    setNewDeviceOrientation(device.orientation || 'both');
    setNewDeviceResolutionWidth(device.resolution?.width?.toString() || '1920');
    setNewDeviceResolutionHeight(device.resolution?.height?.toString() || '1080');
    setIsClone(true);
    setShowAddModal(true);
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
            'Status': device.active ? 'Active' : 'Inactive',
            'Orientation': device.orientation === 'both' ? 'Both' : device.orientation === 'horizontal' ? 'Landscape' : device.orientation === 'vertical' ? 'Portrait' : (device.orientation || 'N/A'),
          });
        });
      }
    });

    // Create worksheet and add bold headers
    const headers = [
      'Store ID', 'Store Name', 'City', 'State', 'Device', 'DeviceID', 'MAC Address', 'Status', 'Orientation'
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
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      const assignmentsStr = localStorage.getItem('deviceAssignments');
      let allAssignments = assignmentsStr ? JSON.parse(assignmentsStr) : [];

      const newAssignments = json.map((row, index) => {
        const deviceName = row['Device'] ? String(row['Device']).trim() : '';
        const storeId = row['Store ID'] ? String(row['Store ID']).trim() : '';
        const macAddress = row['MAC Address'] ? String(row['MAC Address']).trim() : '';
        let orientation = row['Orientation'] ? String(row['Orientation']).trim().toLowerCase() : '';

        // Map user-friendly terms to internal values
        if (orientation === 'landscape') orientation = 'horizontal';
        if (orientation === 'portrait') orientation = 'vertical';

        if (!deviceName || !storeId || !macAddress) {
          return null;
        }

        const device = devices.find(d => d.name === deviceName);
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
          orientation: normalizedOrientation,
          active: true,
          originalRow: row, // Keep track for error reporting
        };
      });

      const validAssignments = newAssignments.filter(a => a && a.deviceId);
      const invalidAssignments = newAssignments.filter(a => a && !a.deviceId);

      if (invalidAssignments.length > 0) {
        const invalidDevices = invalidAssignments.map(a => a.originalRow['Device']).join(', ');
        alert(`The following devices could not be found and were not assigned: ${invalidDevices}`);
      }

      const assignmentsToSave = validAssignments.map(({ originalRow, ...rest }) => rest);

      const updatedAssignments = [...allAssignments, ...assignmentsToSave];
      
      localStorage.setItem('deviceAssignments', JSON.stringify(updatedAssignments));
      
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'deviceAssignments',
        newValue: JSON.stringify(updatedAssignments)
      }));

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Save Changes in Assign tab (writes to localStorage, returns to List View)
  const handleAssignTabSaveChanges = () => {
    if (!selectedStoreForAssignment) return;
    const assignmentsStr = localStorage.getItem('deviceAssignments');
    let allAssignments = assignmentsStr ? JSON.parse(assignmentsStr) : [];
    // Remove all assignments for this store
    const otherAssignments = allAssignments.filter(a => a.storeId !== selectedStoreForAssignment.value);
    // Add updated assignments
    const updatedAssignments = [
      ...otherAssignments,
      ...assignTabAssignments.map(d => ({
        assignmentId: d.assignmentId,
        deviceId: d.id,
        storeId: selectedStoreForAssignment.value,
        macAddress: d.macAddress,
        orientation: d.orientation,
        active: d.active,
      }))
    ];
    localStorage.setItem('deviceAssignments', JSON.stringify(updatedAssignments));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'deviceAssignments',
      newValue: JSON.stringify(updatedAssignments)
    }));
    // Return to List View
    setActiveSubTab('listView');
    setSelectedStoreForAssignment(null);
    setAssignTabEditMode(false);
  };

  // List View Edit button handler: go to Assign tab, select store, open assign form in edit mode
  const handleListViewEdit = (store) => {
    setActiveSubTab('assign');
    setActiveTab('assign');
    setSelectedStoreForAssignment({ value: store.id, label: `${store.name} (${store.id})` });
    setShowInlineAssignForm(true);
    setAssignTabEditMode(true);
  };

  return (
    <div className="device-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-hdd-network me-2"></i>
          Device Management
        </h2>
      </div>

      {/* TABS SECTION */}
      <Tabs
        id="device-tabs"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        {/* TAB 1: DEVICE CONFIGURATOR */}
        <Tab 
          eventKey="configurator" 
          title={
            <>
              <i className="bi bi-gear me-2"></i>
              Devices
              <Badge bg="secondary" className="ms-2">{devices.length}</Badge>
            </>
          }
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div></div>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <i className="bi bi-plus-circle me-2"></i>
              Add New Device
            </Button>
          </div>
          {devices.length === 0 ? (
            <Alert variant="info">
              <i className="bi bi-info-circle me-2"></i>
              No devices registered yet. Click "Add New Device" to get started.
            </Alert>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Device ID</th>
                    <th>Device Name</th>
                    <th>Resolution</th>
                    <th>Possible Orientation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(device => {
                    return (
                      <tr key={device.id}>
                        <td>{device.id}</td>
                        <td className="font-monospace small">{device.name}</td>
                        <td>{device.resolution?.width || 1920} × {device.resolution?.height || 1080}</td>
                        <td>{device.orientation === 'both' ? 'Both' : device.orientation === 'horizontal' ? 'Landscape' : 'Portrait'}</td>
                        <td>
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip id={`tooltip-edit-${device.id}`}>Edit/Configure</Tooltip>}
                          >
                            <Button 
                              variant="primary" 
                              size="sm"
                              className="me-2"
                              onClick={() => openConfigModal(device)}
                            >
                              <i className="bi bi-gear"></i>
                            </Button>
                          </OverlayTrigger>
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
                            overlay={<Tooltip id={`tooltip-delete-${device.id}`}>Delete</Tooltip>}
                          >
                            <Button 
                              variant="danger" 
                              size="sm"
                              onClick={() => confirmDeleteDevice(device)}
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </OverlayTrigger>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Tab>

        {/* TAB 2: DEVICE STORE MAPPING - WITH NESTED TABS */}
        <Tab 
          eventKey="assign" 
          title={
            <>
              <i className="bi bi-shop me-2"></i>
              Device Store Mapping
            </>
          }
        >
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
                    <Form.Label>Search for a store by ID or name</Form.Label>
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
                        setOrientationToAssign('');
                      }}
                    />
                  </Form.Group>
                  {selectedStoreForAssignment && devicesForSelectedStore.length > 0 && (
                    <Button
                      variant="primary"
                      className="mb-3"
                      onClick={() => setShowInlineAssignForm(v => !v)}
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      {showInlineAssignForm ? 'Hide Assign Form' : 'Assign Device'}
                    </Button>
                  )}
                </Col>
              </Row>

              {selectedStoreForAssignment && (
                <>
                  {devicesForSelectedStore.length > 0 ? (
                    <div className="mt-4">
                      {showInlineAssignForm && (
                        <>
                               <br></br>
                          <h5>Assign a New Device to {selectedStoreForAssignment.label}</h5>
                          <Row className="align-items-end mb-4">
                            <Col md={4}>
                              <Form.Group>
                                <Form.Label>Select Device Model</Form.Label>
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
                            {deviceToAssign && (() => {
                                const selectedDeviceForAssignment = devices.find(d => d.id === deviceToAssign);
                                if (!selectedDeviceForAssignment) return null;
                                return (
                                    <Col md={3}>
                                        <Form.Group>
                                        <Form.Label>Orientation</Form.Label>
                                        {selectedDeviceForAssignment.orientation === 'both' ? (
                                            <div>
                                              <Form.Check
                                                inline
                                                type="radio"
                                                id="orientation-horizontal-radio"
                                                label={<label htmlFor="orientation-horizontal-radio" style={{ cursor: 'pointer', marginBottom: 0 }}>Landscape</label>}
                                                name="orientation"
                                                value="horizontal"
                                                checked={orientationToAssign === 'horizontal'}
                                                onChange={e => setOrientationToAssign(e.target.value)}
                                              />
                                              <Form.Check
                                                inline
                                                type="radio"
                                                id="orientation-vertical-radio"
                                                label={<label htmlFor="orientation-vertical-radio" style={{ cursor: 'pointer', marginBottom: 0 }}>Portrait</label>}
                                                name="orientation"
                                                value="vertical"
                                                checked={orientationToAssign === 'vertical'}
                                                onChange={e => setOrientationToAssign(e.target.value)}
                                              />
                                            </div>
                                        ) : (
                                            <p className="form-control-static" style={{ paddingTop: '7px' }}>
                                            {selectedDeviceForAssignment.orientation === 'horizontal' ? 'Landscape' : 'Portrait'}
                                            </p>
                                        )}
                                        </Form.Group>
                                    </Col>
                                );
                            })()}
                            <Col md={2}>
                                <Button 
                                  variant="primary" 
                                  onClick={handleAssignNewDevice}
                                  disabled={!deviceToAssign || !macAddressToAssign || !orientationToAssign || !isValidMac}
                                >
                                  Assign Device
                                </Button>
                            </Col>
                          </Row>
                          <div className="d-flex justify-content-end mt-3">
                            <Button variant="primary" onClick={() => {
                              // Save assignTabAssignments to localStorage for this store
                              const assignmentsStr = localStorage.getItem('deviceAssignments');
                              let allAssignments = assignmentsStr ? JSON.parse(assignmentsStr) : [];
                              // Remove assignments for this store
                              allAssignments = allAssignments.filter(a => a.storeId !== selectedStoreForAssignment.value);
                              // Add back the edited assignments
                              const newAssignments = assignTabAssignments.map(d => ({
                                assignmentId: d.assignmentId,
                                deviceId: d.id,
                                storeId: selectedStoreForAssignment.value,
                                macAddress: d.macAddress,
                                orientation: d.orientation,
                                active: d.active
                              }));
                              const updatedAssignments = [...allAssignments, ...newAssignments];
                              localStorage.setItem('deviceAssignments', JSON.stringify(updatedAssignments));
                              window.dispatchEvent(new StorageEvent('storage', {
                                key: 'deviceAssignments',
                                newValue: JSON.stringify(updatedAssignments)
                              }));
                              setActiveTab('assign');
                              setActiveSubTab('listView');
                            }}>
                              <i className="bi bi-save me-2"></i>
                              Save Changes
                            </Button>
                          </div>
                        </>
                      )}
                      <h5>Assigned Devices for {selectedStoreForAssignment.label}</h5>
                      <div className="table-responsive mb-4">
                        <table className="table table-bordered align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Device Name</th>
                              <th>Device ID</th>
                              <th>MAC Address</th>
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
                                <td>{device.orientation === 'both' ? 'Both' : device.orientation === 'horizontal' ? 'Landscape' : device.orientation === 'vertical' ? 'Portrait' : (device.orientation || 'N/A')}</td>
                                <td>
                                  <Badge bg={device.active ? 'success' : 'danger'}>
                                    {device.active ? 'Active' : 'Inactive'}
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
                                    label={device.active ? 'Deactivate' : 'Activate'}
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
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <h5>Assign a New Device to {selectedStoreForAssignment.label}</h5>
                      <Row className="align-items-end">
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label>Select Device Model</Form.Label>
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
                        {deviceToAssign && (() => {
                            const selectedDeviceForAssignment = devices.find(d => d.id === deviceToAssign);
                            if (!selectedDeviceForAssignment) return null;
                            return (
                                <Col md={3}>
                                    <Form.Group>
                                    <Form.Label>Orientation</Form.Label>
                                    {selectedDeviceForAssignment.orientation === 'both' ? (
                                        <div>
                                        <Form.Check
                                            inline
                                            type="radio"
                                            label="Landscape"
                                            name="orientation"
                                            value="horizontal"
                                            checked={orientationToAssign === 'horizontal'}
                                            onChange={e => setOrientationToAssign(e.target.value)}
                                        />
                                        <Form.Check
                                            inline
                                            type="radio"
                                            label="Portrait"
                                            name="orientation"
                                            value="vertical"
                                            checked={orientationToAssign === 'vertical'}
                                            onChange={e => setOrientationToAssign(e.target.value)}
                                        />
                                        </div>
                                    ) : (
                                        <p className="form-control-static" style={{ paddingTop: '7px' }}>
                                        {selectedDeviceForAssignment.orientation === 'horizontal' ? 'Landscape' : 'Portrait'} <Badge bg="info">Auto</Badge>
                                        </p>
                                    )}
                                    </Form.Group>
                                </Col>
                            );
                        })()}
                        <Col md={2}>
                            <Button 
                                variant="primary" 
                                onClick={handleAssignNewDevice}
                                disabled={!deviceToAssign || !macAddressToAssign || !orientationToAssign}
                                >
                                Assign Device
                            </Button>
                        </Col>
                      </Row>
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
              {storeDeviceMap.length > 0 ? (
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
                      {storeDeviceMap
                        .filter(store => {
                          // All filters are case-insensitive substring match
                          const idMatch = listViewStoreIdFilter.trim() === '' || store.id.toLowerCase().includes(listViewStoreIdFilter.trim().toLowerCase());
                          const nameMatch = listViewStoreNameFilter.trim() === '' || (store.name && store.name.toLowerCase().includes(listViewStoreNameFilter.trim().toLowerCase()));
                          const cityMatch = listViewCityFilter.trim() === '' || (store.area && store.area.toLowerCase().includes(listViewCityFilter.trim().toLowerCase()));
                          const stateMatch = listViewStateFilter.trim() === '' || (store.state && store.state.toLowerCase().includes(listViewStateFilter.trim().toLowerCase()));
                          return idMatch && nameMatch && cityMatch && stateMatch;
                        })
                        .map(store => (
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
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Alert variant="info">
                  <i className="bi bi-info-circle me-2"></i>
                  No devices have been assigned to a store yet.
                </Alert>
              )}
            </Tab>
          </Tabs>
        </Tab>
      </Tabs>

      {/* Add Device Modal */}
      <Modal show={showAddModal} onHide={() => { setShowAddModal(false); setIsClone(false); }} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{isClone ? 'Clone Device' : 'Add New Device'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Device Name */}
            <Form.Group className="mb-3">
              <Form.Label>Device Name *</Form.Label>
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
            {/* Device Name */}
            <Form.Group className="mb-3">
              <Form.Label>Device Name *</Form.Label>
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
    </div>
  );
}
export default DeviceManagement;