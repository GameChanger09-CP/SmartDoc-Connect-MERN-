import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api';
import { ROLES } from '../../constants';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = location.state?.role || ROLES.CLIENT;

  const [data, setData] = useState({ 
    username: '', password: '', email: '', gov_id: null 
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (role !== ROLES.MAIN_ADMIN && !data.gov_id) {
        return alert("Please upload a valid Government ID or Authorization Document.");
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('password', data.password);
    formData.append('email', data.email);
    formData.append('role', role);
    if (data.gov_id) formData.append('gov_id', data.gov_id);

    try {
      await api.post('/api/auth/register', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      
      let msg = "Registration Successful!";
      if ([ROLES.DEPT_ADMIN, ROLES.MAIN_ADMIN].includes(role)) {
        msg += " Please wait for MAIN ADMIN approval before logging in.";
      }
      alert(msg);
      navigate('/login');
      
    } catch (error) {
      console.error("Signup Error:", error.response);
      const errorMsg = error.response?.data?.error || "Registration failed. Please check your inputs.";
      alert(`Registration Failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = () => {
      if(role === ROLES.MAIN_ADMIN) return 'bg-red-600';
      if(role === ROLES.DEPT_ADMIN) return 'bg-orange-500';
      return 'bg-blue-600';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans p-6">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 relative overflow-hidden animate-fade-in-up">
        <div className={`absolute top-0 left-0 w-full h-2 ${getRoleColor()}`}></div>
        
        <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900">
                {role.replace('_', ' ')} Registration
            </h2>
            <p className="text-gray-500 text-sm mt-2">
                Create your specific account profile below.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                <input 
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 font-medium transition" 
                  placeholder="Choose a unique username" 
                  value={data.username} 
                  onChange={e => setData({...data, username: e.target.value})} 
                  required 
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                <input 
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 transition" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={data.email} 
                  onChange={e => setData({...data, email: e.target.value})} 
                  required 
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                <input 
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 transition" 
                  type="password" 
                  placeholder="••••••••" 
                  value={data.password} 
                  onChange={e => setData({...data, password: e.target.value})} 
                  required 
                />
            </div>
            
            <div className={`p-4 rounded-lg border border-dashed border-gray-300 transition ${role === ROLES.MAIN_ADMIN ? 'bg-red-50' : 'bg-blue-50'}`}>
                <label className="text-sm font-bold text-gray-700 block mb-2">
                    {role === ROLES.DEPT_ADMIN ? 'Upload Department Authorization' : 'Upload Government ID'}
                </label>
                <input 
                  type="file" 
                  required={role !== ROLES.MAIN_ADMIN} 
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white file:text-blue-700 hover:file:bg-blue-100 transition file:cursor-pointer cursor-pointer" 
                  onChange={e => setData({...data, gov_id: e.target.files[0]})} 
                />
            </div>

            <button disabled={loading} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition transform hover:-translate-y-1 ${getRoleColor()} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                {loading ? 'Creating Account...' : `Sign Up as ${role.replace('_', ' ')}`}
            </button>
        </form>
        
        <div className="mt-6 text-center border-t pt-6">
            <p className="text-gray-500 text-sm">
                Wrong Role? <Link to="/" className="text-blue-600 font-bold hover:underline transition">Go Back</Link>
            </p>
            <p className="mt-2 text-gray-500 text-sm">
                Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline transition">Login</Link>
            </p>
        </div>
      </div>
    </div>
  );
}