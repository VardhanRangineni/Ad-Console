import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { mockBackend } from '../../services/mockBackend';
import { mockWebSocket } from '../../services/mockWebSocket';
import SlideshowPlayer from '../../components/SlideshowPlayer/SlideshowPlayer';
import './DisplayPlayer.css';

function DisplayPlayer() {
  const { deviceId } = useParams();
  const [device, setDevice] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaired, setIsPaired] = useState(false);

  const loadPlaylist = useCallback((devId) => {
    console.log('Loading playlist for device:', devId);
    const assignments = mockBackend.getDeviceContent(devId);
    console.log('Assignments:', assignments);
    
    const customContentStr = localStorage.getItem('customContent');
    const customContent = customContentStr ? JSON.parse(customContentStr) : [];
    
    console.log('All content available:', customContent);
    
    const contentList = assignments.map(a => {
      const content = customContent.find(c => c.id === a.contentId);
      console.log(`Finding content ${a.contentId}:`, content);
      return content;
    }).filter(Boolean);
    
    console.log('Final playlist:', contentList);
    setPlaylist(contentList);
  }, []);

  useEffect(() => {
    const storedDevice = mockBackend.getDevice(deviceId);
    
    if (storedDevice && storedDevice.storeId) {
      setDevice(storedDevice);
      setIsPaired(true);
      loadPlaylist(deviceId);
      
      mockWebSocket.connect(deviceId);
      
      mockWebSocket.subscribe('contentUpdate', () => {
        console.log('Content update received, reloading playlist');
        loadPlaylist(deviceId);
      });

      const heartbeatInterval = setInterval(() => {
        mockBackend.updateDeviceHeartbeat(deviceId);
      }, 30000);

      return () => clearInterval(heartbeatInterval);
    } else if (storedDevice) {
      setDevice(storedDevice);
      setIsPaired(false);
    } else {
      const newDevice = mockBackend.registerDevice({
        id: deviceId,
        name: `Display ${deviceId}`,
        orientation: 'horizontal'
      });
      setDevice(newDevice);
      setIsPaired(false);
    }
  }, [deviceId, loadPlaylist]);

  useEffect(() => {
    if (playlist.length === 0) return;

    const currentContent = playlist[currentIndex];
    
    // For slideshows, calculate total duration
    let duration = currentContent.duration * 1000;
    if (currentContent.type === 'slideshow' && currentContent.slides) {
      duration = currentContent.duration * currentContent.slides.length * 1000;
    }

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % playlist.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, playlist]);

  if (!device) {
    return (
      <div className="loading-screen">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isPaired) {
    return (
      <div className="pairing-screen">
        <div className="pairing-container">
          <i className="bi bi-display" style={{ fontSize: '5rem' }}></i>
          <h1>Digital Signage Display</h1>
          <div className="pairing-code">
            <h2>Pairing Code</h2>
            <div className="code-display">{device.pairingCode}</div>
          </div>
          <p>Enter this code in the Admin Console to pair this display</p>
          <small className="text-muted">Device ID: {deviceId}</small>
          <div className="mt-4">
            <p className="text-warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              This device is not linked to any store location
            </p>
            <p className="small">Please link this device to a store in the Device Management page</p>
          </div>
        </div>
      </div>
    );
  }

  if (playlist.length === 0) {
    return (
      <div className="no-content-screen">
        <div className="no-content-container">
          <i className="bi bi-display" style={{ fontSize: '5rem' }}></i>
          <h2>No Content Assigned</h2>
          <p>Waiting for content from HQ...</p>
          <small className="text-muted">Device: {device.name}</small>
          <small className="text-muted d-block mt-2">Linked to Store ID: {device.storeId}</small>
          <div className="mt-3">
            <div className="spinner-border spinner-border-sm text-light me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            Checking for updates...
          </div>
        </div>
      </div>
    );
  }

  const currentContent = playlist[currentIndex];

  return (
    <div className={`display-player ${device.orientation}`}>
      {currentContent.type === 'slideshow' && currentContent.slides ? (
        <SlideshowPlayer 
          slides={currentContent.slides}
          duration={currentContent.duration}
        />
      ) : currentContent.type === 'video' ? (
        <video
          key={currentContent.id}
          src={currentContent.fileUrl}
          autoPlay
          muted
          loop={false}
          className="content-display"
        />
      ) : (
        <img
          key={currentContent.id}
          src={currentContent.fileUrl}
          alt={currentContent.title}
          className="content-display"
        />
      )}
      
      <div className="debug-info">
        <small>
          {currentIndex + 1}/{playlist.length} - {currentContent.title}
          {currentContent.custom && <span className="ms-2 badge bg-success">Custom</span>}
          {currentContent.slideCount && <span className="ms-2 badge bg-info">{currentContent.slideCount} slides</span>}
        </small>
      </div>
    </div>
  );
}

export default DisplayPlayer;
