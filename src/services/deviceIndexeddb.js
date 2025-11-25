import { openDB } from 'idb';
import { storeList } from '../data/storeList';
import { mockLocations } from '../data/mockLocations';

const DB_NAME = 'ad-console-db';
const DB_VERSION = 3;

const DEVICE_STORE = 'devices';
const CONTENT_STORE = 'content';
const ASSIGNMENT_STORE = 'assignments';

export async function getDeviceDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(DEVICE_STORE)) {
        db.createObjectStore(DEVICE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CONTENT_STORE)) {
        db.createObjectStore(CONTENT_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(ASSIGNMENT_STORE)) {
        db.createObjectStore(ASSIGNMENT_STORE, { keyPath: 'assignmentId' });
      }
    },
  });
}

// Assignment CRUD
export async function addAssignment(assignment) {
  const db = await getDeviceDB();
  let enriched = await enrichAssignmentWithState(assignment);
  // Ensure assignmentId exists (keyPath)
  if (!enriched.assignmentId) enriched = { ...enriched, assignmentId: `${Date.now()}-${Math.floor(Math.random() * 10000)}` };
  await db.put(ASSIGNMENT_STORE, enriched);
  return enriched;
}

export async function getAllAssignments() {
  const db = await getDeviceDB();
  const all = await db.getAll(ASSIGNMENT_STORE);
  // Ensure assignments are enriched with state; update DB entries lacking state
  const tx = db.transaction(ASSIGNMENT_STORE, 'readwrite');
  for (const a of all) {
    try {
      const enriched = await enrichAssignmentWithState(a);
      if (enriched && enriched.state && enriched.state !== a.state) {
        tx.store.put(enriched);
      }
    } catch (err) {
      console.error('Error enriching assignment in getAllAssignments', err);
    }
  }
  await tx.done;
  return await db.getAll(ASSIGNMENT_STORE);
}

export async function deleteAssignment(assignmentId) {
  const db = await getDeviceDB();
  return db.delete(ASSIGNMENT_STORE, assignmentId);
}

export async function updateAssignment(assignment) {
  const db = await getDeviceDB();
  const enriched = await enrichAssignmentWithState(assignment);
  await db.put(ASSIGNMENT_STORE, enriched);
  return enriched;
}

export async function bulkAddAssignments(assignments) {
  const db = await getDeviceDB();
  const tx = db.transaction(ASSIGNMENT_STORE, 'readwrite');
  for (const assignment of assignments) {
    const enriched = await enrichAssignmentWithState(assignment);
    tx.store.put(enriched);
  }
  await tx.done;
}

function normalizeState(s) {
  if (!s && s !== 0) return null;
  try {
    return String(s).trim();
  } catch (err) {
    return s;
  }
}

function normalizeId(v) {
  if (v === undefined || v === null) return null;
  try { return String(v).trim(); } catch (err) { return v; }
}

async function enrichAssignmentWithState(assignment) {
  try {
    if (!assignment) return assignment;
    // If it already has state, normalize it and return
    if (assignment.state) {
      const normalized = normalizeState(assignment.state);
      if (normalized && normalized !== assignment.state) {
        return { ...assignment, state: normalized };
      }
      return assignment;
    }
    const storeById = new Map(storeList.map(s => [normalizeId(s.id), s]));
    // build mockStoreId->state map
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

    const sidRaw = assignment.locationId || assignment.storeId || assignment.storeIdInput || assignment.store;
    const sid = sidRaw !== undefined && sidRaw !== null ? normalizeId(sidRaw) : null;
    let state = null;
      if (sid) {
      const s = storeById.get(normalizeId(String(sid)));
      if (s && s.state) state = s.state;
      else if (mockStoreIdToState.has(String(sid))) state = mockStoreIdToState.get(String(sid));
    }
    if (!state && assignment.locationName) {
      const findByName = storeList.find(s => s.name === assignment.locationName || s.name === (assignment.locationName || '').trim());
      if (findByName && findByName.state) state = findByName.state;
    }
    if (state) return { ...assignment, state: normalizeState(state) };
    return assignment;
  } catch (err) {
    console.error('Error enriching assignment state', err);
    return assignment;
  }
}

export async function addDevice(device) {
  const db = await getDeviceDB();
  return db.add(DEVICE_STORE, device);
}

export async function getAllDevices() {
  const db = await getDeviceDB();
  return db.getAll(DEVICE_STORE);
}

export async function updateDevice(device) {
  const db = await getDeviceDB();
  return db.put(DEVICE_STORE, device);
}

export async function deleteDeviceById(id) {
  const db = await getDeviceDB();
  return db.delete(DEVICE_STORE, id);
}
