import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ProfileModal from './ProfileModal';
import { ROLES, APP_NAME } from '../../constants';

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

  // --- NEW: Helper function to route the user to their correct dashboard ---
  const getDashboardPath = () => {
    switch (role) {
      case ROLES.MAIN_ADMIN: return '/admin';
      case ROLES.DEPT_ADMIN: return '/dept';
      case ROLES.FACULTY: return '/faculty';
      case ROLES.CLIENT: return '/client';
      default: return '/';
    }
  };

  const roleStyles = {
    [ROLES.MAIN_ADMIN]: 'bg-red-50 text-red-600 border-red-200',
    [ROLES.DEPT_ADMIN]: 'bg-orange-50 text-orange-600 border-orange-200',
    [ROLES.FACULTY]: 'bg-purple-50 text-purple-600 border-purple-200',
    default: 'bg-blue-50 text-blue-600 border-blue-200',
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-inner">
            {/* Left Section */}
            <div className="flex items-center gap-8">
              <Link to="/" className="navbar-brand group">
                <div className="navbar-logo">SD</div>
                <div className="navbar-title">{APP_NAME.split(' ')[0]}</div>
              </Link>
              <div className="navbar-links">
                <Link to="/" className="navbar-link">Home</Link>
                <Link to="/about" className="navbar-link">About Us</Link>
                
                {/* --- NEW: Main Navbar Dashboard Link (Visible only when logged in) --- */}
                {username && (
                  <Link to={getDashboardPath()} className="navbar-link font-bold text-blue-300">
                    Dashboard
                  </Link>
                )}
              </div>
            </div>

            {/* Right Section */}
            {username ? (
              <div className="flex items-center gap-4">
                <span className={`role-badge ${roleStyles[role] || roleStyles.default}`}>
                  {role?.replace('_', ' ')}
                </span>
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="profile-btn"
                  >
                    <div className="profile-avatar">
                      {username.charAt(0).toUpperCase()}
                    </div>
                  </button>
                  {isProfileOpen && (
                    <div className="profile-dropdown">
                      <div className="profile-header">
                        <p className="profile-username">{username}</p>
                        <p className="profile-status">Online</p>
                      </div>
                      
                      {/* --- NEW: Dropdown Dashboard Link (Great for mobile users) --- */}
                      <Link 
                        to={getDashboardPath()} 
                        onClick={() => setIsProfileOpen(false)}
                        className="dropdown-item block font-bold text-blue-600 bg-blue-50/50"
                      >
                        My Dashboard
                      </Link>

                      <button
                        onClick={() => {
                          setShowModal(true);
                          setIsProfileOpen(false);
                        }}
                        className="dropdown-item"
                      >
                        My Activity Logs
                      </button>
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button onClick={handleLogout} className="dropdown-danger">
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Link to="/login" className="login-btn">
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>
      {showModal && <ProfileModal onClose={() => setShowModal(false)} />}
    </>
  );
}