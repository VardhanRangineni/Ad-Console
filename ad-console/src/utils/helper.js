// Helper functions for the app

export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  export const getLocationPath = (location) => {
    // Returns full path like "USA > California > Los Angeles > Store LA-01"
    const path = [];
    let current = location;
    while (current) {
      path.unshift(current.name);
      current = current.parent; // You'd need to add parent references
    }
    return path.join(' > ');
  };
  
  export const filterLocationsByType = (location, type, results = []) => {
    if (location.type === type) {
      results.push(location);
    }
    if (location.children) {
      location.children.forEach(child => 
        filterLocationsByType(child, type, results)
      );
    }
    return results;
  };
  
  export const countLocationsByType = (location, type) => {
    return filterLocationsByType(location, type).length;
  };
  