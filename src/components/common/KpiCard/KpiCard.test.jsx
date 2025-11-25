import React from 'react';
import { render, screen } from '@testing-library/react';
import KpiCard from './KpiCard';

test('renders KPI card with title, left and right content', () => {
  render(<KpiCard title="Test KPI" left={{ main: 5, sub: 'Left label', subItems: ['A', 'B'] }} right={{ main: 10, sub: 'Right label' }} bgClass="bg-primary" />);
  expect(screen.getByText('Test KPI')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
  expect(screen.getByText('10')).toBeInTheDocument();
  expect(screen.getByText('Left label')).toBeInTheDocument();
  expect(screen.getByText('Right label')).toBeInTheDocument();
});
