import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { resetStore } from '../services/packageStore';

import Home from './Home';

function liveRegion(): HTMLElement {
  const region = screen.getAllByRole('status').find((el) => el.classList.contains('lt-sr-only'));
  if (!region) throw new Error('No existe la región de anuncios');
  return region;
}

describe('Home accesibilidad', () => {
  beforeEach(() => resetStore());
  afterEach(() => {
    vi.restoreAllMocks();
    resetStore();
  });

  test('anuncia el cambio de estado al inspeccionar con el botón de la tarjeta', () => {
    render(<Home />);
    expect(liveRegion()).toHaveTextContent('');
    fireEvent.click(screen.getByLabelText('Marcar LTK-0001-ES como inspeccionado'));
    expect(liveRegion()).toHaveTextContent('LTK-0001-ES marcado como inspeccionado');
  });

  test('anuncia el rechazo de otro paquete', () => {
    render(<Home />);
    fireEvent.click(screen.getByLabelText('Marcar LTK-0001-ES como rechazado'));
    expect(liveRegion()).toHaveTextContent('LTK-0001-ES marcado como rechazado');
    fireEvent.click(screen.getByLabelText('Marcar LTK-0002-ES como rechazado'));
    expect(liveRegion()).toHaveTextContent('LTK-0002-ES marcado como rechazado');
  });

  test('el contador anuncia el estado vacío', () => {
    render(<Home />);
    const searchbar = screen.getByPlaceholderText('Buscar código o destino');
    act(() => {
      fireEvent(searchbar, new CustomEvent('ionInput', { detail: { value: 'zzzz' }, bubbles: true }));
    });
    const count = screen.getByText(/paquetes? mostrados?/);
    expect(count).toHaveAttribute('role', 'status');
    expect(count).toHaveAttribute('aria-live', 'polite');
  });

  test('el campo de búsqueda recibe un nombre accesible en español', async () => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'search text');
    // Ionic fija un aria-label en inglés en su input interno: se simula devolviendo ese input.
    const ctor = customElements.get('ion-searchbar');
    expect(ctor).toBeDefined();
    vi.spyOn(ctor?.prototype, 'getInputElement').mockResolvedValue(input);
    render(<Home />);
    await waitFor(() => expect(input).toHaveAttribute('aria-label', 'Buscar código o destino'));
  });
});
