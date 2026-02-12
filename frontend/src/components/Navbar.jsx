import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileModal from './ProfileModal';

export default function Navbar() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/30 font-bold">
                SD
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">SmartDoc Connect</h1>
                <p className="text-xs text-gray-500 font-medium">Enterprise Document Routing</p>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                role === 'Main_Admin' ? 'bg-red-50 text-red-600 border border-red-200' :
                role === 'Dept_Admin' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                role === 'Faculty' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                'bg-blue-50 text-blue-600 border border-blue-200'
              }`}>
                {role?.replace('_', ' ')}
              </span>

              {/* Profile Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 focus:outline-none transition transform hover:scale-105"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white shadow-md flex items-center justify-center text-lg hover:bg-gray-200 transition">
                    👤
                  </div>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 animate-fade-in-down origin-top-right z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900 truncate">{username}</p>
                      <p className="text-xs text-gray-500 truncate">Logged In</p>
                    </div>
                    <button onClick={() => { setShowModal(true); setIsProfileOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition">
                      My Profile & History
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 font-bold hover:bg-red-50 transition">
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Profile Modal Component */}
      {showModal && <ProfileModal onClose={() => setShowModal(false)} />}
    </>
  );
}