import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Arcade from '../app/arcade';
import '../app/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing game root');

createRoot(root).render(
  <StrictMode>
    <Arcade />
  </StrictMode>,
);
