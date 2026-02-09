import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  // --- THIS IS THE CHANGED FUNCTION ---
  const handleRoleSelect = (roleName) => {
    // We send the user to the SIGNUP page (not login)
    // We also pass the 'role' they clicked on so the signup form knows what to select
    navigate('/signup', { state: { role: roleName } });
  };
  // -------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center p-6 font-sans">
      
      {/* Header Section */}
      <div className="text-center mb-12 animate-fade-in-down">
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-4 drop-shadow-lg">
          SmartDoc Connect
        </h1>
        <p className="text-xl text-blue-200 max-w-2xl mx-auto leading-relaxed">
          Secure, AI-powered document routing for every stakeholder. <br />
          <span className="font-semibold text-white">Please select your role to join:</span>
        </p>
      </div>

      {/* 4-Role Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
        
        {/* Role 1: Client */}
        <div 
          onClick={() => handleRoleSelect('Client')}
          className="group cursor-pointer bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl flex flex-col items-center text-center"
        >
          <div className="bg-blue-500/20 p-4 rounded-full mb-4 group-hover:bg-blue-500/40 transition">
            <span className="text-4xl">👤</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Client</h3>
          <p className="text-blue-200 text-sm">Submit personal documents, track application status, and view history.</p>
        </div>

        {/* Role 2: Vendor */}
        <div 
          onClick={() => handleRoleSelect('Vendor')}
          className="group cursor-pointer bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl flex flex-col items-center text-center"
        >
          <div className="bg-purple-500/20 p-4 rounded-full mb-4 group-hover:bg-purple-500/40 transition">
            <span className="text-4xl">📦</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Vendor</h3>
          <p className="text-blue-200 text-sm">Upload invoices, manage contracts, and handle KYC compliance.</p>
        </div>

        {/* Role 3: Dept Admin */}
        <div 
          onClick={() => handleRoleSelect('Dept_Admin')}
          className="group cursor-pointer bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl flex flex-col items-center text-center"
        >
          <div className="bg-orange-500/20 p-4 rounded-full mb-4 group-hover:bg-orange-500/40 transition">
            <span className="text-4xl">📂</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Dept. Admin</h3>
          <p className="text-blue-200 text-sm">Review incoming files, approve requests, and manage department workflow.</p>
        </div>

        {/* Role 4: Main Admin */}
        <div 
          onClick={() => handleRoleSelect('Main_Admin')}
          className="group cursor-pointer bg-gradient-to-b from-red-900/40 to-black/40 backdrop-blur-md border border-red-500/30 p-8 rounded-2xl hover:border-red-500/60 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-red-900/50 hover:shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">
            RESTRICTED
          </div>
          <div className="bg-red-500/20 p-4 rounded-full mb-4 group-hover:bg-red-500/40 transition">
            <span className="text-4xl">🛡️</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Main Admin</h3>
          <p className="text-red-200 text-sm">System oversight, "God Mode" controls, analytics, and security audits.</p>
        </div>

      </div>

      <div className="mt-12 text-blue-400/60 text-sm flex gap-4">
        <span>Already have an account?</span>
        <button onClick={() => navigate('/login')} className="text-white underline hover:text-blue-300">Login Here</button>
      </div>
    </div>
  );
}