import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { mockWebSocket } from '../services/mockWebSocket';

// Create context with default value for better TypeScript support
const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  const [devices, setDevices] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [bulkAssignContent, setBulkAssignContent] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ========================================
  // DATA LOADING FUNCTIONS
  // ========================================

  // Load devices from backend
  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // TODO: Replace with actual API call
      // const deviceList = await mockBackend.getAllDevices();
      const deviceList = [];
      setDevices(deviceList);
    } catch (err) {
      console.error('Failed to load devices:', err);
      setError('Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load assignments from backend
  const loadAssignments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // TODO: Replace with actual API call
      // const assignmentList = await mockBackend.getAllAssignments();
      const assignmentList = [];
      setAssignments(assignmentList);
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setError('Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ========================================
  // WEBSOCKET EVENT HANDLERS
  // ========================================

  // Handle content update events
  const handleContentUpdate = useCallback((data) => {
    console.log('Content updated:', data);
    loadAssignments();
  }, [loadAssignments]);

  // Handle device update events
  const handleDeviceUpdate = useCallback((data) => {
    console.log('Devices updated:', data);
    loadDevices();
  }, [loadDevices]);

  // ========================================
  // CRUD OPERATIONS
  // ========================================

  // Register a new device
  const registerDevice = useCallback(async (deviceData) => {
    try {
      setIsLoading(true);
      setError(null);
      // TODO: Replace with actual API call
      // const device = await mockBackend.registerDevice(deviceData);
      const device = {
        ...deviceData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
      };
      await loadDevices();
      return device;
    } catch (err) {
      console.error('Failed to register device:', err);
      setError('Failed to register device');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadDevices]);

  // Add a new content assignment
  const addAssignment = useCallback(async (assignment) => {
    try {
      setIsLoading(true);
      setError(null);
      // TODO: Replace with actual API call
      // await mockBackend.addAssignment(assignment);
      await loadAssignments();
    } catch (err) {
      console.error('Failed to add assignment:', err);
      setError('Failed to add assignment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadAssignments]);

  // Delete an assignment
  const deleteAssignment = useCallback(async (id) => {
    try {
      setIsLoading(true);
      setError(null);
      // TODO: Replace with actual API call
      // await mockBackend.deleteAssignment(id);
      await loadAssignments();
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      setError('Failed to delete assignment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadAssignments]);

  // Delete a device
  const deleteDevice = useCallback(async (id) => {
    try {
      setIsLoading(true);
      setError(null);
      // TODO: Replace with actual API call
      // await mockBackend.deleteDevice(id);
      await loadDevices();
    } catch (err) {
      console.error('Failed to delete device:', err);
      setError('Failed to delete device');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadDevices]);

  // ========================================
  // INITIALIZATION
  // ========================================

  useEffect(() => {
    // Load initial data
    const initializeData = async () => {
      await Promise.all([
        loadDevices(),
        loadAssignments(),
      ]);
    };

    initializeData();

    // Subscribe to WebSocket events for real-time updates
    mockWebSocket.subscribe('contentUpdate', handleContentUpdate);
    mockWebSocket.subscribe('deviceUpdate', handleDeviceUpdate);

    // Cleanup subscriptions on unmount
    return () => {
      mockWebSocket.unsubscribe('contentUpdate', handleContentUpdate);
      mockWebSocket.unsubscribe('deviceUpdate', handleDeviceUpdate);
    };
  }, [handleContentUpdate, handleDeviceUpdate, loadDevices, loadAssignments]);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const contextValue = {
    // State
    devices,
    assignments,
    selectedLocation,
    selectedContent,
    bulkAssignContent,
    isLoading,
    error,

    // State setters
    setSelectedLocation,
    setSelectedContent,
    setBulkAssignContent,
    setError,

    // Actions
    registerDevice,
    addAssignment,
    deleteAssignment,
    deleteDevice,
    loadDevices,
    loadAssignments,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// ========================================
// CUSTOM HOOK
// ========================================

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export default AppContext;
