import React from 'react';
import { Form } from 'react-bootstrap';
import { mockLocations } from '../../data/mockLocations';
import './LocationSelector.css';

function LocationSelector({ onSelect, selectedLocation }) {
  const [expanded, setExpanded] = React.useState({});

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderLocationTree = (location, level = 0) => {
    const hasChildren = location.children && location.children.length > 0;
    const isExpanded = expanded[location.id];
    const isSelected = selectedLocation?.id === location.id;

    return (
      <div key={location.id} style={{ marginLeft: `${level * 20}px` }}>
        <div 
          className={`location-item ${isSelected ? 'selected' : ''}`}
          onClick={() => onSelect(location)}
        >
          {hasChildren && (
            <i 
              className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} me-2`}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(location.id);
              }}
              style={{ cursor: 'pointer' }}
            ></i>
          )}
          {!hasChildren && <span className="me-3"></span>}
          
          <i className={`bi ${getLocationIcon(location.type)} me-2`}></i>
          <span className="location-name">{location.name}</span>
          {location.type === 'store' && (
            <span className="ms-2">
              <i className={`bi ${location.orientation === 'horizontal' ? 'bi-phone-landscape' : 'bi-phone'} text-muted`}></i>
            </span>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {location.children.map(child => renderLocationTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getLocationIcon = (type) => {
    switch (type) {
      case 'country': return 'bi-globe';
      case 'state': return 'bi-map';
      case 'city': return 'bi-building';
      case 'store': return 'bi-shop';
      default: return 'bi-folder';
    }
  };

  return (
    <div className="location-selector">
      <Form.Label className="fw-bold">Select Target Location</Form.Label>
      <div className="location-tree border rounded p-3 bg-white">
        {renderLocationTree(mockLocations)}
      </div>
      {selectedLocation && (
        <div className="mt-2 p-2 bg-light rounded">
          <small className="text-muted">Selected:</small>
          <div className="fw-bold">{selectedLocation.name}</div>
          <small className="text-muted">Type: {selectedLocation.type}</small>
        </div>
      )}
    </div>
  );
}

export default LocationSelector;