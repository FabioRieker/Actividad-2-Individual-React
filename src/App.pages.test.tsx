import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import App from './App';
import { getSnapshot, resetStore, updateStatus } from './services/packageStore';

function go(path: string): void {
  window.history.pushState({}, '', path);
}

function visibleHeading(name: string): HTMLElement {
  return screen.getByRole('heading', { level: 1, name });
}

function firstPackage(): { id: string; trackingCode: string } {
  const pkg = getSnapshot()[0];
  if (!pkg) throw new Error('mock vacío');
  return pkg;
}

beforeEach(() => {
  resetStore();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('navegación por pestañas', () => {
  test('la raíz redirige a /paquetes y muestra la Home', async () => {
    go('/');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/paquetes'));
    expect(screen.getByText(`${getSnapshot().length} paquetes`)).toBeInTheDocument();
  });

  test('la barra tiene las cinco pestañas con texto visible y navega entre ellas', async () => {
    go('/paquetes');
    render(<App />);
    const bar = screen.getByLabelText('Navegación principal');
    for (const label of ['Paquetes', 'Resumen', 'Red', 'Actividad', 'Ajustes']) {
      expect(await within(bar).findByText(label)).toBeInTheDocument();
    }

    act(() => {
      fireEvent.click(within(bar).getByText('Resumen'));
    });
    await waitFor(() => expect(window.location.pathname).toBe('/resumen'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Resumen' })).toBeInTheDocument();

    act(() => {
      fireEvent.click(within(bar).getByText('Ajustes'));
    });
    await waitFor(() => expect(window.location.pathname).toBe('/ajustes'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Ajustes' })).toBeInTheDocument();
  });

  test('el código de la tarjeta enlaza al detalle', async () => {
    go('/paquetes');
    render(<App />);
    const { id, trackingCode } = firstPackage();
    const link = screen.getByRole('heading', { level: 2, name: trackingCode }).querySelector('ion-router-link');
    expect(link).not.toBeNull();
    if (!link) return;
    expect(link).toHaveAttribute('router-link', `/paquetes/${id}`);
    act(() => {
      fireEvent.click(link);
    });
    await waitFor(() => expect(window.location.pathname).toBe(`/paquetes/${id}`));
  });
});

describe('detalle de paquete', () => {
  test('con id válido muestra campos, acciones y línea de tiempo', async () => {
    const { id, trackingCode } = firstPackage();
    go(`/paquetes/${id}`);
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: trackingCode })).toBeInTheDocument();
    expect(screen.getByText('Madrid - Coslada')).toBeInTheDocument();
    expect(screen.getByText('4,2 kg')).toBeInTheDocument();
    expect(screen.getAllByText('En tránsito').length).toBeGreaterThan(0);
    expect(screen.getByText('Prioridad alta', { selector: 'dd' })).toBeInTheDocument();
    const timeline = screen.getByRole('list', { name: 'Historial del paquete' });
    expect(timeline.tagName).toBe('OL');
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Inspeccionar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
  });

  test('inspeccionar actualiza el estado y añade un elemento a la línea de tiempo', async () => {
    const { id } = firstPackage();
    go(`/paquetes/${id}`);
    render(<App />);
    const button = await screen.findByRole('button', { name: 'Inspeccionar' });
    act(() => {
      fireEvent.click(button);
    });
    expect(getSnapshot().find((p) => p.id === id)?.status).toBe('INSPECTED');
    const timeline = screen.getByRole('list', { name: 'Historial del paquete' });
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(2);
    expect(within(timeline).getByText(/En tránsito → Inspeccionado/)).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  test('con id inexistente muestra un mensaje amigable y vuelta a Paquetes', async () => {
    go('/paquetes/no-existe');
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Paquete no encontrado' })).toBeInTheDocument();
    expect(screen.getByText('No encontramos este paquete')).toBeInTheDocument();
    expect(screen.getByText('Volver a Paquetes')).toBeInTheDocument();
  });
});

describe('resumen', () => {
  test('muestra KPIs y distribuciones con los números correctos', async () => {
    go('/resumen');
    render(<App />);
    visibleHeading('Resumen');
    const kpis = await screen.findByRole('list', { name: 'Indicadores' });
    const kpi = (label: string): string | undefined =>
      within(kpis)
        .getAllByRole('listitem')
        .find((li) => li.querySelector('.lt-sum-kpi__label')?.textContent === label)
        ?.querySelector('.lt-sum-kpi__value')?.textContent ?? undefined;
    expect(kpi('Paquetes totales')).toBe('8');
    expect(kpi('En tránsito')).toBe('3');
    expect(kpi('Inspeccionados')).toBe('3');
    expect(kpi('Rechazados')).toBe('2');
    expect(kpi('Inspeccionado')).toBe('37,5 %');

    const priorities = screen.getByRole('list', { name: 'Paquetes por prioridad' });
    expect(within(priorities).getAllByText('3 de 8 (37,5 %)')).toHaveLength(2);
    expect(within(priorities).getByText('2 de 8 (25 %)')).toBeInTheDocument();
    expect(within(priorities).getAllByRole('listitem')).toHaveLength(3);

    const hubs = screen.getByRole('list', { name: 'Paquetes por destino' });
    expect(within(hubs).getAllByRole('listitem')).toHaveLength(8);
    expect(within(hubs).getAllByText('1 de 8 (12,5 %)')).toHaveLength(8);
  });

  test('refleja los cambios de estado', async () => {
    updateStatus(firstPackage().id, 'INSPECTED');
    go('/resumen');
    render(<App />);
    const kpis = await screen.findByRole('list', { name: 'Indicadores' });
    expect(within(kpis).getByText('50 %')).toBeInTheDocument();
  });
});

describe('actividad', () => {
  test('estado vacío con el botón de deshacer desactivado', async () => {
    go('/actividad');
    render(<App />);
    expect(await screen.findByText('Sin actividad')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deshacer último cambio/ })).toHaveAttribute('aria-disabled', 'true');
  });

  test('lista los cambios en orden inverso y permite deshacer', async () => {
    const [a, b] = getSnapshot();
    if (!a || !b) throw new Error('mock incompleto');
    updateStatus(a.id, 'INSPECTED');
    updateStatus(b.id, 'REJECTED');
    go('/actividad');
    render(<App />);
    const list = await screen.findByRole('list', { name: 'Historial de cambios' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(`${b.trackingCode}: Inspeccionado → Rechazado`);
    expect(items[1]).toHaveTextContent('LTK-0001-ES: En tránsito → Inspeccionado');

    const undo = screen.getByRole('button', { name: /Deshacer último cambio/ });
    expect(undo).toHaveAttribute('aria-disabled', 'false');
    act(() => {
      fireEvent.click(undo);
    });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(getSnapshot().find((p) => p.id === b.id)?.status).toBe(b.status);
    expect(screen.getByText(/Cambio deshecho/)).toBeInTheDocument();
  });
});

describe('ajustes', () => {
  test('cambiar el tema aplica data-theme y lo guarda', async () => {
    go('/ajustes');
    render(<App />);
    const segment = await screen.findByLabelText('Tema de la aplicación');
    const change = (value: string): void => {
      act(() => {
        fireEvent(segment, new CustomEvent('ionChange', { detail: { value }, bubbles: true }));
      });
    };
    change('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem('lt-theme')).toBe('dark');
    change('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    change('system');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(window.localStorage.getItem('lt-theme')).toBe('system');
  });

  test('muestra la versión de package.json', async () => {
    go('/ajustes');
    render(<App />);
    expect(await screen.findByText('Acerca de')).toBeInTheDocument();
    expect(screen.getByText('0.0.1')).toBeInTheDocument();
  });
});
