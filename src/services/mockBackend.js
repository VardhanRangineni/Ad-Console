import { addAction } from './activityLog';

class MockBackend {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem('devices')) {
      localStorage.setItem('devices', JSON.stringify([]));
    }
    if (!localStorage.getItem('assignments')) {
      // Seed with demo assignments for dashboard testing
      localStorage.setItem('assignments', JSON.stringify([
        {
          id: 1,
          contentId: 1,
          locationId: 5,
          locationName: "Store LA-01",
          startDate: "2025-11-13",
          endDate: "2025-11-30",
          orientation: "horizontal"
        },
        {
          id: 2,
          contentId: 2,
          locationId: 8,
          locationName: "Store SF-01",
          startDate: "2025-11-13",
          endDate: "2025-11-29",
          orientation: "horizontal"
        },
        {
          id: 3,
          contentId: 3,
          locationId: 3,
          locationName: "California (All Stores)",
          startDate: "2025-11-15",
          endDate: "2025-12-25",
          orientation: "both"
        },
        {
          id: 4,
          contentId: 4,
          locationId: 4,
          locationName: "Store NY-01",
          startDate: "2025-11-20",
          endDate: "2025-11-23",
          orientation: "vertical"
        }
      ]));
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
    try {
      addAction({ actionType: 'device.add', actor: 'system', message: 'Device registered', details: { deviceId: newDevice.id } });
    } catch(err) {
      console.error('activity log error', err);
    }
    
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
    try {
      addAction({ actionType: 'device.delete', actor: 'system', message: 'Device removed', details: { deviceId } });
    } catch(err) {
      console.error('activity log error', err);
    }
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
    try {
      addAction({ actionType: 'assignment.add', actor: 'system', message: 'Assignment created', details: { assignmentId: newAssignment.id, contentId: newAssignment.contentId } });
    } catch(err) {
      console.error('activity log error', err);
    }
    
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
    try {
      addAction({ actionType: 'assignment.delete', actor: 'system', message: 'Assignment deleted', details: { assignmentId } });
    } catch(err) {
      console.error('activity log error', err);
    }
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
