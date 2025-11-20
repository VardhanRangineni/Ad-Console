import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';

// Mock services
jest.mock('../../services/indexeddb', () => ({
    getAllContent: jest.fn().mockResolvedValue([{ id: 1, title: 'Video A', type: 'video', duration: 60 }]),
    getDB: jest.fn()
}));

import AssignContent from './AssignContent';

describe('AssignContent Trigger UI', () => {
    test('shows validation and aligns warning under the inputs when Start >= Stop', async () => {
        render(
            <MemoryRouter>
                <AssignContent />
            </MemoryRouter>
        );

        // Wait for content to load and the form to be present
        await waitFor(() => expect(screen.getByLabelText(/Playlist Name/i)).toBeInTheDocument());

        // switch to Trigger-based
        const triggerRadio = screen.getByLabelText(/Trigger-based/i);
        fireEvent.click(triggerRadio);

        // Ensure Trigger Interval input is visible
        expect(screen.getByLabelText(/Trigger Interval/i)).toBeInTheDocument();

        // Set start and stop equal to create invalid state (08:00 AM - 08:00 AM)
        fireEvent.change(screen.getByLabelText('Trigger start hour'), { target: { value: '08' } });
        fireEvent.change(screen.getByLabelText('Trigger start minute'), { target: { value: '00' } });
        fireEvent.change(screen.getByLabelText('Trigger start AM/PM'), { target: { value: 'AM' } });

        fireEvent.change(screen.getByLabelText('Trigger stop hour'), { target: { value: '08' } });
        fireEvent.change(screen.getByLabelText('Trigger stop minute'), { target: { value: '00' } });
        fireEvent.change(screen.getByLabelText('Trigger stop AM/PM'), { target: { value: 'AM' } });

        // Wait for validation error to appear
        const err = await screen.findByText(/Start time must be earlier than Stop/i);
        expect(err).toBeInTheDocument();

        // The error should be inside a row/col structure (we used "row" and "col-3/col-9")
        const row = err.closest('.row');
        expect(row).not.toBeNull();
        // Ensure the create button is disabled
        const button = screen.getByRole('button', { name: /create playlist/i });
        expect(button).toBeDisabled();

        // Ensure the error is in the same column as the input controls
        const startControlCol = screen.getByLabelText('Trigger start hour').closest('.col-9');
        const errCol = err.closest('.col-9');
        expect(startControlCol).not.toBeNull();
        expect(errCol).not.toBeNull();
        expect(startControlCol).toBe(errCol);
    });
});

export {};
