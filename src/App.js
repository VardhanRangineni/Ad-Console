import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/common/Navbar/Navbar';
import Dashboard from './pages/Dashboard/Dashboard';
import ContentLibrary from './pages/ContentLibrary/ContentLibrary';
import AssignContent from './pages/AssignContent/AssignContent';
import Monitor from './pages/Monitor/Monitor';
import DisplayPlayer from './pages/DisplayPlayer/DisplayPlayer';
import DeviceManagement from './pages/DeviceManagement/DeviceManagement';
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
                <Navbar />
                <div className="container-fluid mt-4">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/content" element={<ContentLibrary />} />
                    <Route path="/assign" element={<AssignContent />} />
                    <Route path="/monitor" element={<Monitor />} />
                    <Route path="/devices" element={<DeviceManagement />} />
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
