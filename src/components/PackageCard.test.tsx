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

describe('PackageCard', () => {
  test('muestra los datos del paquete y los badges con texto', () => {
    render(<PackageCard pkg={basePkg} onStatusChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'LTK-0001-ES' })).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
    expect(screen.getByText('4,2 kg')).toBeInTheDocument();
    expect(screen.getByText('En tránsito')).toBeInTheDocument();
    expect(screen.getByText('Prioridad alta')).toBeInTheDocument();
    expect(screen.getByText(/15\/3\/26|15\/03\/26/)).toBeInTheDocument();
  });

  test('aplica la clase CSS del estado', () => {
    const { container } = render(<PackageCard pkg={{ ...basePkg, status: 'REJECTED' }} onStatusChange={vi.fn()} />);
    expect(container.querySelector('article')).toHaveClass('lt-card--rejected');
    expect(screen.getByText('Rechazado')).toBeInTheDocument();
  });

  test('los botones tienen aria-label descriptivo con el código', () => {
    render(<PackageCard pkg={basePkg} onStatusChange={vi.fn()} />);
    expect(screen.getByLabelText('Marcar LTK-0001-ES como inspeccionado')).toBeInTheDocument();
    expect(screen.getByLabelText('Marcar LTK-0001-ES como rechazado')).toBeInTheDocument();
  });

  test('emite INSPECTED al pulsar el botón de inspeccionar', () => {
    const onStatusChange = vi.fn();
    render(<PackageCard pkg={basePkg} onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByLabelText(/como inspeccionado/));
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith({ id: 'a1b2c3d4-0001', newStatus: 'INSPECTED' });
  });

  test('emite REJECTED al pulsar el botón de rechazar', () => {
    const onStatusChange = vi.fn();
    render(<PackageCard pkg={basePkg} onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByLabelText(/como rechazado/));
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith({ id: 'a1b2c3d4-0001', newStatus: 'REJECTED' });
  });

  test('deshabilita el botón del estado actual', () => {
    const { rerender } = render(<PackageCard pkg={{ ...basePkg, status: 'INSPECTED' }} onStatusChange={vi.fn()} />);
    expect(screen.getByLabelText(/como inspeccionado/)).toHaveProperty('disabled', true);
    expect(screen.getByLabelText(/como rechazado/)).toHaveProperty('disabled', false);

    rerender(<PackageCard pkg={{ ...basePkg, status: 'REJECTED' }} onStatusChange={vi.fn()} />);
    expect(screen.getByLabelText(/como rechazado/)).toHaveProperty('disabled', true);
    expect(screen.getByLabelText(/como inspeccionado/)).toHaveProperty('disabled', false);
  });

  test('no emite eventos desde un botón deshabilitado', () => {
    const onStatusChange = vi.fn();
    render(<PackageCard pkg={{ ...basePkg, status: 'INSPECTED' }} onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByLabelText(/como inspeccionado/));
    expect(onStatusChange).not.toHaveBeenCalled();
  });
});
