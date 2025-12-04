import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

import { mockWebSocket } from '../services/mockWebSocket';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // State management
  const [devices, setDevices] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [bulkAssignContent, setBulkAssignContent] = useState([]);

  // Load devices from backend
  const loadDevices = useCallback(async () => {
    // const deviceList = await mockBackend.getAllDevices();
    const deviceList = [];
    setDevices(deviceList || []);
  }, []);

  // Load assignments from backend
  const loadAssignments = useCallback(async () => {
    // const assignmentList = await mockBackend.getAllAssignments();
    const assignmentList = [];
    setAssignments(assignmentList || []);
  }, []);

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

  // Initialize on mount
  useEffect(() => {
    // Load initial data
    (async () => { await loadDevices(); await loadAssignments(); })();

    // Subscribe to WebSocket events for real-time updates
    mockWebSocket.subscribe('contentUpdate', handleContentUpdate);
    mockWebSocket.subscribe('deviceUpdate', handleDeviceUpdate);

    // Cleanup function
    return () => {
      // Cleanup subscriptions if needed
    };
  }, [handleContentUpdate, handleDeviceUpdate, loadDevices, loadAssignments]);

  // Register a new device
  const registerDevice = useCallback(async (deviceData) => {
    // const device = await mockBackend.registerDevice(deviceData);
    const device = { ...deviceData, id: Date.now() }; // Mock ID
    await loadDevices();
    return device;
  }, [loadDevices]);

  // Add a new content assignment
  const addAssignment = useCallback(async (assignment) => {
    // await mockBackend.addAssignment(assignment);
    await loadAssignments();
  }, [loadAssignments]);

  // Delete an assignment
  const deleteAssignment = useCallback(async (id) => {
    // await mockBackend.deleteAssignment(id);
    await loadAssignments();
  }, [loadAssignments]);

  // Delete a device
  const deleteDevice = useCallback(async (id) => {
    // await mockBackend.deleteDevice(id);
    await loadDevices();
  }, [loadDevices]);

  // Context value object
  const contextValue = {
    // State
    devices,
    assignments,
    selectedLocation,
    selectedContent,
    bulkAssignContent,

    // State setters
    setSelectedLocation,
    setSelectedContent,
    setBulkAssignContent,

    // Actions
    registerDevice,
    addAssignment,
    deleteAssignment,
    deleteDevice,
    loadDevices,
    loadAssignments
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the App context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

// Export the context itself (optional, for advanced use cases)
export default AppContext;
