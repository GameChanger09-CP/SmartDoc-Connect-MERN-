import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ClientDashboard from './pages/ClientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DeptDashboard from './pages/DeptDashboard'; // Import New Page
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route path="/client" element={
          <ProtectedRoute><ClientDashboard /></ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute><AdminDashboard /></ProtectedRoute>
        } />

        {/* NEW ROUTE FOR DEPT ADMINS */}
        <Route path="/dept" element={
          <ProtectedRoute><DeptDashboard /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;