import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RouterProvider } from './lib/router';
import { AppProviders } from './state/app';
import './index.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RouterProvider>
      <AppProviders>
        <App />
      </AppProviders>
    </RouterProvider>
  </StrictMode>,
);
