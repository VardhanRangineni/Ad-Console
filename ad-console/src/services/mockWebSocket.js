// src/services/mockWebSocket.js

class MockWebSocket {
  constructor() {
    this.listeners = new Map();
    this.connected = false;
    
    // Listen to localStorage changes across tabs/windows
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    window.addEventListener('contentUpdate', this.handleContentUpdate.bind(this));
  }

  connect(deviceId) {
    this.deviceId = deviceId;
    this.connected = true;
    
    // Simulate connection delay
    setTimeout(() => {
      this.emit('connect', { deviceId });
      console.log(`[MockWebSocket] Connected for device: ${deviceId}`);
    }, 500);
  }

  disconnect() {
    this.connected = false;
    this.emit('disconnect');
    console.log('[MockWebSocket] Disconnected');
  }

  subscribe(topic, callback) {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, []);
    }
    this.listeners.get(topic).push(callback);
    console.log(`[MockWebSocket] Subscribed to: ${topic}`);
  }

  unsubscribe(topic, callback) {
    if (this.listeners.has(topic)) {
      const callbacks = this.listeners.get(topic);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(topic, data) {
    const callbacks = this.listeners.get(topic);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[MockWebSocket] Error in callback for ${topic}:`, error);
        }
      });
    }
  }

  handleStorageChange(event) {
    // This fires when localStorage changes in OTHER tabs
    if (event.key === 'assignments') {
      console.log('[MockWebSocket] Assignments changed in another tab');
      this.emit('contentUpdate', {
        message: 'Content assignments updated',
        data: JSON.parse(event.newValue || '[]')
      });
    }
    
    if (event.key === 'devices') {
      console.log('[MockWebSocket] Devices changed in another tab');
      this.emit('deviceUpdate', {
        message: 'Device list updated',
        data: JSON.parse(event.newValue || '[]')
      });
    }
  }

  handleContentUpdate(event) {
    // This fires for custom events within the same tab
    console.log('[MockWebSocket] Content update event:', event.detail);
    this.emit('contentUpdate', event.detail);
  }

  // Simulate sending messages to server
  send(topic, data) {
    console.log(`[MockWebSocket] Sending to ${topic}:`, data);
    // In real implementation, this would send to Spring Boot WebSocket
  }
}

export const mockWebSocket = new MockWebSocket();
