import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AsideBar from './components/common/AsideBar/AsideBar';
import Dashboard from './pages/Dashboard/Dashboard';
import ContentLibrary from './pages/ContentLibrary/ContentLibrary';
import AssignContent from './pages/AssignContent/AssignContent';
import ManagePlaylists from './pages/ManagePlaylists/ManagePlaylists';
import DisplayPlayer from './pages/DisplayPlayer/DisplayPlayer';
import DeviceManagement from './pages/DeviceManagement/DeviceManagement';
import DeviceStoreMapping from './pages/DeviceStoreMapping/DeviceStoreMapping';
import './App.css';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Display Player Route - No Navbar */}
            <Route path="/display/:deviceId" element={<DisplayPlayer />} />
            
            {/* Admin Routes - With Navbar */}
            <Route path="*" element={
              <>
                <AsideBar />
                <div style={{ marginLeft: 'var(--aside-width, 220px)', transition: 'margin-left 0.2s' }} className="container-fluid mt-4 main-content-area">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/content" element={<ContentLibrary />} />
                    <Route path="/assign" element={<AssignContent />} />
                    <Route path="/manage-playlists" element={<ManagePlaylists />} />
                    {/* Monitor page removed - route deleted */}
                    <Route path="/devices" element={<DeviceManagement />} />
                    <Route path="/settings" element={<DeviceStoreMapping />} />
                  </Routes>
                </div>
              </>
            } />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
