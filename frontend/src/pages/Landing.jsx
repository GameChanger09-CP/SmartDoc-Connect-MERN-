import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center p-6 font-sans">
      
      <div className="text-center mb-12 animate-fade-in-down">
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-4 drop-shadow-lg">
          SmartDoc Connect
        </h1>
        <p className="text-xl text-blue-200 max-w-2xl mx-auto leading-relaxed">
          Secure, AI-powered document routing. <br />
          <span className="font-semibold text-white">Select your portal to continue:</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        
        {/* PUBLIC ROUTE: Client gets to Sign Up */}
        <div 
          onClick={() => navigate('/signup', { state: { role: 'Client' } })}
          className="group cursor-pointer bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl flex flex-col items-center text-center"
        >
          <div className="bg-blue-500/20 p-4 rounded-full mb-4 group-hover:bg-blue-500/40 transition">
            <span className="text-4xl">👤</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">New Client</h3>
          <p className="text-blue-200 text-sm">Register to submit documents, track statuses, and view history.</p>
          <span className="mt-4 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">Sign Up</span>
        </div>

        {/* INTERNAL ROUTE: Dept Admin goes to Login */}
        <div 
          onClick={() => navigate('/login')}
          className="group cursor-pointer bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl flex flex-col items-center text-center"
        >
          <div className="bg-orange-500/20 p-4 rounded-full mb-4 group-hover:bg-orange-500/40 transition">
            <span className="text-4xl">📂</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Dept. Admin</h3>
          <p className="text-blue-200 text-sm">Staff Login: Review incoming files and manage workflow.</p>
          <span className="mt-4 bg-gray-700 text-white text-xs font-bold px-4 py-1.5 rounded-full group-hover:bg-orange-500 transition">Staff Login</span>
        </div>

        {/* INTERNAL ROUTE: Main Admin goes to Login */}
        <div 
          onClick={() => navigate('/login')}
          className="group cursor-pointer bg-gradient-to-b from-red-900/40 to-black/40 backdrop-blur-md border border-red-500/30 p-8 rounded-2xl hover:border-red-500/60 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-red-900/50 hover:shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-widest">
            RESTRICTED
          </div>
          <div className="bg-red-500/20 p-4 rounded-full mb-4 group-hover:bg-red-500/40 transition">
            <span className="text-4xl">🛡️</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">System Admin</h3>
          <p className="text-red-200 text-sm">System oversight, routing control, and security audits.</p>
          <span className="mt-4 bg-gray-700 text-white text-xs font-bold px-4 py-1.5 rounded-full group-hover:bg-red-600 transition">Secure Login</span>
        </div>

      </div>

      <div className="mt-12 text-blue-400/60 text-sm flex gap-4">
        <span>Already have an account?</span>
        <button onClick={() => navigate('/login')} className="text-white font-bold hover:text-blue-300 transition">Login Here</button>
      </div>
    </div>
  );
}