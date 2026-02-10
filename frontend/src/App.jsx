import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ClientDashboard from './pages/ClientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DeptDashboard from './pages/DeptDashboard';

// Import Component
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        
        {/* 1. HOME PAGE = LANDING (The 4 Cards) */}
        <Route path="/" element={<Landing />} />
        
        {/* 2. AUTH PAGES */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* --- PROTECTED ROUTES (Require Login) --- */}
        <Route path="/client" element={
          <ProtectedRoute><ClientDashboard /></ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute><AdminDashboard /></ProtectedRoute>
        } />

        <Route path="/dept" element={
          <ProtectedRoute><DeptDashboard /></ProtectedRoute>
        } />

        {/* Catch-all: If route doesn't exist, go to Home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;