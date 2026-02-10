import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function ClientDashboard() {
  const [file, setFile] = useState(null);
  const [docs, setDocs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [infoDoc, setInfoDoc] = useState(null); // New: Info Modal State

  const navigate = useNavigate();
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  const fetchDocs = async () => {
    try {
        const res = await api.get('/documents/');
        setDocs(res.data);
    } catch (error) { console.error("Fetch error", error); }
  };

  const fetchLogs = async () => {
    try {
        const res = await api.get('/logs/');
        setLogs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) { console.error("Log error", error); }
  };

  useEffect(() => { fetchDocs(); fetchLogs(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if(!file) return alert("Please select a file");
    
    const formData = new FormData();
    formData.append('file', file);
    try {
        await api.post('/documents/', formData); 
        fetchDocs(); fetchLogs(); setFile(null);
        alert('Document Uploaded Successfully!');
    } catch (error) { alert("Upload Failed."); }
  };

  const getFileUrl = (path) => {
      if (!path) return '#';
      if (path.startsWith('http')) return path;
      return `http://127.0.0.1:8000${path.startsWith('/') ? path : '/' + path}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* PROFILE HEADER */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6 mb-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl">👤</div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{username}</h1>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">{role}</span>
                </div>
            </div>
            
            <div className="flex gap-6 text-center">
                <div><p className="text-2xl font-bold text-gray-800">{docs.length}</p><p className="text-xs text-gray-500 font-bold uppercase">Documents</p></div>
                <div><p className="text-2xl font-bold text-green-600">{docs.filter(d => d.status === 'Completed').length}</p><p className="text-xs text-gray-500 font-bold uppercase">Completed</p></div>
                <button onClick={() => setIsSidebarOpen(true)} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 transition">📜 View History</button>
                <button onClick={() => {localStorage.clear(); navigate('/');}} className="bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-bold text-red-600 transition">Logout</button>
            </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Upload Form */}
        <div className="bg-white p-8 rounded-2xl shadow-lg mb-8 border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-700">Submit New Document</h2>
            <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-grow w-full">
                    <input type="file" onChange={e => setFile(e.target.files[0])} className="w-full border p-3 rounded-lg bg-gray-50" />
                </div>
                <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-blue-700 transition">Upload & Process</button>
            </form>
        </div>

        {/* Document List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">Your Documents</h2>
            </div>
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                        <th className="p-4">Tracking ID</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Info</th>
                        <th className="p-4">Report</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {docs.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="p-4 font-mono text-blue-600 font-bold">{doc.tracking_id}</td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${doc.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{doc.status}</span>
                        </td>
                        {/* INFO BUTTON */}
                        <td className="p-4">
                            <button onClick={() => setInfoDoc(doc)} className="text-gray-400 hover:text-blue-600 text-xl font-bold" title="View Timeline">ℹ️</button>
                        </td>
                        {/* DOWNLOAD BUTTON */}
                        <td className="p-4">
                             {doc.status === 'Completed' && doc.dept_report ? (
                                <a href={getFileUrl(doc.dept_report)} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700 shadow flex items-center w-fit gap-1">
                                    ⬇ Report
                                </a>
                             ) : <span className="text-gray-400 text-xs italic">Pending</span>}
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- METADATA MODAL (For Client) --- */}
      {infoDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-[500px] animate-scale-in">
                <div className="flex justify-between items-center mb-6 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800">Document Status</h3>
                    <button onClick={() => setInfoDoc(null)} className="text-gray-400 hover:text-red-500 text-xl font-bold">×</button>
                </div>
                
                <div className="space-y-4 text-sm">
                    {/* Basic Info */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <p className="text-xs font-bold text-blue-800 uppercase mb-1">Document Info</p>
                        <p className="font-mono text-lg font-bold text-blue-600">{infoDoc.tracking_id}</p>
                        <p className="text-gray-600">Current Status: <span className="font-bold text-gray-900">{infoDoc.status}</span></p>
                    </div>

                    {/* Timeline */}
                    <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Processing Timeline</h4>
                        <div className="flex justify-between"><span className="text-gray-900 font-bold">1. You Uploaded:</span><span className="font-mono font-bold text-blue-600">{infoDoc.uploaded_at?.replace('T', ' ')}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">2. Sent to Dept:</span><span className="font-mono font-bold">{infoDoc.sent_to_dept_at?.replace('T', ' ') || '...'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">3. Dept Processed:</span><span className="font-mono font-bold">{infoDoc.dept_processed_at?.replace('T', ' ') || '...'}</span></div>
                        <div className="flex justify-between border-t pt-2 mt-2"><span className="text-gray-900 font-bold">4. Final Report Received:</span><span className="font-mono font-bold text-green-600">{infoDoc.final_report_sent_at?.replace('T', ' ') || '...'}</span></div>
                    </div>

                    {/* Report Link */}
                    {infoDoc.status === 'Completed' && infoDoc.dept_report && (
                        <div className="mt-4">
                             <a href={getFileUrl(infoDoc.dept_report)} target="_blank" className="block w-full text-center bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow">
                                ⬇ Download Final Report
                            </a>
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <button onClick={() => setInfoDoc(null)} className="w-full bg-gray-100 py-2 rounded font-bold text-gray-600 hover:bg-gray-200">Close</button>
                </div>
            </div>
        </div>
      )}

      {/* History Sidebar (Existing) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
            <div className="relative w-80 bg-white h-full shadow-2xl p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Activity Log</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-xl font-bold">×</button>
                </div>
                {logs.map(log => (
                    <div key={log.id} className="bg-gray-50 p-3 rounded mb-3 text-sm border">
                        <p className="font-bold text-indigo-700">{log.action}</p>
                        <p className="text-gray-600">{log.details}</p>
                        <p className="text-xs text-gray-400 mt-1">{log.timestamp}</p>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}