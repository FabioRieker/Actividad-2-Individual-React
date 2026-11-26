import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { resetStore } from '../services/packageStore';

import Home from './Home';

function kpiValue(label: string): string | null {
  const kpis = screen.getByRole('list', { name: 'Resumen por estado' });
  const item = within(kpis)
    .getAllByRole('listitem')
    .find((li) => li.textContent?.includes(label));
  return item?.querySelector('.lt-kpi__value')?.textContent ?? null;
}

function typeInSearch(value: string): void {
  const searchbar = screen.getByPlaceholderText('Buscar código o destino');
  act(() => {
    fireEvent(searchbar, new CustomEvent('ionInput', { detail: { value }, bubbles: true }));
  });
}

function selectPriority(value: string): void {
  const segment = screen.getByLabelText('Filtrar por prioridad');
  act(() => {
    fireEvent(segment, new CustomEvent('ionChange', { detail: { value }, bubbles: true }));
  });
}

describe('Home', () => {
  beforeEach(() => {
    resetStore();
  });

  test('muestra los 8 paquetes y los indicadores iniciales', () => {
    render(<Home />);
    expect(screen.getByText('8 paquetes mostrados')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(8);
    expect(kpiValue('Total')).toBe('8');
    expect(kpiValue('En tránsito')).toBe('3');
    expect(kpiValue('Inspeccionados')).toBe('3');
    expect(kpiValue('Rechazados')).toBe('2');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  test('la búsqueda filtra por código o destino sin distinguir mayúsculas', () => {
    render(<Home />);
    typeInSearch('bilbao');
    expect(screen.getByText('1 paquete mostrado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'LTK-0005-ES' })).toBeInTheDocument();
    typeInSearch('ltk-0002');
    expect(screen.getByRole('heading', { name: 'LTK-0002-ES' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  test('el filtro de prioridad restringe la lista', () => {
    render(<Home />);
    selectPriority('CRITICAL');
    expect(screen.getByText('3 paquetes mostrados')).toBeInTheDocument();
    selectPriority('LOW');
    expect(screen.getByText('2 paquetes mostrados')).toBeInTheDocument();
    selectPriority('ALL');
    expect(screen.getByText('8 paquetes mostrados')).toBeInTheDocument();
  });

  test('ignora valores de segmento que no son un filtro válido', () => {
    render(<Home />);
    selectPriority('CRITICAL');
    selectPriority('otro');
    expect(screen.getByText('3 paquetes mostrados')).toBeInTheDocument();
  });

  test('muestra el estado vacío y limpia los filtros', () => {
    render(<Home />);
    typeInSearch('zzz');
    expect(screen.getByText('0 paquetes mostrados')).toBeInTheDocument();
    expect(screen.getByText('Sin paquetes')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Limpiar filtros'));
    expect(screen.getByText('8 paquetes mostrados')).toBeInTheDocument();
    expect(screen.queryByText('Sin paquetes')).not.toBeInTheDocument();
  });

  test('la acción de la tarjeta cambia el estado y actualiza los indicadores', () => {
    render(<Home />);
    fireEvent.click(screen.getByLabelText('Marcar LTK-0001-ES como inspeccionado'));
    expect(kpiValue('En tránsito')).toBe('2');
    expect(kpiValue('Inspeccionados')).toBe('4');
    fireEvent.click(screen.getByLabelText('Marcar LTK-0005-ES como rechazado'));
    expect(kpiValue('En tránsito')).toBe('1');
    expect(kpiValue('Rechazados')).toBe('3');
  });

  test('las opciones deslizables cambian el estado', () => {
    render(<Home />);
    fireEvent.click(screen.getAllByText('Rechazar')[0]);
    expect(kpiValue('Rechazados')).toBe('3');
    fireEvent.click(screen.getAllByText('Inspeccionar')[0]);
    expect(kpiValue('Inspeccionados')).toBe('4');
  });
});
