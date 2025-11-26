import React from 'react';
import { render, screen } from '@testing-library/react';
import KpiCard from './KpiCard';

test('renders KPI card with title, left and right content and headers and header info', () => {
  render(<KpiCard title="Test KPI" left={{ main: 5, subItems: ['A', 'B'], label: 'Left Label' }} right={{ main: 10, header: 'Right Header', info: 'Tooltip content' }} bgClass="bg-primary" />);
  expect(screen.getByText('Test KPI')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
  expect(screen.getByText('10')).toBeInTheDocument();
  expect(screen.getByText('A')).toBeInTheDocument();
  expect(screen.getByText('B')).toBeInTheDocument();
  expect(screen.getByText('Left Label')).toBeInTheDocument();
  expect(screen.getByText('Right Header')).toBeInTheDocument();
  // Header info icon should be present
  expect(document.querySelector('.kpi-header-icon')).toBeTruthy();
});
