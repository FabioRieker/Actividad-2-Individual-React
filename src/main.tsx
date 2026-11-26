import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';

/* Estilos globales propios: despues de los CSS de Ionic (importados en App) */
import './theme/global.css';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
