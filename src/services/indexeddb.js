// IndexedDB helper for content and images using idb
import { openDB } from 'idb';
import { addAction } from './activityLog';

const DB_NAME = 'ad-console-db';
const DB_VERSION = 3;
const CONTENT_STORE = 'content';
const DEVICE_STORE = 'devices';
const PLAYLIST_STORE = 'playlists';

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(CONTENT_STORE)) {
        db.createObjectStore(CONTENT_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(DEVICE_STORE)) {
        db.createObjectStore(DEVICE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PLAYLIST_STORE)) {
        db.createObjectStore(PLAYLIST_STORE, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function addContent(content) {
  const db = await getDB();
  const id = await db.add(CONTENT_STORE, content);
  try {
    addAction({ actionType: 'content.add', actor: 'system', message: 'Content added', details: { contentId: id } });
  } catch (err) {
    console.error('activity log error', err);
  }
  return id;
}

export async function getAllContent() {
  const db = await getDB();
  return db.getAll(CONTENT_STORE);
}

export async function updateContent(content) {
  const db = await getDB();
  const res = await db.put(CONTENT_STORE, content);
  try {
    addAction({ actionType: 'content.update', actor: 'system', message: 'Content updated', details: { contentId: content.id } });
  } catch (err) {
    console.error('activity log error', err);
  }
  return res;
}

export async function deleteContent(id) {
  const db = await getDB();
  const res = await db.delete(CONTENT_STORE, id);
  try {
    addAction({ actionType: 'content.delete', actor: 'system', message: 'Content deleted', details: { contentId: id } });
  } catch (err) {
    console.error('activity log error', err);
  }
  return res;
}

// Playlists helpers
export async function addPlaylist(playlist) {
  const db = await getDB();
  const id = await db.add(PLAYLIST_STORE, playlist);
  try {
    addAction({ actionType: 'playlist.add', actor: 'system', message: 'Playlist added', details: { playlistId: id } });
  } catch (err) {
    console.error('activity log error', err);
  }
  return id;
}

export async function getAllPlaylists() {
  const db = await getDB();
  if (!db.objectStoreNames.contains(PLAYLIST_STORE)) return [];
  return db.getAll(PLAYLIST_STORE);
}

export async function updatePlaylist(playlist) {
  const db = await getDB();
  const res = await db.put(PLAYLIST_STORE, playlist);
  try {
    addAction({ actionType: 'playlist.update', actor: 'system', message: 'Playlist updated', details: { playlistId: playlist.id } });
  } catch (err) {
    console.error('activity log error', err);
  }
  return res;
}

export async function deletePlaylist(id) {
  const db = await getDB();
  const res = await db.delete(PLAYLIST_STORE, id);
  try {
    addAction({ actionType: 'playlist.delete', actor: 'system', message: 'Playlist deleted', details: { playlistId: id } });
  } catch (err) {
    console.error('activity log error', err);
  }
  return res;
}
