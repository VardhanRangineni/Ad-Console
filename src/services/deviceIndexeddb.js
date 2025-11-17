import { openDB } from 'idb';

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
  return db.put(ASSIGNMENT_STORE, assignment);
}

export async function getAllAssignments() {
  const db = await getDeviceDB();
  return db.getAll(ASSIGNMENT_STORE);
}

export async function deleteAssignment(assignmentId) {
  const db = await getDeviceDB();
  return db.delete(ASSIGNMENT_STORE, assignmentId);
}

export async function updateAssignment(assignment) {
  const db = await getDeviceDB();
  return db.put(ASSIGNMENT_STORE, assignment);
}

export async function bulkAddAssignments(assignments) {
  const db = await getDeviceDB();
  const tx = db.transaction(ASSIGNMENT_STORE, 'readwrite');
  for (const assignment of assignments) {
    tx.store.put(assignment);
  }
  await tx.done;
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
