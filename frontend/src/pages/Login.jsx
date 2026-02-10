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
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('username', data.username);

      const role = res.data.role;
      
      if (role === 'Main_Admin') navigate('/admin');
      else if (role === 'Dept_Admin') navigate('/dept');
      else navigate('/client');
      
    } catch (err) {
      if(err.response && err.response.status === 403) {
        alert("Your account is still PENDING APPROVAL by the Main Admin.");
      } else {
        alert('Invalid Credentials');
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
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Welcome Back</h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Enter username" 
                  onChange={e => setData({...data, username: e.target.value})} 
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
                  required
                />
            </div>

            <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md mt-4">
                Sign In
            </button>
        </form>

        <div className="mt-6 flex justify-between text-sm">
             {/* Back to Home Link */}
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