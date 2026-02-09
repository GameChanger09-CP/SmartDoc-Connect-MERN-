import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialRole = location.state?.role || 'Client';

  const [data, setData] = useState({ 
    username: '', password: '', email: '', gov_id: null, role: initialRole 
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('password', data.password);
    formData.append('email', data.email);
    formData.append('role', data.role);
    if (data.gov_id) {
        formData.append('gov_id', data.gov_id);
    }

    try {
      await api.post('/auth/register/', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      
      let msg = "Registration Successful!";
      if (['Dept_Admin', 'Vendor'].includes(data.role)) {
        msg += " Please wait for MAIN ADMIN approval before logging in.";
      }
      alert(msg);
      navigate('/login');
      
    } catch (error) {
      console.error("Signup Error:", error.response);
      // SHOW THE REAL ERROR
      if (error.response && error.response.data) {
        const errorMsg = JSON.stringify(error.response.data);
        alert(`Registration Failed: ${errorMsg}`);
      } else {
        alert("Registration Failed. Check console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center">Join as {data.role.replace('_', ' ')}</h2>
        
        {/* Role Selector */}
        <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">Select Role</label>
            <select 
                value={data.role} 
                onChange={e => setData({...data, role: e.target.value})}
                className="w-full border-gray-300 border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
            >
                <option value="Client">Client (Standard)</option>
                <option value="Vendor">Vendor (Requires Approval)</option>
                <option value="Dept_Admin">Department Admin (Requires Approval)</option>
            </select>
        </div>

        <div className="space-y-4">
            <input 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="Username" 
                value={data.username}
                onChange={e => setData({...data, username: e.target.value})} 
                required
            />
            <input 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                type="email" 
                placeholder="Email Address" 
                value={data.email}
                onChange={e => setData({...data, email: e.target.value})} 
                required
            />
            <input 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                type="password" 
                placeholder="Password" 
                value={data.password}
                onChange={e => setData({...data, password: e.target.value})} 
                required
            />
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <label className="text-sm font-bold text-blue-900 block mb-2">Upload ID Proof (Optional for testing)</label>
                <input 
                    type="file" 
                    className="w-full text-sm text-blue-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                    onChange={e => setData({...data, gov_id: e.target.files[0]})} 
                />
            </div>
        </div>

        <button 
            disabled={loading} 
            className={`w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition transform hover:-translate-y-1 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
            {loading ? 'Processing...' : 'Create Account'}
        </button>
        
        <p className="mt-4 text-center text-gray-500 text-sm">
            Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Login here</Link>
        </p>
      </form>
    </div>
  );
}