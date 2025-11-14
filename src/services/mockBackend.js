class MockBackend {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem('devices')) {
      localStorage.setItem('devices', JSON.stringify([]));
    }
    if (!localStorage.getItem('assignments')) {
      localStorage.setItem('assignments', JSON.stringify([]));
    }
    if (!localStorage.getItem('content')) {
      localStorage.setItem('content', JSON.stringify([]));
    }
    if (!localStorage.getItem('customContent')) {
      localStorage.setItem('customContent', JSON.stringify([]));
    }
  }

  registerDevice(deviceData) {
    const devicesStr = localStorage.getItem('devices');
    const devices = devicesStr ? JSON.parse(devicesStr) : [];
    
    const newDevice = {
      id: deviceData.id || Date.now().toString(),
      pairingCode: this.generatePairingCode(),
      status: 'online',
      lastHeartbeat: new Date().toISOString(),
      ...deviceData
    };
    
    devices.push(newDevice);
    localStorage.setItem('devices', JSON.stringify(devices));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'devices',
      newValue: JSON.stringify(devices)
    }));
    
    return newDevice;
  }

  getDevice(deviceId) {
    const devicesStr = localStorage.getItem('devices');
    const devices = devicesStr ? JSON.parse(devicesStr) : [];
    return devices.find(d => d.id === deviceId);
  }

  getAllDevices() {
    const devicesStr = localStorage.getItem('devices');
    return devicesStr ? JSON.parse(devicesStr) : [];
  }

  deleteDevice(deviceId) {
    const devicesStr = localStorage.getItem('devices');
    const devices = devicesStr ? JSON.parse(devicesStr) : [];
    
    const filtered = devices.filter(d => d.id !== deviceId);
    localStorage.setItem('devices', JSON.stringify(filtered));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'devices',
      newValue: JSON.stringify(filtered)
    }));
  }

  updateDeviceHeartbeat(deviceId) {
    const devicesStr = localStorage.getItem('devices');
    const devices = devicesStr ? JSON.parse(devicesStr) : [];
    
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      device.lastHeartbeat = new Date().toISOString();
      device.status = 'online';
      localStorage.setItem('devices', JSON.stringify(devices));
    }
  }

  getDeviceContent(deviceId) {
    const assignmentsStr = localStorage.getItem('assignments');
    const assignments = assignmentsStr ? JSON.parse(assignmentsStr) : [];
    
    const device = this.getDevice(deviceId);
    
    if (!device || !device.storeId) return [];
    
    return assignments.filter(a => {
      return a.locationId === device.storeId || 
             this.isParentLocation(a.locationId, device.storeId);
    });
  }

  addAssignment(assignment) {
    const assignmentsStr = localStorage.getItem('assignments');
    const assignments = assignmentsStr ? JSON.parse(assignmentsStr) : [];
    
    const newAssignment = {
      id: Date.now().toString(),
      ...assignment
    };
    
    assignments.push(newAssignment);
    localStorage.setItem('assignments', JSON.stringify(assignments));
    
    window.dispatchEvent(new CustomEvent('contentUpdate', {
      detail: { assignment: newAssignment }
    }));
    
    return newAssignment;
  }

  getAllAssignments() {
    const assignmentsStr = localStorage.getItem('assignments');
    return assignmentsStr ? JSON.parse(assignmentsStr) : [];
  }

  deleteAssignment(assignmentId) {
    const assignmentsStr = localStorage.getItem('assignments');
    const assignments = assignmentsStr ? JSON.parse(assignmentsStr) : [];
    
    const filtered = assignments.filter(a => a.id !== assignmentId);
    localStorage.setItem('assignments', JSON.stringify(filtered));
    
    window.dispatchEvent(new CustomEvent('contentUpdate', {
      detail: { deleted: assignmentId }
    }));
  }

  generatePairingCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  isParentLocation(parentId, childId) {
    // Simplified - expand based on your hierarchy
    return false;
  }
}

export const mockBackend = new MockBackend();
