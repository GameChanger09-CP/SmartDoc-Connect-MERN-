import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ClientDashboard from './pages/ClientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DeptDashboard from './pages/DeptDashboard';
import FacultyDashboard from './pages/FacultyDashboard'; // <-- NEW

// Import Component
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/client" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/dept" element={<ProtectedRoute><DeptDashboard /></ProtectedRoute>} />
        
        {/* --- NEW FACULTY ROUTE --- */}
        <Route path="/faculty" element={<ProtectedRoute><FacultyDashboard /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;