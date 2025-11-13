import React, { useState } from 'react';
import { Row, Col, Card, Button, Form, InputGroup, Modal, Badge, Alert } from 'react-bootstrap';
import QRCode from 'react-qr-code';
import { useApp } from '../../context/AppContext';
import { mockLocations } from '../../data/mockLocations';
import './DeviceManagement.css';

function DeviceManagement() {
  const { devices, registerDevice, deleteDevice: removeDevice } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deleteDevice, setDeleteDevice] = useState(null);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceOrientation, setNewDeviceOrientation] = useState('horizontal');
  const [newDeviceStore, setNewDeviceStore] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const baseUrl = window.location.origin;

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

  const handleAddDevice = () => {
    if (!newDeviceName.trim()) {
      alert('Please enter device name');
      return;
    }

    const deviceId = `device-${Date.now()}`;
    registerDevice({
      id: deviceId,
      name: newDeviceName,
      orientation: newDeviceOrientation,
      storeId: newDeviceStore ? parseInt(newDeviceStore) : null
    });

    setNewDeviceName('');
    setNewDeviceStore('');
    setShowAddModal(false);
  };

  const fallbackCopyToClipboard = (text, deviceId) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopiedId(deviceId);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        alert('Failed to copy to clipboard. Please copy manually.');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      alert('Failed to copy to clipboard. Please copy manually.');
    }
    
    document.body.removeChild(textArea);
  };

  const copyToClipboard = async (text, deviceId) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopiedId(deviceId);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        fallbackCopyToClipboard(text, deviceId);
      }
    } catch (err) {
      console.warn('Clipboard API failed, using fallback:', err);
      fallbackCopyToClipboard(text, deviceId);
    }
  };

  const showQRCode = (device) => {
    setSelectedDevice(device);
    setShowQRModal(true);
  };

  const confirmDeleteDevice = (device) => {
    setDeleteDevice(device);
    setShowDeleteModal(true);
  };

  const handleDeleteDevice = () => {
    if (deleteDevice) {
      removeDevice(deleteDevice.id);
      setShowDeleteModal(false);
      setDeleteDevice(null);
    }
  };

  const getDeviceUrl = (deviceId) => {
    return `${baseUrl}/display/${deviceId}`;
  };

  const getStoreName = (storeId) => {
    if (!storeId) return 'Not linked';
    const store = allStores.find(s => s.id === storeId);
    return store ? store.name : 'Unknown Store';
  };

  return (
    <div className="device-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="bi bi-collection me-2"></i>
          Device Management
        </h2>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-plus-circle me-2"></i>
          Add New Device
        </Button>
      </div>

      {devices.length === 0 && (
        <Alert variant="info">
          <i className="bi bi-info-circle me-2"></i>
          No devices registered yet. Click "Add New Device" to get started.
        </Alert>
      )}

      <Row>
        {devices.map(device => {
          const deviceUrl = getDeviceUrl(device.id);
          const isCopied = copiedId === device.id;

          return (
            <Col key={device.id} lg={6} className="mb-4">
              <Card className="device-card">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">
                      <i className="bi bi-display me-2"></i>
                      {device.name}
                    </h5>
                  </div>
                  <Badge bg={device.status === 'online' ? 'success' : 'secondary'}>
                    {device.status || 'inactive'}
                  </Badge>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <small className="text-muted">Device ID:</small>
                    <div className="fw-bold font-monospace small">{device.id}</div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted">Pairing Code:</small>
                    <div className="pairing-code-display">{device.pairingCode}</div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted">Linked Store:</small>
                    <div>
                      <i className="bi bi-shop me-2"></i>
                      {getStoreName(device.storeId)}
                    </div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted">Orientation:</small>
                    <div>
                      <i className={`bi ${device.orientation === 'horizontal' ? 'bi-phone-landscape' : 'bi-phone'} me-2`}></i>
                      {device.orientation}
                    </div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted">Display URL:</small>
                    <InputGroup className="mt-2">
                      <Form.Control
                        type="text"
                        value={deviceUrl}
                        readOnly
                        className="url-input"
                      />
                      <Button 
                        variant={isCopied ? "success" : "outline-primary"}
                        onClick={() => copyToClipboard(deviceUrl, device.id)}
                      >
                        <i className={`bi ${isCopied ? 'bi-check-circle' : 'bi-clipboard'} me-1`}></i>
                        {isCopied ? 'Copied!' : 'Copy'}
                      </Button>
                    </InputGroup>
                  </div>

                  <div className="d-grid gap-2">
                    <Button 
                      variant="info" 
                      onClick={() => showQRCode(device)}
                    >
                      <i className="bi bi-qr-code me-2"></i>
                      Show QR Code
                    </Button>
                    <Button 
                      variant="outline-primary" 
                      href={deviceUrl}
                      target="_blank"
                    >
                      <i className="bi bi-box-arrow-up-right me-2"></i>
                      Open Display
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      onClick={() => confirmDeleteDevice(device)}
                    >
                      <i className="bi bi-trash me-2"></i>
                      Delete Device
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Add Device Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Device</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Device Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Store LA-01 Display"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Screen Orientation *</Form.Label>
              <div>
                <Form.Check
                  type="radio"
                  id="orientation-horizontal"
                  label={
                    <>
                      <i className="bi bi-phone-landscape me-2"></i>
                      Horizontal
                    </>
                  }
                  value="horizontal"
                  checked={newDeviceOrientation === 'horizontal'}
                  onChange={(e) => setNewDeviceOrientation(e.target.value)}
                />
                <Form.Check
                  type="radio"
                  id="orientation-vertical"
                  label={
                    <>
                      <i className="bi bi-phone me-2"></i>
                      Vertical
                    </>
                  }
                  value="vertical"
                  checked={newDeviceOrientation === 'vertical'}
                  onChange={(e) => setNewDeviceOrientation(e.target.value)}
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Link to Store</Form.Label>
              <Form.Select
                value={newDeviceStore}
                onChange={(e) => setNewDeviceStore(e.target.value)}
              >
                <option value="">-- Select Store --</option>
                {allStores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Link this device to a store location for content assignments
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddDevice}>
            <i className="bi bi-plus-circle me-2"></i>
            Add Device
          </Button>
        </Modal.Footer>
      </Modal>

      {/* QR Code Modal */}
      <Modal show={showQRModal} onHide={() => setShowQRModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>QR Code - {selectedDevice?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedDevice && (
            <>
              <div className="qr-code-container mb-3">
                <QRCode 
                  value={getDeviceUrl(selectedDevice.id)} 
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
              <p className="text-muted">
                Scan this QR code to open the display on any device
              </p>
              <div className="p-2 bg-light rounded">
                <small className="font-monospace">
                  {getDeviceUrl(selectedDevice.id)}
                </small>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="primary" 
            onClick={() => copyToClipboard(getDeviceUrl(selectedDevice.id), selectedDevice.id)}
          >
            <i className="bi bi-clipboard me-2"></i>
            Copy URL
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
            <p className="fw-bold">{deleteDevice?.name}</p>
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
    </div>
  );
}

export default DeviceManagement;
