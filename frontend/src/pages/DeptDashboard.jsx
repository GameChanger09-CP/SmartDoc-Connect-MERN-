import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function DeptDashboard() {
  const [docs, setDocs] = useState([]);
  const navigate = useNavigate();
  // Get logged in department name (Username = Dept Name)
  const username = localStorage.getItem('username') || 'Department'; 

  const fetchDocs = async () => {
    try {
        const res = await api.get('/documents/');
        setDocs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) {
        console.error("Fetch error", error);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleAction = async (id, actionEndpoint) => {
    if(!window.confirm("Confirm action?")) return;
    try {
        await api.post(`/documents/${id}/${actionEndpoint}/`);
        fetchDocs(); // Refresh list
    } catch (error) {
        alert("Action failed.");
    }
  };

  const getFileUrl = (path) => {
      if (!path) return '#';
      if (path.startsWith('http')) return path;
      return `http://127.0.0.1:8000${path.startsWith('/') ? path : '/' + path}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
            <h1 className="text-3xl font-extrabold text-blue-900 uppercase">{username} DASHBOARD</h1>
            <p className="text-gray-500">Department Portal</p>
        </div>
        <button onClick={() => {localStorage.clear(); navigate('/');}} className="bg-gray-800 text-white px-6 py-2 rounded-lg font-bold">Logout</button>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-gray-800">Incoming Tasks</h2>
        
        {docs.length === 0 ? (
            <p className="text-center text-gray-400 py-10 italic">No documents assigned to your department yet.</p>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 uppercase text-xs">
                            <th className="p-4">Document</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-center">Your Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {docs.map(doc => (
                            <tr key={doc.id} className="hover:bg-gray-50">
                                <td className="p-4 font-mono text-blue-600">
                                    <a href={getFileUrl(doc.file)} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline flex items-center gap-2">
                                        {doc.tracking_id} ↗
                                    </a>
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        doc.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {doc.status}
                                    </span>
                                </td>
                                <td className="p-4 flex justify-center gap-3">
                                    {doc.status !== 'Completed' && (
                                        <>
                                            <button 
                                                onClick={() => handleAction(doc.id, 'dept_complete')}
                                                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-green-700 shadow-sm"
                                            >
                                                ✓ Accept & Complete
                                            </button>
                                            <button 
                                                onClick={() => handleAction(doc.id, 'dept_return')}
                                                className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-orange-600 shadow-sm"
                                            >
                                                ↩ Not Our Doc (Return)
                                            </button>
                                        </>
                                    )}
                                    {doc.status === 'Completed' && <span className="text-gray-400 text-xs font-bold">Processed</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
}