// src/pages/DeviceManagement/DeviceManagement.jsx - ENHANCED CONFIGURATOR

import React, { useEffect, useRef } from 'react';
import { Row, Col, Card, Button, Form, InputGroup, Modal, Badge, Alert, Tabs, Tab, OverlayTrigger, Tooltip } from 'react-bootstrap';
import ReactSelect from 'react-select';
import QRCode from 'react-qr-code';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { storeList } from '../../data/storeList';

function DeviceManagement() {
  const fileInputRef = useRef(null);
  const [storeIdSuggestions, setStoreIdSuggestions] = React.useState([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [stagedAssignments, setStagedAssignments] = React.useState([]);
  const [stagedMacAddress, setStagedMacAddress] = React.useState('');
  const [storeDeviceMap, setStoreDeviceMap] = React.useState([]);
  const [assignments, setAssignments] = React.useState([]); // NEW STATE for assignments
  
  // State for Edit Store Modal
  const [showEditStoreModal, setShowEditStoreModal] = React.useState(false);
  const [editingStore, setEditingStore] = React.useState(null);
  const [editableDevices, setEditableDevices] = React.useState([]);
  const [deviceToAdd, setDeviceToAdd] = React.useState('');
  const [deviceToAddMac, setDeviceToAddMac] = React.useState('');
  
  // Autocomplete for manual store IDs
  const handleManualStoreIdChange = (e) => {
    const value = e.target.value;
    setManualStoreIds(value);
    validateManualStoreIds(value);
    // Show suggestions for the last segment
    const last = value.split(',').pop().trim().toUpperCase();
    if (last.length >= 3) {
      const matches = storeList
        .map(s => s.id)
        .filter(id => id.toUpperCase().startsWith(last) && !value.split(',').map(v => v.trim().toUpperCase()).includes(id.toUpperCase()));
      setStoreIdSuggestions(matches.slice(0, 10));
      setShowSuggestions(true);
    } else {
      setStoreIdSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    // Replace last segment with suggestion
    let parts = manualStoreIds.split(',');
    parts[parts.length - 1] = suggestion;
    const newValue = parts.join(', ').replace(/,\s*$/, '');
    setManualStoreIds(newValue);
    validateManualStoreIds(newValue);
    setShowSuggestions(false);
  };

  const openEditStoreModal = (store) => {
    setEditingStore(store);
    setEditableDevices(store.devices.map(d => ({ ...d, active: d.active !== false })));
    setDeviceToAddMac('');
    setShowEditStoreModal(true);
  };

  const handleDeviceStatusToggle = (assignmentId) => {
    setEditableDevices(
      editableDevices.map(d =>
        d.assignmentId === assignmentId ? { ...d, active: !d.active } : d
      )
    );
  };

  const handleRemoveDeviceFromStore = (assignmentId) => {
    setEditableDevices(editableDevices.filter(d => d.assignmentId !== assignmentId));
  };

  const handleAddDeviceToStore = () => {
    if (!deviceToAdd) {
      alert('Please select a device to add.');
      return;
    }
    if (!deviceToAddMac) {
      alert('Please enter a MAC address.');
      return;
    }
    const device = devices.find(d => d.id === deviceToAdd);
    if (device) {
      const newEditableDevice = {
        ...device,
        assignmentId: `new-${Date.now()}`, // Temp ID
        macAddress: deviceToAddMac,
        active: true,
        isNew: true
      };
      setEditableDevices([...editableDevices, newEditableDevice]);
      setDeviceToAdd('');
      setDeviceToAddMac('');
    }
  };

  const handleSaveChanges = () => {
    if (!editingStore) return;

    const assignmentsStr = localStorage.getItem('deviceAssignments');
    let allAssignments = assignmentsStr ? JSON.parse(assignmentsStr) : [];

    // Filter out all previous assignments for the current store
    const otherStoreAssignments = allAssignments.filter(a => a.storeId !== editingStore.id);

    // Create new assignments from the editableDevices list
    const newStoreAssignments = editableDevices.map((d, index) => ({
      assignmentId: d.assignmentId.startsWith('new-') ? `${Date.now()}-${index}` : d.assignmentId,
      deviceId: d.id,
      storeId: editingStore.id,
      macAddress: d.macAddress,
      active: d.active,
    }));

    // Combine and save
    const updatedAssignments = [...otherStoreAssignments, ...newStoreAssignments];
    localStorage.setItem('deviceAssignments', JSON.stringify(updatedAssignments));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'deviceAssignments',
      newValue: JSON.stringify(updatedAssignments)
    }));

    setShowEditStoreModal(false);
    setEditingStore(null);
    setEditableDevices([]);
  };

  // Hierarchical store selection state (using storeList from PDF)
  const [selectedHierarchy, setSelectedHierarchy] = React.useState('country');
  const [selectedCountry, setSelectedCountry] = React.useState('India');
  const [selectedState, setSelectedState] = React.useState('');
  const [selectedArea, setSelectedArea] = React.useState('');
  const [manualStoreIds, setManualStoreIds] = React.useState('');
  const [storeIdError, setStoreIdError] = React.useState('');

  // Helper functions to get unique options from storeList
  const getCountries = () => ['India'];
  const getStates = () => selectedCountry ? [...new Set(storeList.filter(s => s.country === selectedCountry).map(s => s.state))].sort((a, b) => a.localeCompare(b)) : [];
  const getAreas = () => selectedState ? [...new Set(storeList.filter(s => s.country === selectedCountry && s.state === selectedState).map(s => s.area))].sort((a, b) => a.localeCompare(b)) : [];
  const getStores = () => selectedArea ? storeList.filter(s => s.country === selectedCountry && s.state === selectedState && s.area === selectedArea) : [];

  // Validate manual store IDs (comma-separated, must match a store in storeList)
  const validateManualStoreIds = (input) => {
    if (!input) {
      setStoreIdError('');
      return true;
    }
    const ids = input.split(',').map(id => id.trim()).filter(Boolean);
    const allStoresFlat = storeList.map(s => s.id);
    const invalid = ids.filter(id => !allStoresFlat.includes(id));
    if (invalid.length > 0) {
      setStoreIdError(`Invalid store IDs: ${invalid.join(', ')}`);
      return false;
    }
    setStoreIdError('');
    return true;
  };

  // Context and device lists must come first
  const { devices = [], loadDevices, deleteDevice } = useApp();
  const unassignedDevices = devices.filter(d => !d.storeId);
  const assignedDevices = devices.filter(d => d.storeId);

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
          ...(storeDetails || { id: storeId, name: 'Unknown Store' }),
          deviceCount: 0,
          devices: [] // This will hold device instances with assignment info
        };
      }
      
      const deviceModel = devices.find(d => d.id === assignment.deviceId);
      if (deviceModel) {
        acc[storeId].deviceCount++;
        // Add the assignmentId to make each item unique, which is crucial for editing/deleting
        acc[storeId].devices.push({ 
          ...deviceModel, 
          assignmentId: assignment.assignmentId,
          macAddress: assignment.macAddress,
          active: assignment.active !== false // Default to true
        });
      }
      return acc;
    }, {});

    setStoreDeviceMap(Object.values(groupedByStore));
  }, [assignments, devices]);

  // ...existing hooks...
  const [activeTab, setActiveTab] = React.useState('configurator');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showConfigModal, setShowConfigModal] = React.useState(false);
  const [showAssignModal, setShowAssignModal] = React.useState(false);
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
  const [assignDevice, setAssignDevice] = React.useState(null);
  const [selectedAssignDeviceId, setSelectedAssignDeviceId] = React.useState('');
  const [selectedStore, setSelectedStore] = React.useState('');
  const [allStores, setAllStores] = React.useState([
    { id: 5, name: 'Store LA-01' },
    { id: 6, name: 'Store LA-02' },
    { id: 8, name: 'Store SF-01' },
    { id: 9, name: 'Store SF-02' },
    { id: 12, name: 'Store HOU-01' },
    { id: 16, name: 'Store MUM-01' },
    { id: 17, name: 'Store MUM-02' }
  ]);
  const [deleteDeviceState, setDeleteDeviceState] = React.useState(null);
  const [selectedDevice, setSelectedDevice] = React.useState(null);
  const [showQRModal, setShowQRModal] = React.useState(false);
  const baseUrl = window.location.origin;

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

  const showQRCode = (device) => {
    setSelectedDevice(device);
    setShowQRModal(true);
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

  const openAssignModal = (device) => {
    setAssignDevice(device);
    setSelectedAssignDeviceId(device?.id || '');
    setSelectedStore(device?.storeId || '');
    setSelectedHierarchy('country');
    setSelectedCountry('India');
    setSelectedState('');
    setSelectedArea('');
    setManualStoreIds('');
    setStoreIdError('');
    setStagedAssignments([]);
    setShowAssignModal(true);
  };

  const handleStageAssignment = () => {
    if (!selectedAssignDeviceId || (!selectedStore && !manualStoreIds)) {
      alert('Please select a device and a store.');
      return;
    }
    if (!stagedMacAddress) {
      alert('Please enter a MAC address.');
      return;
  }

    const device = devices.find(d => d.id === selectedAssignDeviceId);
    if (!device) {
      alert('Device not found.');
      return;
    }

    const storeId = selectedStore || manualStoreIds;
    const storeName = storeList.find(s => s.id === storeId)?.name || storeId;

    // Add a temporary unique ID for staging purposes
    const stagedAssignment = {
      tempId: `staged-${Date.now()}-${Math.random()}`, // Unique ID
      deviceId: device.id,
      deviceName: device.name,
      macAddress: stagedMacAddress,
      storeId,
      storeName
    };

    setStagedAssignments([...stagedAssignments, stagedAssignment]);
    setSelectedAssignDeviceId(''); // Reset dropdown
    setStagedMacAddress('');
  };

  const handleRemoveStagedAssignment = (tempId) => {
    setStagedAssignments(stagedAssignments.filter(a => a.tempId !== tempId));
  };

  const handleAssignToStore = () => {
    if (stagedAssignments.length === 0) {
      alert('Please add at least one device-store assignment.');
      return;
    }

    const assignmentsStr = localStorage.getItem('deviceAssignments');
    let allAssignments = assignmentsStr ? JSON.parse(assignmentsStr) : [];

    const newAssignments = stagedAssignments.map((staged, index) => ({
      assignmentId: `${Date.now()}-${index}`, // Create a unique ID for the assignment
      deviceId: staged.deviceId,
      storeId: staged.storeId,
      macAddress: staged.macAddress,
      active: true, // Default to active
    }));

    const updatedAssignments = [...allAssignments, ...newAssignments];
    
    localStorage.setItem('deviceAssignments', JSON.stringify(updatedAssignments));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'deviceAssignments',
      newValue: JSON.stringify(updatedAssignments)
    }));

    setShowAssignModal(false);
    setStagedAssignments([]);
  };



  const getDeviceUrl = (deviceId) => {
    return `${baseUrl}/display/${deviceId}`;
  };

  const getStoreName = (storeId) => {
    if (!storeId) return 'Not linked';
    const store = allStores.find(s => s.id === storeId);
    return store ? store.name : 'Unknown Store';
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
            'MAC Address': device.macAddress,
            'Status': device.active ? 'Active' : 'Inactive',
          });
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
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

        if (!deviceName || !storeId || !macAddress) {
          return null;
        }

        const device = devices.find(d => d.name === deviceName);
        return {
          assignmentId: `${Date.now()}-${index}`,
          deviceId: device ? device.id : null,
          storeId: storeId,
          macAddress: macAddress,
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
                    <th>Name</th>
                    <th>Device ID</th>
                    <th>MAC Address</th>
                    <th>Resolution</th>
                    <th>Orientation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(device => {
                    const assignment = assignments.find(a => a.deviceId === device.id);
                    return (
                      <tr key={device.id}>
                        <td>{device.name}</td>
                        <td className="font-monospace small">{device.id}</td>
                        <td>{assignment ? assignment.macAddress : 'N/A'}</td>
                        <td>{device.resolution?.width || 1920} × {device.resolution?.height || 1080}</td>
                        <td>{device.orientation === 'both' ? 'Both' : device.orientation === 'horizontal' ? 'Landscape' : 'Portrait'}</td>
                        <td>
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip id={`tooltip-edit-${device.id}`} className="custom-tooltip">Edit/Configure</Tooltip>}
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
                            overlay={<Tooltip id={`tooltip-clone-${device.id}`} className="custom-tooltip">Clone</Tooltip>}
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
                            overlay={<Tooltip id={`tooltip-delete-${device.id}`} className="custom-tooltip">Delete</Tooltip>}
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

        {/* TAB 2: DEVICE STORE MAPPING - WITH TOP RIGHT BUTTON */}
        <Tab 
          eventKey="assign" 
          title={
            <>
              <i className="bi bi-shop me-2"></i>
              Device Store Mapping
            </>
          }
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div></div>
            <div>
              <Button variant="success" className="me-2" onClick={handleDownload}>
                <i className="bi bi-download me-2"></i>
                Download
              </Button>
              <Button variant="info" className="me-2" onClick={() => fileInputRef.current.click()}>
                <i className="bi bi-upload me-2"></i>
                Upload
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
              />
              <Button variant="primary" onClick={() => openAssignModal(null)}>
                <i className="bi bi-link-45deg me-2"></i>
                Assign
              </Button>
            </div>
          </div>
          
          {storeDeviceMap.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Store ID</th>
                    <th>City</th>
                    <th>State</th>
                    <th>Count of Devices</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {storeDeviceMap.map(store => (
                    <tr key={store.id}>
                      <td>{store.id}</td>
                      <td>{store.area}</td>
                      <td>{store.state}</td>
                      <td>{store.deviceCount}</td>
                      <td>
                        <Button variant="outline-primary" size="sm" className="ms-2" onClick={() => openEditStoreModal(store)}>
                          <i className="bi bi-pencil-square me-2"></i>
                          Edit
                        </Button>
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

      {/* Assign to Store Modal - NEW HIERARCHY WITH RADIO BUTTONS */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Assign Device to Store</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Radio Button Selection for Hierarchy */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">Select Hierarchy Level</Form.Label>
              <div className="d-flex flex-row gap-4">
                <Form.Check
                  type="radio"
                  id="hierarchy-country"
                  name="hierarchy"
                  label="Country"
                  value="country"
                  checked={selectedHierarchy === 'country'}
                  onChange={(e) => {
                    setSelectedHierarchy(e.target.value);
                    setSelectedCountry('');
                    setSelectedState('');
                    setSelectedArea('');
                    setSelectedStore('');
                  }}
                  className="me-3"
                />
                <Form.Check
                  type="radio"
                  id="hierarchy-state"
                  name="hierarchy"
                  label="State"
                  value="state"
                  checked={selectedHierarchy === 'state'}
                  onChange={(e) => {
                    setSelectedHierarchy(e.target.value);
                    setSelectedCountry('');
                    setSelectedState('');
                    setSelectedArea('');
                    setSelectedStore('');
                  }}
                  className="me-3"
                />
                <Form.Check
                  type="radio"
                  id="hierarchy-city"
                  name="hierarchy"
                  label="City"
                  value="city"
                  checked={selectedHierarchy === 'city'}
                  onChange={(e) => {
                    setSelectedHierarchy(e.target.value);
                    setSelectedCountry('');
                    setSelectedState('');
                    setSelectedArea('');
                    setSelectedStore('');
                  }}
                />
              </div>
            </Form.Group>

            <hr />

            {/* Country Selection */}
            {selectedHierarchy === 'country' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Select Country</Form.Label>
                  <Form.Select
                    value={selectedCountry}
                    onChange={e => {
                      setSelectedCountry(e.target.value);
                      setSelectedState('');
                      setSelectedArea('');
                      setSelectedStore('');
                    }}
                  >
                    <option value="">-- Select Country --</option>
                    {getCountries().map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {selectedCountry && (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Select State</Form.Label>
                      <Form.Select
                        value={selectedState}
                        onChange={e => {
                          setSelectedState(e.target.value);
                          setSelectedArea('');
                          setSelectedStore('');
                        }}
                      >
                        <option value="">-- Select State --</option>
                        {getStates().map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {selectedState && (
                      <>
                        <Form.Group className="mb-3">
                          <Form.Label>Select Area/City</Form.Label>
                          <Form.Select
                            value={selectedArea}
                            onChange={e => {
                              setSelectedArea(e.target.value);
                              setSelectedStore('');
                            }}
                          >
                            <option value="">-- Select Area/City --</option>
                            {getAreas().map(area => (
                              <option key={area} value={area}>{area}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>

                        {selectedArea && (
                          <>
                            <Form.Group className="mb-3">
                              <Form.Label>Select Store</Form.Label>
                              <ReactSelect
                                options={getStores().map(store => ({
                                  value: store.id,
                                  label: `${store.name} (${store.id})`
                                }))}
                                value={getStores().map(store => ({
                                  value: store.id,
                                  label: `${store.name} (${store.id})`
                                })).find(option => option.value === selectedStore) || null}
                                onChange={option => setSelectedStore(option ? option.value : '')}
                                placeholder="Search or select a store..."
                              isClearable
                              />
                            </Form.Group>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* State Selection */}
            {selectedHierarchy === 'state' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Select State</Form.Label>
                  <Form.Select
                    value={selectedState}
                    onChange={e => {
                      setSelectedState(e.target.value);
                      setSelectedArea('');
                      setSelectedStore('');
                    }}
                  >
                    <option value="">-- Select State --</option>
                    {[...new Set(storeList.map(s => s.state))].sort((a, b) => a.localeCompare(b)).map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {selectedState && (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Select Area/City</Form.Label>
                      <Form.Select
                        value={selectedArea}
                        onChange={e => {
                          setSelectedArea(e.target.value);
                          setSelectedStore('');
                        }}
                      >
                        <option value="">-- Select Area/City --</option>
                        {[...new Set(storeList.filter(s => s.state === selectedState).map(s => s.area))].sort((a, b) => a.localeCompare(b)).map(area => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {selectedArea && (
                      <>
                        <Form.Group className="mb-3">
                          <Form.Label>Select Store</Form.Label>
                          <ReactSelect
                            options={storeList.filter(s => s.state === selectedState && s.area === selectedArea).map(store => ({
                              value: store.id,
                              label: `${store.name} (${store.id})`
                            }))}
                            value={storeList.filter(s => s.state === selectedState && s.area === selectedArea).map(store => ({
                              value: store.id,
                              label: `${store.name} (${store.id})`
                            })).find(option => option.value === selectedStore) || null}
                            onChange={option => setSelectedStore(option ? option.value : '')}
                            placeholder="Search or select a store..."
                            isClearable
                          />
                        </Form.Group>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* City/Area Selection */}
            {selectedHierarchy === 'city' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Select City/Area</Form.Label>
                  <Form.Select
                    value={selectedArea}
                    onChange={e => {
                      setSelectedArea(e.target.value);
                      setSelectedStore('');
                    }}
                  >
                    <option value="">-- Select City/Area --</option>
                    {[...new Set(storeList.map(s => s.area))].sort((a, b) => a.localeCompare(b)).map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    You can type to search for a city/area
                  </Form.Text>
                </Form.Group>

                {selectedArea && (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Select Store in {selectedArea}</Form.Label>
                      <ReactSelect
                        options={storeList.filter(s => s.area === selectedArea).map(store => ({
                          value: store.id,
                          label: `${store.name} (${store.id})`
                        }))}
                        value={storeList.filter(s => s.area === selectedArea).map(store => ({
                          value: store.id,
                          label: `${store.name} (${store.id})`
                        })).find(option => option.value === selectedStore) || null}
                        onChange={option => setSelectedStore(option ? option.value : '')}
                        placeholder="Search or select a store..."
                        isClearable
                      />
                    </Form.Group>
                  </>
                )}
              </>
            )}
            
            {/* Manual Store ID Entry */}
            <Form.Group className="mb-3" style={{ position: 'relative' }}>
              <Form.Label>Or enter Store IDs (comma separated)</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. INAPAML00004, INAPAML00008"
                value={manualStoreIds}
                autoComplete="off"
                onChange={handleManualStoreIdChange}
                onFocus={() => { if (storeIdSuggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {showSuggestions && storeIdSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  zIndex: 10,
                  background: 'white',
                  border: '1px solid #ccc',
                  width: '100%',
                  maxHeight: 180,
                  overflowY: 'auto',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                  {storeIdSuggestions.map(suggestion => (
                    <div
                      key={suggestion}
                      style={{ padding: '6px 12px', cursor: 'pointer' }}
                      onMouseDown={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
              {storeIdError && <Form.Text className="text-danger">{storeIdError}</Form.Text>}
              <Form.Text className="text-muted">
                Enter one or more store IDs, separated by commas. Start typing (e.g. INAP) to see suggestions.
              </Form.Text>
            </Form.Group>
              <hr />
            {/* Device Dropdown and Add Button */}
            {(selectedStore || manualStoreIds) && (
              <Row>
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label>Select Device to Assign</Form.Label>
                    <Form.Select
                      value={selectedAssignDeviceId}
                      onChange={e => setSelectedAssignDeviceId(e.target.value)}
                    >
                      <option value="">-- Select Device --</option>
                      {devices.map(device => (
                        <option key={device.id} value={device.id}>
                          {device.name} ({device.id})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  {selectedAssignDeviceId && (
                  <Form.Group className="mb-3">
                    <Form.Label>Enter MAC Address</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g., 00:1B:44:11:3A:B7"
                      value={stagedMacAddress}
                      onChange={(e) => setStagedMacAddress(e.target.value)}
                    />
                  </Form.Group>
                  )}
                </Col>
                <Col md={4} className="d-flex align-items-end mb-3">
                  <Button variant="outline-primary" onClick={handleStageAssignment} className="w-100">
                    <i className="bi bi-plus-circle me-2"></i>
                    Add
                  </Button>
                </Col>
              </Row>
            )}

            {/* Staged Assignments Table */}
            {stagedAssignments.length > 0 && (
              <div className="mt-4">
                <h5>Staged Assignments</h5>
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Device Name</th>
                        <th>MAC Address</th>
                        <th>Store ID</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stagedAssignments.map(assignment => (
                        <tr key={assignment.tempId}>
                          <td>{assignment.deviceName}</td>
                          <td>{assignment.macAddress}</td>
                          <td>{assignment.storeId}</td>
                          <td>
                            <Button variant="danger" size="sm" onClick={() => handleRemoveStagedAssignment(assignment.tempId)}>
                              <i className="bi bi-trash"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAssignToStore}
            disabled={stagedAssignments.length === 0}
          >
            <i className="bi bi-link-45deg me-2"></i>
            Assign to Store
          </Button>
        </Modal.Footer>
      </Modal>



      {/* Edit Store Modal */}
      <Modal show={showEditStoreModal} onHide={() => setShowEditStoreModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Store: {editingStore?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>Devices in this Store</h5>
          <div className="table-responsive mb-4">
            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Device Name</th>
                  <th>Device ID</th>
                  <th>MAC Address</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {editableDevices.map(device => (
                  <tr key={device.assignmentId}>
                    <td>{device.name}</td>
                    <td>{device.isNew ? <Badge bg="success">New</Badge> : device.id}</td>
                    <td>{device.macAddress}</td>
                    <td>
                      <Badge bg={device.active ? 'success' : 'danger'}>
                        {device.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="d-flex align-items-center">
                      <Form.Check
                        type="switch"
                        id={`switch-${device.assignmentId}`}
                        checked={device.active}
                        onChange={() => handleDeviceStatusToggle(device.assignmentId)}
                        label={device.active ? 'Deactivate' : 'Activate'}
                      />
                      <Button variant="outline-danger" size="sm" className="ms-3" onClick={() => handleRemoveDeviceFromStore(device.assignmentId)}>
                        <i className="bi bi-trash"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <hr />

          <h5>Add Device to Store</h5>
          <Row>
            <Col md={8}>
              <Form.Group>
                <Form.Label>Select Device to Add</Form.Label>
                <Form.Select
                  value={deviceToAdd}
                  onChange={e => setDeviceToAdd(e.target.value)}
                >
                  <option value="">-- Select a device --</option>
                  {devices.map(device => (
                      <option key={device.id} value={device.id}>{device.name} ({device.id})</option>
                  ))}
                </Form.Select>
              </Form.Group>
              {deviceToAdd && (
              <Form.Group className="mb-3">
                <Form.Label>Enter MAC Address</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., 00:1B:44:11:3A:B7"
                  value={deviceToAddMac}
                  onChange={(e) => setDeviceToAddMac(e.target.value)}
                />
              </Form.Group>
              )}
            </Col>
            <Col md={4} className="d-flex align-items-end">
              <Button onClick={handleAddDeviceToStore} variant="primary" className="w-100">
                <i className="bi bi-plus-circle me-2"></i>
                Add Device
              </Button>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditStoreModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveChanges}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

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