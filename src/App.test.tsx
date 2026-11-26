import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import App from './App';
import { getSnapshot } from './services/packageStore';

test('muestra el título y el recuento de paquetes', () => {
  render(<App />);
  expect(screen.getAllByText('LogiTrack Express').length).toBeGreaterThan(0);
  expect(screen.getByText(`${getSnapshot().length} paquetes`)).toBeInTheDocument();
});
