import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import App from '../App';
import { getSnapshot, resetStore, updateStatus } from '../services/packageStore';

function go(path: string): void {
  window.history.pushState({}, '', path);
}

function mockReducedMotion(matches: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  resetStore();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('página Red', () => {
  test('muestra el título, la etiqueta de simulación, el reloj, los hubs y la tabla', async () => {
    go('/red');
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Red' })).toBeInTheDocument();
    expect(screen.getByText('Simulación')).toBeInTheDocument();
    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Mapa esquemático de la red logística/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Barcelona - El Prat: 1 paquete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Madrid - Coslada: 1 paquete' })).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(9);
    const row = within(table).getByRole('row', { name: /Barcelona - El Prat/ });
    expect(
      within(row)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['0', '1', '0']);
  });

  test('la pestaña Red está en la barra de navegación', async () => {
    go('/red');
    render(<App />);
    const bar = await screen.findByLabelText('Navegación principal');
    expect(within(bar).getByText('Red')).toBeInTheDocument();
  });

  test('seleccionar un hub abre su ficha con sus paquetes; Escape cierra y devuelve el foco', async () => {
    go('/red');
    render(<App />);
    const hub = await screen.findByRole('button', { name: 'Barcelona - El Prat: 1 paquete' });
    fireEvent.click(hub);
    expect(hub).toHaveAttribute('aria-pressed', 'true');
    const panel = screen.getByRole('region', { name: 'Barcelona - El Prat' });
    const list = within(panel).getByRole('list', { name: 'Paquetes de Barcelona - El Prat' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('LTK-0002-ES').closest('ion-router-link')).toHaveAttribute(
      'router-link',
      `/paquetes/${getSnapshot()[1]?.id}`,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Madrid - Coslada: 1 paquete' }));
    expect(screen.getByRole('region', { name: 'Madrid - Coslada' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Madrid - Coslada' })).not.toBeInTheDocument();
    const madrid = screen.getByRole('button', { name: 'Madrid - Coslada: 1 paquete' });
    expect(madrid).toHaveFocus();
    expect(madrid).toHaveAttribute('aria-pressed', 'false');
  });

  test('el botón Cerrar deselecciona el hub', async () => {
    go('/red');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Valencia - Silla: 1 paquete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('region', { name: 'Valencia - Silla' })).not.toBeInTheDocument();
  });

  test('refleja los cambios de estado del store en la tabla', async () => {
    go('/red');
    render(<App />);
    const table = await screen.findByRole('table');
    const target = getSnapshot().find((p) => p.status === 'IN_TRANSIT' && p.destinationHub === 'Bilbao - Zamudio');
    if (!target) throw new Error('mock sin paquete en tránsito en Bilbao');
    act(() => {
      updateStatus(target.id, 'INSPECTED');
    });
    await waitFor(() => {
      const row = within(table).getByRole('row', { name: /Bilbao - Zamudio/ });
      expect(
        within(row)
          .getAllByRole('cell')
          .map((c) => c.textContent),
      ).toEqual(['0', '1', '0']);
    });
  });

  test('con movimiento reducido no hay bucle de animación', async () => {
    mockReducedMotion(true);
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    go('/red');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: 'Red' });
    await new Promise((resolve) => setTimeout(resolve, 60));
    const before = raf.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(raf.mock.calls.length).toBe(before);
  });

  test('sin movimiento reducido el bucle de animación se mantiene', async () => {
    mockReducedMotion(false);
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    go('/red');
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: 'Red' });
    await new Promise((resolve) => setTimeout(resolve, 60));
    const before = raf.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(raf.mock.calls.length).toBeGreaterThan(before);
  });
});
