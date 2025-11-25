// Minimal mock locations tree used for demo and mapping store IDs to state names.
// This file provides a simplified tree so that components like LocationSelector
// and deviceIndexeddb can map numeric or small demo store IDs to states.
export const mockLocations = {
  id: 'IN',
  name: 'India',
  type: 'country',
  children: [
    {
      id: 'TN',
      name: 'Telangana',
      type: 'state',
      children: [
        { id: '5', name: 'Store LA-01', type: 'store' },
      ],
    },
    {
      id: 'AP',
      name: 'Andhra Pradesh',
      type: 'state',
      children: [
        { id: '3', name: 'California (All Stores)', type: 'store' },
      ],
    },
    {
      id: 'KA',
      name: 'Karnataka',
      type: 'state',
      children: [
        { id: '8', name: 'Store SF-01', type: 'store' },
      ],
    },
  ],
};
