import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startAutosave } from './editor/persistence';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemen #root tidak ditemukan');

startAutosave();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
