import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [data, setData] = useState({ username: '', password: '' });
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login/', data);
      
      // 1. Save Token & Role
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      
      // 2. Save Username (Crucial for Dept Dashboard to know its name)
      localStorage.setItem('username', data.username);

      // 3. Routing Logic
      const role = res.data.role;
      
      if (role === 'Main_Admin') {
        navigate('/admin');
      } else if (role === 'Dept_Admin') {
        navigate('/dept'); // <--- SENT TO NEW DEPT DASHBOARD
      } else {
        navigate('/client'); // Clients & Vendors go here
      }
      
    } catch (err) {
      if(err.response && err.response.status === 403) {
        alert("Your account is still PENDING APPROVAL by the Main Admin.");
      } else {
        alert('Invalid Credentials');
      }
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-xl w-96">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Login</h2>
        <input 
          className="w-full mb-4 p-2 border rounded" 
          placeholder="Username" 
          onChange={e => setData({...data, username: e.target.value})} 
        />
        <input 
          className="w-full mb-4 p-2 border rounded" 
          type="password" 
          placeholder="Password" 
          onChange={e => setData({...data, password: e.target.value})} 
        />
        <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Sign In</button>
        <Link to="/" className="block mt-4 text-center text-gray-500 text-sm">Back to Home</Link>
      </form>
    </div>
  );
}