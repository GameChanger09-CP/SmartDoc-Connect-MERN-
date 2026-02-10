import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function ClientDashboard() {
  const [file, setFile] = useState(null);
  const [priority, setPriority] = useState('Normal');
  const [docs, setDocs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Sidebar State
  const navigate = useNavigate();

  const fetchDocs = async () => {
    try {
        const res = await api.get('/documents/');
        setDocs(res.data);
    } catch (error) { console.error("Fetch error", error); }
  };

  // Fetch Logs function
  const fetchLogs = async () => {
    try {
        const res = await api.get('/logs/');
        setLogs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) { console.error("Log error", error); }
  };

  useEffect(() => { 
      fetchDocs(); 
      fetchLogs(); // Load logs on startup
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if(!file) return alert("Please select a file");
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('priority', priority);

    try {
        await api.post('/documents/', formData); 
        fetchDocs();
        fetchLogs(); // Refresh logs after upload
        setFile(null);
        alert('Document Uploaded Successfully!');
    } catch (error) {
        alert("Upload Failed.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans relative overflow-x-hidden">
      {/* HEADER */}
      <div className="bg-white shadow-sm p-4 flex justify-between items-center z-10 relative">
        <h1 className="text-2xl font-bold text-gray-800">Client Portal</h1>
        <div className="flex gap-4">
            {/* HISTORY BUTTON */}
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-bold hover:bg-indigo-100 transition flex items-center gap-2"
            >
                📜 History
            </button>
            <button onClick={() => {localStorage.clear(); navigate('/');}} className="text-red-600 hover:text-red-800 font-medium">Logout</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        {/* Upload Form */}
        <div className="bg-white p-8 rounded-2xl shadow-lg mb-8 border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-700">Submit New Document</h2>
            <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-grow w-full">
                    <label className="block text-sm font-bold text-gray-600 mb-1">Select File</label>
                    <input type="file" onChange={e => setFile(e.target.files[0])} className="w-full border p-2 rounded-lg bg-gray-50" />
                </div>
                <div className="w-full md:w-48">
                    <label className="block text-sm font-bold text-gray-600 mb-1">Priority</label>
                    <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50">
                        <option>Normal</option>
                        <option>Urgent</option>
                    </select>
                </div>
                <button className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold shadow hover:bg-blue-700 transition">
                    Upload & Process
                </button>
            </form>
        </div>

        {/* Document List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">Document History</h2>
            </div>
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                    <tr>
                        <th className="p-4">Tracking ID</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Priority</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {docs.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition">
                        <td className="p-4 font-mono font-medium text-blue-600">
                            <a href={`http://127.0.0.1:8000${doc.file}`} target="_blank" rel="noopener noreferrer">
                                {doc.tracking_id} ↗
                            </a>
                        </td>
                        <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                doc.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                doc.status === 'Frozen' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                                {doc.status}
                            </span>
                        </td>
                        <td className="p-4">{doc.priority}</td>
                    </tr>
                    ))}
                </tbody>
            </table>
            {docs.length === 0 && <div className="p-8 text-center text-gray-400">No documents yet.</div>}
        </div>
      </div>

      {/* --- HISTORY SIDEBAR (SLIDE-OVER) --- */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
            
            {/* Sidebar Content */}
            <div className="relative w-80 bg-white h-full shadow-2xl p-6 overflow-y-auto animate-slide-in-right">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-800">Activity Log</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-red-500 font-bold text-xl">×</button>
                </div>

                <div className="space-y-4">
                    {logs.length === 0 ? (
                        <p className="text-gray-400 text-center italic">No history available.</p>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-indigo-700">{log.action}</span>
                                    <span className="text-xs text-gray-400">{log.timestamp.split(' ')[1]}</span>
                                </div>
                                <p className="text-gray-600">{log.details}</p>
                                <p className="text-[10px] text-gray-400 mt-2 text-right">{log.timestamp.split(' ')[0]}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}