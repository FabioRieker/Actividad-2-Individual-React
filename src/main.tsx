import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { initTheme } from './services/theme';

/* Estilos globales propios: despues de los CSS de Ionic (importados en App) */
import './theme/global.css';

initTheme();

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
