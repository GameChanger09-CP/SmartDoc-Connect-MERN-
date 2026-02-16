import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import About from './pages/About';
import ClientDashboard from './pages/ClientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DeptDashboard from './pages/DeptDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import PublicPayment from './pages/PublicPayment';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/about" element={<About />} />
      
      {/* Public Payment Route (No Login Required) */}
      <Route path="/pay/:docId/:installmentId" element={<PublicPayment />} />

      {/* Protected Routes */}
      <Route path="/client" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/dept" element={<ProtectedRoute><DeptDashboard /></ProtectedRoute>} />
      <Route path="/faculty" element={<ProtectedRoute><FacultyDashboard /></ProtectedRoute>} />
    </Routes>
  );
}