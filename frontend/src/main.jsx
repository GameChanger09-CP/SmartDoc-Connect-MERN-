import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom'; // 🔥 REQUIRED

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* This wrapper is mandatory for routing to work */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);