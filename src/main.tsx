import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { initTheme } from './services/theme';

/* Fuentes variables autoalojadas (sin CDN): un solo archivo woff2 por familia */
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/jetbrains-mono';

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
