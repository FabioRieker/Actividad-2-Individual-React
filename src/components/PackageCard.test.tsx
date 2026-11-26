import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import type { WarehousePackage } from '../models/package.model';

import { PackageCard } from './PackageCard';

const basePkg: WarehousePackage = {
  id: 'a1b2c3d4-0001',
  trackingCode: 'LTK-0001-ES',
  destinationHub: 'Madrid',
  weightKg: 4.2,
  priority: 'CRITICAL',
  status: 'IN_TRANSIT',
  timestamp: new Date('2026-03-15T10:30:00Z'),
};

// El wrapper de React serializa `true` como atributo vacío y `false` como "false".
function isAriaDisabled(element: HTMLElement): boolean {
  const value = element.getAttribute('aria-disabled');
  return value !== null && value !== 'false';
}

describe('PackageCard', () => {
  test('muestra los datos del paquete y los badges con texto', () => {
    render(<PackageCard pkg={basePkg} onStatusChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'LTK-0001-ES' })).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
    expect(screen.getByText('4,2 kg')).toBeInTheDocument();
    expect(screen.getByText('En tránsito')).toBeInTheDocument();
    expect(screen.getByText('Prioridad')).toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText(/15 mar/)).toBeInTheDocument();
  });

  test('aplica la clase CSS del estado', () => {
    const { container } = render(<PackageCard pkg={{ ...basePkg, status: 'REJECTED' }} onStatusChange={vi.fn()} />);
    expect(container.querySelector('article')).toHaveClass('lt-card--rejected');
    expect(screen.getByText('Rechazado')).toBeInTheDocument();
  });

  test('los botones muestran el texto y su aria-label lo contiene (2.5.3)', () => {
    render(<PackageCard pkg={basePkg} onStatusChange={vi.fn()} />);
    expect(screen.getByLabelText('Inspeccionar LTK-0001-ES')).toHaveTextContent('Inspeccionar');
    expect(screen.getByLabelText('Rechazar LTK-0001-ES')).toHaveTextContent('Rechazar');
  });

  test('los botones tienen aria-label descriptivo con el código', () => {
    render(<PackageCard pkg={basePkg} onStatusChange={vi.fn()} />);
    expect(screen.getByLabelText('Inspeccionar LTK-0001-ES')).toBeInTheDocument();
    expect(screen.getByLabelText('Rechazar LTK-0001-ES')).toBeInTheDocument();
  });

  test('emite INSPECTED al pulsar el botón de inspeccionar', () => {
    const onStatusChange = vi.fn();
    render(<PackageCard pkg={basePkg} onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByLabelText(/^Inspeccionar /));
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith({ id: 'a1b2c3d4-0001', newStatus: 'INSPECTED' });
  });

  test('emite REJECTED al pulsar el botón de rechazar', () => {
    const onStatusChange = vi.fn();
    render(<PackageCard pkg={basePkg} onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByLabelText(/^Rechazar /));
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith({ id: 'a1b2c3d4-0001', newStatus: 'REJECTED' });
  });

  test('marca con aria-disabled el botón del estado actual', () => {
    const { unmount } = render(<PackageCard pkg={{ ...basePkg, status: 'INSPECTED' }} onStatusChange={vi.fn()} />);
    expect(isAriaDisabled(screen.getByLabelText(/^Inspeccionar /))).toBe(true);
    expect(isAriaDisabled(screen.getByLabelText(/^Rechazar /))).toBe(false);

    unmount();
    render(<PackageCard pkg={{ ...basePkg, status: 'REJECTED' }} onStatusChange={vi.fn()} />);
    expect(isAriaDisabled(screen.getByLabelText(/^Rechazar /))).toBe(true);
    expect(isAriaDisabled(screen.getByLabelText(/^Inspeccionar /))).toBe(false);
  });

  test('no emite eventos desde un botón con aria-disabled', () => {
    const onStatusChange = vi.fn();
    render(<PackageCard pkg={{ ...basePkg, status: 'INSPECTED' }} onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByLabelText(/^Inspeccionar /));
    expect(onStatusChange).not.toHaveBeenCalled();
  });
});
