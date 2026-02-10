import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function DeptDashboard() {
  const [docs, setDocs] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [showHistory, setShowHistory] = useState(false);
  const [infoDoc, setInfoDoc] = useState(null); // New: Info Modal State

  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Dept'; 
  const role = localStorage.getItem('role');

  const fetchData = async () => {
    try {
        const [docRes, logRes] = await Promise.all([
            api.get('/documents/'),
            api.get('/logs/')
        ]);
        setDocs(Array.isArray(docRes.data) ? docRes.data : docRes.data.results || []);
        setLogs(Array.isArray(logRes.data) ? logRes.data : logRes.data.results || []);
    } catch (error) { console.error("Fetch error", error); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- ACTIONS ---
  const handleSubmitReport = async (id, file) => {
      if(!file) return alert("Select PDF first");
      const formData = new FormData();
      formData.append('report_file', file);
      try {
          await api.post(`/documents/${id}/dept_submit_report/`, formData);
          alert("Report Sent Successfully!");
          fetchData();
          setInfoDoc(null); // Close modal if open
      } catch(e) { alert("Failed to send report"); }
  };

  const getFileUrl = (path) => {
      if (!path) return '#';
      if (path.startsWith('http')) return path;
      return `http://127.0.0.1:8000${path.startsWith('/') ? path : '/' + path}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
        
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b border-orange-100 p-6 mb-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-3xl">📂</div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{username.toUpperCase()}</h1>
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">{role}</span>
                </div>
            </div>
            
            <div className="flex gap-6 text-center">
                <div><p className="text-2xl font-bold text-gray-800">{docs.length}</p><p className="text-xs text-gray-500 font-bold uppercase">Assigned</p></div>
                <button onClick={() => setShowHistory(!showHistory)} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 transition">{showHistory ? 'Hide History' : '📜 View History'}</button>
                <button onClick={() => {localStorage.clear(); navigate('/');}} className="bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-bold text-red-600 transition">Logout</button>
            </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: Task List */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <h2 className="text-xl font-bold mb-6 text-gray-800">Incoming Tasks</h2>
            {docs.length === 0 ? <p className="text-gray-400 italic">No tasks assigned.</p> : (
                <div className="space-y-6">
                    {docs.map(doc => (
                        <div key={doc.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <a href={getFileUrl(doc.file)} target="_blank" className="text-blue-600 font-bold hover:underline font-mono text-lg flex items-center gap-2">
                                        {doc.tracking_id} ↗
                                    </a>
                                    {/* SHOW CLIENT NAME HERE */}
                                    <p className="text-xs font-bold text-gray-700 mt-1">Client: {doc.client_username} (#{doc.client_id})</p>
                                    <p className="text-xs text-gray-400">Received: {doc.sent_to_dept_at?.slice(0,16) || 'Pending'}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="bg-white px-2 py-1 rounded text-xs font-bold border shadow-sm">{doc.status}</span>
                                    <button onClick={() => setInfoDoc(doc)} className="text-gray-400 hover:text-blue-600 text-sm font-bold flex items-center gap-1">
                                        ℹ️ Details
                                    </button>
                                </div>
                            </div>

                            {/* Action Area */}
                            {doc.status === 'In_Progress' && (
                                <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                                    <p className="text-xs font-bold text-orange-800 mb-2">Submit Analysis Report (PDF)</p>
                                    <input type="file" id={`file-${doc.id}`} className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-orange-200 file:text-orange-800 hover:file:bg-orange-300 mb-2"/>
                                    <button 
                                        onClick={() => handleSubmitReport(doc.id, document.getElementById(`file-${doc.id}`).files[0])}
                                        className="w-full bg-orange-600 text-white py-2 rounded font-bold text-xs hover:bg-orange-700"
                                    >
                                        📤 Send Report to Admin
                                    </button>
                                </div>
                            )}
                            {doc.status === 'Dept_Reported' && <p className="text-green-600 text-sm font-bold mt-2">✅ Report Submitted</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* RIGHT: History Panel */}
        {showHistory && (
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 h-fit">
                <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Department Activity</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {logs.map(log => (
                        <div key={log.id} className="text-xs bg-gray-50 p-2 rounded border-l-2 border-orange-400">
                            <div className="flex justify-between font-bold text-gray-800">
                                <span>{log.action}</span>
                                <span className="text-gray-400">{log.timestamp.slice(5,16)}</span>
                            </div>
                            <p className="text-gray-500 mt-1">{log.details}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* --- METADATA MODAL (For Dept Admin) --- */}
      {infoDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-[500px] animate-scale-in">
                <div className="flex justify-between items-center mb-6 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800">Task Details</h3>
                    <button onClick={() => setInfoDoc(null)} className="text-gray-400 hover:text-red-500 text-xl font-bold">×</button>
                </div>
                
                <div className="space-y-4 text-sm">
                    {/* CLIENT INFO */}
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                        <h4 className="text-xs font-bold text-orange-800 uppercase mb-2">Client Information</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div><p className="text-gray-500 text-xs">Client Name:</p><p className="font-bold text-gray-900">{infoDoc.client_username}</p></div>
                            <div><p className="text-gray-500 text-xs">User ID:</p><p className="font-mono font-bold text-gray-900">#{infoDoc.client_id}</p></div>
                            <div><p className="text-gray-500 text-xs">Tracking ID:</p><p className="font-mono font-bold text-blue-600">{infoDoc.tracking_id}</p></div>
                        </div>
                    </div>

                    {/* TIMELINE */}
                    <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Lifecycle Dates</h4>
                        <div className="flex justify-between"><span className="text-gray-500">Client Uploaded:</span><span className="font-mono font-bold">{infoDoc.uploaded_at?.replace('T', ' ')}</span></div>
                        <div className="flex justify-between"><span className="text-gray-900 font-bold">Received by Dept:</span><span className="font-mono font-bold text-green-600">{infoDoc.sent_to_dept_at?.replace('T', ' ') || 'Pending'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Report Submitted:</span><span className="font-mono font-bold">{infoDoc.dept_processed_at?.replace('T', ' ') || '-'}</span></div>
                    </div>

                    <div className="mt-4">
                        <a href={getFileUrl(infoDoc.file)} target="_blank" className="block w-full text-center bg-blue-50 text-blue-600 py-2 rounded font-bold hover:bg-blue-100">
                            📄 View Original Document
                        </a>
                    </div>
                </div>

                <div className="mt-6">
                    <button onClick={() => setInfoDoc(null)} className="w-full bg-gray-100 py-2 rounded font-bold text-gray-600 hover:bg-gray-200">Close</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}