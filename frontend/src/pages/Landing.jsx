import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen font-sans bg-slate-50">
      <Navbar />

      {/* --- HERO SECTION --- */}
      <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden pb-20 pt-10">
        {/* Background blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-widest mb-6 animate-fade-in-up">
            ENTERPRISE DOCUMENT MANAGEMENT
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Streamline Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Paperwork & Payments</span>
          </h1>
          <p className="text-xl text-blue-100/80 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            SmartDoc Connect automates document routing for colleges and large enterprises. 
            Securely upload, verify, and handle payments in one unified platform.
          </p>

          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            
            {/* Client Card */}
            <div 
              onClick={() => navigate('/signup', { state: { role: 'Client' } })}
              className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl cursor-pointer hover:bg-white/20 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group text-left"
            >
              <div className="bg-blue-500/20 w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">👤</div>
              <h3 className="text-xl font-bold mb-2">Student / Client</h3>
              <p className="text-blue-200 text-sm mb-4">Submit applications, track live status, and pay fees securely online.</p>
              <span className="text-blue-300 text-xs font-bold uppercase tracking-wider group-hover:text-white transition">Get Started →</span>
            </div>

            {/* Dept Admin Card */}
            <div 
              onClick={() => navigate('/login')}
              className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl cursor-pointer hover:bg-white/20 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group text-left"
            >
              <div className="bg-orange-500/20 w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">📂</div>
              <h3 className="text-xl font-bold mb-2">Department Staff</h3>
              <p className="text-blue-200 text-sm mb-4">Review incoming documents, assign to faculty, and approve reports.</p>
              <span className="text-orange-300 text-xs font-bold uppercase tracking-wider group-hover:text-white transition">Staff Login →</span>
            </div>

            {/* Main Admin Card */}
            <div 
              onClick={() => navigate('/login')}
              className="bg-gradient-to-b from-red-900/40 to-transparent backdrop-blur-md border border-red-500/30 p-8 rounded-2xl cursor-pointer hover:border-red-500/60 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group text-left"
            >
              <div className="bg-red-500/20 w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">🛡️</div>
              <h3 className="text-xl font-bold mb-2">College Admin</h3>
              <p className="text-red-200 text-sm mb-4">Oversee the entire organization, manage users, and audit security logs.</p>
              <span className="text-red-400 text-xs font-bold uppercase tracking-wider group-hover:text-white transition">Secure Access →</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- FEATURES SECTION --- */}
      <div className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Why SmartDoc Connect?</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Traditional paperwork is slow and error-prone. We built a digital highway for your documents with enterprise-grade security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <Feature 
            icon="🔒" 
            title="Secure Routing" 
            desc="Documents are routed securely through valid channels (Admin → Dept → Faculty) ensuring no data loss."
          />
          <Feature 
            icon="💳" 
            title="Integrated Payments" 
            desc="Seamless Razorpay integration allows admins to request fees and clients to pay in easy installments."
          />
          <Feature 
            icon="⚡" 
            title="Real-Time Tracking" 
            desc="Clients get live email updates and a visual timeline as their document moves through the approval chain."
          />
        </div>
      </div>

      {/* --- STATS / TRUST SECTION --- */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 text-center gap-8">
          <div>
            <h3 className="text-4xl font-extrabold mb-1">100%</h3>
            <p className="text-blue-200 text-sm uppercase tracking-widest">Paperless Workflow</p>
          </div>
          <div>
            <h3 className="text-4xl font-extrabold mb-1">256-bit</h3>
            <p className="text-blue-200 text-sm uppercase tracking-widest">Data Encryption</p>
          </div>
          <div>
            <h3 className="text-4xl font-extrabold mb-1">24/7</h3>
            <p className="text-blue-200 text-sm uppercase tracking-widest">System Availability</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="text-center p-6 rounded-2xl hover:bg-white hover:shadow-xl transition duration-300 border border-transparent hover:border-gray-100">
      <div className="w-16 h-16 bg-blue-50 text-4xl flex items-center justify-center rounded-2xl mx-auto mb-6 shadow-sm">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}