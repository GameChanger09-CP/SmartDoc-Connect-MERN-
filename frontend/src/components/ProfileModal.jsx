import React, { useEffect, useState } from 'react';
import api from '../api';

export default function ProfileModal({ onClose, targetUser = null }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Use passed user (for Admin view) or local storage (for Self view)
  const username = targetUser ? targetUser.username : localStorage.getItem('username');
  const role = targetUser ? targetUser.role : localStorage.getItem('role');
  const userId = targetUser ? targetUser._id : null;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // If we have a target userId (Admin viewing someone else), pass it in query
        const url = userId ? `/api/logs?user_id=${userId}` : '/api/logs';
        const res = await api.get(url);
        
        let data = Array.isArray(res.data) ? res.data : res.data.results || [];
        setLogs(data);
      } catch (error) {
        console.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [userId]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-3xl border-2 border-white/20">
              {role === 'Client' ? '👤' : role === 'Main_Admin' ? '🛡️' : '💼'}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{username}</h2>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase">{role?.replace('_', ' ')}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-3xl">&times;</button>
        </div>

        {/* Content */}
        <div className="p-6 bg-gray-50 flex-1 overflow-hidden flex flex-col">
          <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 tracking-widest border-b pb-2">Activity Audit Log</h3>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {loading ? <p className="text-center text-gray-400">Loading history...</p> : 
             logs.length === 0 ? <p className="text-center text-gray-400 italic">No activity recorded yet.</p> :
             logs.map(log => (
              <div key={log._id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition flex gap-3">
                <div className="mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-800">{log.action}</p>
                    <p className="text-xs text-gray-500 mt-1">{log.details}</p>
                    <p className="text-[10px] text-gray-400 mt-2 font-mono">{log.timestamp?.replace('T', ' ').slice(0, 16)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t bg-white">
            <button onClick={onClose} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition">Close</button>
        </div>
      </div>
    </div>
  );
}