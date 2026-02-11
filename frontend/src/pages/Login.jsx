import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [data, setData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Hits the Node.js backend
      const res = await api.post('/api/auth/login', {
        username: data.username,
        password: data.password
      });
      
      const { token, role, username } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('username', username);

      switch(role) {
        case 'Main_Admin':
        case 'Superuser':
          navigate('/admin');
          break;
        case 'Dept_Admin':
          navigate('/dept');
          break;
        case 'Faculty':          
          navigate('/faculty');  
          break;                 
        case 'Client':
          navigate('/client');
          break;
        default:
          navigate('/client');
      }
      
    } catch (err) {
      console.error("Login Error:", err);
      if(err.response) {
        if (err.response.status === 403) {
          setError("Your account is pending approval by the Admin.");
        } else if (err.response.status === 400) {
          setError("Invalid Username or Password.");
        } else {
          setError("Server error. Please try again later.");
        }
      } else {
        setError("Network error. Is the backend running?");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 font-sans">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight">SmartDoc Connect</h1>
        <p className="text-gray-500 mt-2">Secure Document Management System</p>
      </div>

      <div className="bg-white p-10 rounded-2xl shadow-xl w-96 border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Login</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Enter username" 
                  onChange={e => setData({...data, username: e.target.value})} 
                  value={data.username}
                  required
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  type="password" 
                  placeholder="••••••••" 
                  onChange={e => setData({...data, password: e.target.value})} 
                  value={data.password}
                  required
                />
            </div>

            <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md mt-4">
                Sign In
            </button>
        </form>

        <div className="mt-6 flex justify-between text-sm">
            <Link to="/" className="text-gray-500 hover:text-gray-700 hover:underline">
                ← Back to Home
            </Link>
            
            <Link to="/signup" className="text-blue-600 font-bold hover:underline">
                Create Account
            </Link>
        </div>
      </div>
    </div>
  );
}