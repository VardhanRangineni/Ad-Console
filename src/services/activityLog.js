// src/services/activityLog.js
// Simple activity log stored in localStorage

const STORAGE_KEY = 'activityLog';
const DEFAULT_MAX = 200;

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addAction({ actionType, actor = 'system', message = '', details = {} }) {
  try {
    const log = loadAll();
    const entry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      actionType,
      actor,
      message,
      details
    };
    log.push(entry);
    // Keep only the last DEFAULT_MAX entries
    const truncated = log.slice(-DEFAULT_MAX);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(truncated));
    // Dispatch a custom event so other tabs/components can react
    window.dispatchEvent(new CustomEvent('activityLogUpdate', { detail: entry }));
    return entry;
  } catch (err) {
    console.error('Failed to add activity log entry', err);
    return null;
  }
}

export function getRecentActions(limit = 15) {
  const log = loadAll();
  // Return newest first
  return log.slice().reverse().slice(0, limit);
}

const activityLog = {
  addAction,
  getRecentActions
};

export default activityLog;
