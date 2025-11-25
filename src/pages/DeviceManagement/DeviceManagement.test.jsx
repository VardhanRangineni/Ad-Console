import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';

// Mock deviceIndexeddb services used by DeviceManagement
jest.mock('../../services/deviceIndexeddb', () => ({
  getAllAssignments: jest.fn().mockResolvedValue([]),
  getAllDevices: jest.fn().mockResolvedValue([
    { id: 'dev-1', name: 'Device 1', orientation: 'horizontal', resolution: { width: 1920, height: 1080 } }
  ]),
  deleteAssignment: jest.fn(),
  bulkAddAssignments: jest.fn(),
  addDevice: jest.fn(),
  updateDevice: jest.fn(),
  deleteDeviceById: jest.fn()
}));

import DeviceManagement from './DeviceManagement';

describe('DeviceManagement Orientation Display', () => {
  test('shows text-based orientation in device list instead of radio inputs', async () => {
    render(
      <MemoryRouter>
        <DeviceManagement />
      </MemoryRouter>
    );

    // Wait for table to be present
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

    // Ensure the orientation label 'Landscape' shows for the mocked device
    expect(screen.getByText(/Landscape/i)).toBeInTheDocument();
  });
});

export {};
