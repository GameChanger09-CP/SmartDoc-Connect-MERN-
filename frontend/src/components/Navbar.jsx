// import React, { useState } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import ProfileModal from './ProfileModal';

// export default function Navbar() {
//   const navigate = useNavigate();
//   const username = localStorage.getItem('username');
//   const role = localStorage.getItem('role');
  
//   const [isProfileOpen, setIsProfileOpen] = useState(false);
//   const [showModal, setShowModal] = useState(false);

//   const handleLogout = () => {
//     localStorage.clear();
//     navigate('/');
//   };

//   return (
//     <>
//       <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between h-16 items-center">
            
//             {/* Brand Logo & Links */}
//             <div className="flex items-center gap-8">
//               <Link to="/" className="flex items-center gap-2 group">
//                 <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg group-hover:scale-105 transition font-bold">
//                   SD
//                 </div>
//                 <div className="hidden md:block">
//                   <h1 className="text-lg font-bold text-gray-900 tracking-tight">SmartDoc</h1>
//                 </div>
//               </Link>

//               {/* Navigation Links */}
//               <div className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
//                 <Link to="/" className="hover:text-blue-600 transition">Home</Link>
//                 <Link to="/about" className="hover:text-blue-600 transition">About Us</Link>
//               </div>
//             </div>

//             {/* Right Side Actions */}
//             {username ? (
//               <div className="flex items-center gap-4">
//                 <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
//                   role === 'Main_Admin' ? 'bg-red-50 text-red-600 border border-red-200' :
//                   role === 'Dept_Admin' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
//                   role === 'Faculty' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
//                   'bg-blue-50 text-blue-600 border border-blue-200'
//                 }`}>
//                   {role?.replace('_', ' ')}
//                 </span>

//                 {/* Profile Dropdown */}
//                 <div className="relative">
//                   <button 
//                     onClick={() => setIsProfileOpen(!isProfileOpen)}
//                     className="flex items-center gap-2 focus:outline-none transition transform hover:scale-105"
//                   >
//                     <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-lg text-slate-600 hover:bg-slate-200 transition">
//                       {username.charAt(0).toUpperCase()}
//                     </div>
//                   </button>

//                   {isProfileOpen && (
//                     <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 animate-fade-in-up origin-top-right z-50">
//                       <div className="px-4 py-2 border-b border-gray-100">
//                         <p className="text-sm font-bold text-gray-900 truncate">{username}</p>
//                         <p className="text-[10px] text-gray-500 truncate">Online</p>
//                       </div>
//                       <button onClick={() => { setShowModal(true); setIsProfileOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition">
//                         My Activity Logs
//                       </button>
//                       <div className="border-t border-gray-100 mt-1 pt-1">
//                         <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 font-bold hover:bg-red-50 transition">
//                           Sign Out
//                         </button>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             ) : (
//               <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition shadow-md hover:shadow-lg">
//                 Login
//               </Link>
//             )}
//           </div>
//         </div>
//       </nav>

//       {/* Profile Modal Component */}
//       {showModal && <ProfileModal onClose={() => setShowModal(false)} />}
//     </>
//   );
// }






import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

  const roleStyles = {
    Main_Admin: 'bg-red-50 text-red-600 border-red-200',
    Dept_Admin: 'bg-orange-50 text-orange-600 border-orange-200',
    Faculty: 'bg-purple-50 text-purple-600 border-purple-200',
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
                <div className="navbar-title">SmartDoc</div>
              </Link>

              <div className="navbar-links">
                <Link to="/" className="navbar-link">Home</Link>
                <Link to="/about" className="navbar-link">About Us</Link>
              </div>
            </div>

            {/* Right Section */}
            {username ? (
              <div className="flex items-center gap-4">

                <span
                  className={`role-badge ${
                    roleStyles[role] || roleStyles.default
                  }`}
                >
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
                        <p className="profile-username">
                          {username}
                        </p>
                        <p className="profile-status">Online</p>
                      </div>

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
                        <button
                          onClick={handleLogout}
                          className="dropdown-danger"
                        >
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
