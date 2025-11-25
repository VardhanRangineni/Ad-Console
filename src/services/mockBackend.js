import { addAction } from './activityLog';
import { addDevice as addDeviceDB, getAllDevices as getAllDevicesDB, deleteDeviceById as deleteDeviceByIdDB, updateDevice as updateDeviceDB } from './deviceIndexeddb';
import { addAssignment as addAssignmentDB, getAllAssignments as getAllAssignmentsDB, deleteAssignment as deleteAssignmentDB } from './deviceIndexeddb';
import { addContent, getAllContent, addPlaylist, getAllPlaylists } from './indexeddb';

class MockBackend {
  constructor() {
    this.init();
  }

  init() {
    // If no devices in IndexedDB, ensure stores exist - seed data can be added here if needed
    (async () => {
      try {
        const devices = await getAllDevicesDB();
        if (!devices || devices.length === 0) {
          // Seed no devices by default; can seed sample devices here if needed
        }
        const content = await getAllContent();
        const playlists = await getAllPlaylists();
        const assignments = await getAllAssignmentsDB();

        // Seed minimal content and playlists for dev/demo if DB is empty
        let createdIds = [];
        if (!content || content.length === 0) {
          const seeded = [
            { title: 'Welcome Slide', active: true, type: 'image', url: 'welcome.jpg' },
            { title: 'Promo A', active: true, type: 'image', url: 'promo-a.jpg' },
            { title: 'Promo B', active: true, type: 'image', url: 'promo-b.jpg' },
            { title: 'Demo Video', active: true, type: 'video', url: 'demo.mp4' }
          ];
          // createdIds already declared above
          for (const c of seeded) {
            const id = await addContent(c);
            createdIds.push(id);
          }
          // seed 1 playlist and assignments referencing created content
          if (!playlists || playlists.length === 0) {
            const playlist = { playlistName: 'Demo Playlist', status: 'approved', selectedContent: createdIds.slice(0, 3), startDate: new Date().toISOString(), endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString() };
            await addPlaylist(playlist);
          }
          // After seeding content and playlist, if assignments empty then seed them using createdIds
        }

        // If assignments are empty, seed demo assignments based on available content ids
        if (!assignments || assignments.length === 0) {
          // If content already existed (not seeded), pick the first few IDs
          if (!createdIds || createdIds.length === 0) {
            createdIds = (content || []).map(c => c.id).filter(Boolean).slice(0, 3);
          }
          if (createdIds.length > 0) {
            // Add assignments using created content ids mapping
            const now = new Date();
            // For demo: assign first 3 pieces to sample locations
            const demoAssignments = createdIds.slice(0, 3).map((cid, idx) => {
              const storeOptions = [
                { storeId: 5, name: 'Store LA-01' },
                { storeId: 8, name: 'Store SF-01' },
                { storeId: 3, name: 'California (All Stores)' }
              ];
              const store = storeOptions[idx] || storeOptions[0];
              const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              return { assignmentId: `demo-${Date.now()}-${idx+1}`, contentId: cid, locationId: store.storeId, locationName: store.name, startDate: start.toISOString(), endDate: new Date(now.getTime() + ((idx + 1) * 10 + 4) * 24 * 60 * 60 * 1000).toISOString(), orientation: idx === 2 ? 'both' : 'horizontal' };
            });
            for (const a of demoAssignments) {
              await addAssignmentDB(a);
              // dispatch event so UI updates immediately
              window.dispatchEvent(new CustomEvent('contentUpdate', { detail: { assignment: a } }));
            }
          }
        }
      } catch (err) {
        console.warn('Mock backend DB seed error', err);
      }
    })();
  }

  async registerDevice(deviceData) {
    const newDevice = {
      id: deviceData.id || Date.now().toString(),
      pairingCode: this.generatePairingCode(),
      status: 'online',
      lastHeartbeat: new Date().toISOString(),
      ...deviceData
    };
    try {
      await addDeviceDB(newDevice);
      // Dispatch storage-like event for consumers that listen to 'storage' updates
      window.dispatchEvent(new StorageEvent('storage', { key: 'devices', newValue: JSON.stringify(await getAllDevicesDB()) }));
      addAction({ actionType: 'device.add', actor: 'system', message: 'Device registered', details: { deviceId: newDevice.id } });
    } catch (err) {
      console.error('Error registering device to DB', err);
    }
    return newDevice;
  }

  async getDevice(deviceId) {
    const devices = await getAllDevicesDB();
    return devices.find(d => d.id === deviceId);
  }

  async getAllDevices() {
    return await getAllDevicesDB();
  }

  async deleteDevice(deviceId) {
    await deleteDeviceByIdDB(deviceId);
    window.dispatchEvent(new StorageEvent('storage', { key: 'devices', newValue: JSON.stringify(await getAllDevicesDB()) }));
    try { addAction({ actionType: 'device.delete', actor: 'system', message: 'Device removed', details: { deviceId } }); } catch(err) { console.error('activity log error', err); }
  }

  async updateDeviceHeartbeat(deviceId) {
    const devices = await getAllDevicesDB();
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      device.lastHeartbeat = new Date().toISOString();
      device.status = 'online';
      await updateDeviceDB(device);
    }
  }

  async getDeviceContent(deviceId) {
    const assignments = await getAllAssignmentsDB();
    const device = await this.getDevice(deviceId);
    if (!device || !device.storeId) return [];
    return assignments.filter(a => a.locationId === device.storeId || this.isParentLocation(a.locationId, device.storeId));
  }

  async addAssignment(assignment) {
    const newAssignment = await addAssignmentDB(assignment);
    window.dispatchEvent(new CustomEvent('contentUpdate', { detail: { assignment: newAssignment } }));
    try { addAction({ actionType: 'assignment.add', actor: 'system', message: 'Assignment created', details: { assignmentId: newAssignment.assignmentId, contentId: newAssignment.contentId } }); } catch (err) { console.error('activity log error', err); }
    return newAssignment;
  }

  async getAllAssignments() {
    return await getAllAssignmentsDB();
  }

  async deleteAssignment(assignmentId) {
    await deleteAssignmentDB(assignmentId);
    window.dispatchEvent(new CustomEvent('contentUpdate', { detail: { deleted: assignmentId } }));
    try { addAction({ actionType: 'assignment.delete', actor: 'system', message: 'Assignment deleted', details: { assignmentId } }); } catch(err) { console.error('activity log error', err); }
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
