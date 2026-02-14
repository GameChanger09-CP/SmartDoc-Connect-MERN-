import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [data, setData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  
  // Forgot Password State
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = Email, 2 = Token + Password
  const [resetData, setResetData] = useState({ email: '', token: '', newPassword: '' });
  const [resetMsg, setResetMsg] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/api/auth/login', data);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('username', res.data.username);

      const path = { 'Main_Admin': '/admin', 'Dept_Admin': '/dept', 'Faculty': '/faculty', 'Client': '/client' };
      navigate(path[res.data.role] || '/client');
    } catch (err) {
      setError(err.response?.data?.error || "Login Failed.");
    }
  };

  // 🔥 STEP 1: Verify User & Send Email
  const handleForgotRequest = async (e) => {
      e.preventDefault();
      setResetMsg('');
      try {
          await api.post('/api/auth/forgot-password', { email: resetData.email });
          setResetMsg("✅ Token sent to your email!");
          setForgotStep(2); // Proceed to Step 2
      } catch (e) { 
          // If email not in DB, backend returns 404
          setResetMsg(`❌ ${e.response?.data?.error || "Invalid User"}`); 
      }
  };

  // 🔥 STEP 2: Verify Token & Change Password
  const handleResetSubmit = async (e) => {
      e.preventDefault();
      setResetMsg('');
      try {
          await api.post('/api/auth/reset-password', { 
              token: resetData.token, 
              password: resetData.newPassword 
          });
          alert("Success! Password Changed. Please Login.");
          setShowForgot(false);
          setForgotStep(1);
          setResetData({ email: '', token: '', newPassword: '' });
      } catch (e) {
          // If token invalid, backend returns 400
          setResetMsg(`❌ ${e.response?.data?.error || "Invalid Token"}`);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      
      {/* Login Card */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Welcome Back</h1>
          <p className="text-blue-200 mt-2 text-sm">Secure Access to SmartDoc Connect</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Username</label>
                <input className="w-full p-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Enter username" onChange={e => setData({...data, username: e.target.value})} value={data.username} required />
            </div>
            <div>
                <label className="block text-xs font-bold text-blue-300 uppercase mb-1">Password</label>
                <input className="w-full p-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition" type="password" placeholder="••••••••" onChange={e => setData({...data, password: e.target.value})} value={data.password} required />
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold transition shadow-lg shadow-blue-500/30">Sign In</button>
        </form>

        <div className="mt-6 flex justify-between text-sm text-blue-200">
            <button onClick={() => { setShowForgot(true); setForgotStep(1); setResetMsg(''); }} className="hover:text-white hover:underline">Forgot Password?</button>
            <Link to="/signup" className="font-bold text-white hover:text-blue-300">Create Account</Link>
        </div>
      </div>

      {/* --- FORGOT PASSWORD MODAL (2-STEP) --- */}
      {showForgot && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-2xl w-full max-w-sm animate-scale-in shadow-2xl">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {forgotStep === 1 ? 'Find Your Account' : 'Verify & Reset'}
                  </h3>
                  
                  {resetMsg && <div className={`mb-3 p-2 text-xs rounded font-bold ${resetMsg.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{resetMsg}</div>}

                  {forgotStep === 1 ? (
                      <form onSubmit={handleForgotRequest}>
                          <p className="text-sm text-gray-500 mb-4">Enter your registered email address.</p>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Email Address</label>
                          <input type="email" required className="w-full border p-3 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="name@example.com" value={resetData.email} onChange={e => setResetData({...resetData, email: e.target.value})} />
                          
                          <div className="flex gap-2 justify-end">
                              <button type="button" onClick={() => setShowForgot(false)} className="px-4 py-2 text-gray-500 font-bold">Cancel</button>
                              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Send Token</button>
                          </div>
                      </form>
                  ) : (
                      <form onSubmit={handleResetSubmit}>
                          <p className="text-sm text-gray-500 mb-4">Enter the token sent to <b>{resetData.email}</b>.</p>
                          
                          <label className="block text-xs font-bold text-gray-500 mb-1">Reset Token</label>
                          <input type="text" required className="w-full border p-3 rounded-lg mb-3 font-mono text-center tracking-widest bg-gray-50" placeholder="TOKEN" value={resetData.token} onChange={e => setResetData({...resetData, token: e.target.value})} />
                          
                          <label className="block text-xs font-bold text-gray-500 mb-1">New Password</label>
                          <input type="password" required className="w-full border p-3 rounded-lg mb-4" placeholder="New Password" value={resetData.newPassword} onChange={e => setResetData({...resetData, newPassword: e.target.value})} />

                          <div className="flex gap-2 justify-end">
                              <button type="button" onClick={() => setForgotStep(1)} className="px-4 py-2 text-gray-500 font-bold">Back</button>
                              <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">Change Password</button>
                          </div>
                      </form>
                  )}
              </div>
          </div>
      )}
    </div>
  );
}