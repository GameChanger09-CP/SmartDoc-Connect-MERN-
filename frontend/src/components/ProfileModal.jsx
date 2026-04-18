import React, { useEffect, useState } from 'react';
import api from '../api';
import { formatIST, ROLES } from '../../constants';

export default function ProfileModal({ onClose, targetUser = null }) {
  const [activeTab, setActiveTab] = useState('history');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editData, setEditData] = useState({ username: '', email: '', password: '' });

  const username = targetUser ? targetUser.username : localStorage.getItem('username');
  const role = targetUser ? targetUser.role : localStorage.getItem('role');
  const userId = targetUser ? targetUser._id : null;

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        const url = userId ? `/api/users/logs?user_id=${userId}` : '/api/users/logs';
        const res = await api.get(url);
        if (isMounted) setLogs(Array.isArray(res?.data) ? res.data : res?.data?.results || []);
      } catch (error) { 
        console.error("Failed to load history", error); 
        if (isMounted) setLogs([]); // Safe fallback
      } 
      finally { 
        if (isMounted) setLoading(false); 
      }
    };
    fetchHistory();
    return () => { isMounted = false; };
  }, [userId]);

  const handleUpdateProfile = async (e) => {
      e.preventDefault();
      setIsUpdating(true);
      try {
          await api.put('/api/auth/update-profile', editData);
          alert("Profile Updated! Please re-login.");
          localStorage.clear();
          window.location.href = '/login';
      } catch (error) { 
          alert(error.response?.data?.error || "Profile update failed. Please try again."); 
      } finally {
          setIsUpdating(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-3xl border-2 border-white/20">
              {role === ROLES.CLIENT ? '👤' : role === ROLES.MAIN_ADMIN ? '🛡️' : '💼'}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{username || 'Unknown User'}</h2>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase">{role?.replace('_', ' ') || 'User'}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-3xl">&times;</button>
        </div>

        {!targetUser && (
            <div className="flex border-b">
                <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>History</button>
                <button onClick={() => setActiveTab('edit')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'edit' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Edit Profile</button>
            </div>
        )}

        <div className="p-6 bg-gray-50 flex-1 overflow-hidden flex flex-col">
          {activeTab === 'history' ? (
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {loading ? <p className="text-center text-gray-400">Loading activity...</p> : 
                 logs.length === 0 ? <p className="text-center text-gray-400 italic">No activity recorded.</p> :
                 logs.map(log => (
                  <div key={log._id || Math.random()} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-3">
                    <div className="mt-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div></div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">{log.action || 'Unknown Action'}</p>
                        <p className="text-xs text-slate-500 mt-1">{log.details || 'No details provided.'}</p>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono">{formatIST(log.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
          ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Username</label><input className="w-full border p-2 rounded outline-none focus:border-blue-500" placeholder={username} onChange={e => setEditData({...editData, username: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Email</label><input className="w-full border p-2 rounded outline-none focus:border-blue-500" placeholder="New Email" type="email" onChange={e => setEditData({...editData, email: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label><input className="w-full border p-2 rounded outline-none focus:border-blue-500" placeholder="New Password" type="password" onChange={e => setEditData({...editData, password: e.target.value})} /></div>
                  <button disabled={isUpdating} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50">
                    {isUpdating ? 'Updating...' : 'Update & Logout'}
                  </button>
              </form>
          )}
        </div>
      </div>
    </div>
  );
}