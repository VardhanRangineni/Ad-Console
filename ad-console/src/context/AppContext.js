import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { mockBackend } from '../services/mockBackend';
import { mockWebSocket } from '../services/mockWebSocket';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [devices, setDevices] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);

  const loadDevices = useCallback(() => {
    setDevices(mockBackend.getAllDevices());
  }, []);

  const loadAssignments = useCallback(() => {
    setAssignments(mockBackend.getAllAssignments());
  }, []);

  const handleContentUpdate = useCallback((data) => {
    console.log('Content updated:', data);
    loadAssignments();
  }, [loadAssignments]);

  const handleDeviceUpdate = useCallback((data) => {
    console.log('Devices updated:', data);
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    loadDevices();
    loadAssignments();

    mockWebSocket.subscribe('contentUpdate', handleContentUpdate);
    mockWebSocket.subscribe('deviceUpdate', handleDeviceUpdate);

    return () => {
      // Cleanup if needed
    };
  }, [handleContentUpdate, handleDeviceUpdate, loadDevices, loadAssignments]);

  const registerDevice = useCallback((deviceData) => {
    const device = mockBackend.registerDevice(deviceData);
    loadDevices();
    return device;
  }, [loadDevices]);

  const addAssignment = useCallback((assignment) => {
    mockBackend.addAssignment(assignment);
    loadAssignments();
  }, [loadAssignments]);

  const deleteAssignment = useCallback((id) => {
    mockBackend.deleteAssignment(id);
    loadAssignments();
  }, [loadAssignments]);

  const deleteDevice = useCallback((id) => {
    mockBackend.deleteDevice(id);
    loadDevices();
  }, [loadDevices]);

  return (
    <AppContext.Provider value={{
      devices,
      assignments,
      registerDevice,
      addAssignment,
      deleteAssignment,
      deleteDevice,
      selectedLocation,
      setSelectedLocation,
      selectedContent,
      setSelectedContent
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
