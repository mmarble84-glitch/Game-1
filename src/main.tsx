import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ORBIS entry point. Pure rendering bootstrap — no game state is mutated here.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
