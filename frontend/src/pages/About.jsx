import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { APP_NAME } from '../../constants';

export default function About() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Header */}
        <div className="bg-slate-900 text-white py-24 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10 animate-pulse"></div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 relative z-10">About {APP_NAME.split(' ')[0]}</h1>
          <p className="text-slate-400 max-w-2xl mx-auto px-6 relative z-10 text-lg">
            Bridging the gap between administrative bureaucracy and digital efficiency.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-20 space-y-20">
          
          {/* Mission */}
          <section className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1">
              <span className="text-blue-600 font-bold text-xs uppercase tracking-widest mb-2 block">Our Mission</span>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Why we built this?</h2>
              <p className="text-gray-600 leading-relaxed mb-4 text-lg">
                Colleges and large enterprises struggle with mountains of paperwork. Applications get lost, payments are handled manually, and tracking is non-existent.
              </p>
              <p className="text-gray-600 leading-relaxed text-lg">
                **{APP_NAME}** was engineered to solve this. We provide a centralized platform where documents are digitized, securely routed to the right departments, and monetized efficiently through integrated payment gateways.
              </p>
            </div>
            <div className="flex-1 bg-white p-10 rounded-3xl shadow-xl border border-gray-100 transform hover:-translate-y-2 transition duration-500">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl">🚀</div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xl">Efficiency</h4>
                  <p className="text-sm text-gray-500">Reduce processing time by 70%</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl">🛡️</div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xl">Accountability</h4>
                  <p className="text-sm text-gray-500">Full audit logs for every action</p>
                </div>
              </div>
            </div>
          </section>

          {/* Technology */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">Powered by Modern Tech</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <TechCard label="React + Vite" desc="Frontend" />
              <TechCard label="Node.js & Express" desc="Backend API" />
              <TechCard label="MongoDB" desc="Database" />
              <TechCard label="Razorpay" desc="Payments" />
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}

function TechCard({ label, desc }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition duration-300 group">
      <h3 className="font-bold text-gray-800 text-lg group-hover:text-blue-600 transition">{label}</h3>
      <p className="text-xs text-gray-500 uppercase mt-2">{desc}</p>
    </div>
  );
}