import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function ClientDashboard() {
  const [file, setFile] = useState(null);
  const [docs, setDocs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [infoDoc, setInfoDoc] = useState(null); 

  const navigate = useNavigate();
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  const fetchDocs = async () => {
    try {
        const res = await api.get('/api/documents/');
        setDocs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) { console.error("Fetch error", error); }
  };

  const fetchLogs = async () => {
    try {
        const res = await api.get('/api/logs/');
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
        await api.post('/api/documents/', formData); 
        fetchDocs(); fetchLogs(); setFile(null);
        alert('Document Uploaded Successfully!');
    } catch (error) { alert("Upload Failed."); }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8000/${path.replace(/\\/g, '/')}` : '#';

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      <div className="bg-white shadow-sm border-b border-gray-200 p-6 mb-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl shadow-inner">👤</div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{username}</h1>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">{role}</span>
                </div>
            </div>
            
            <div className="flex gap-6 text-center">
                <div><p className="text-2xl font-bold text-gray-800">{docs.length}</p><p className="text-xs text-gray-500 font-bold uppercase">Documents</p></div>
                <div><p className="text-2xl font-bold text-green-600">{docs.filter(d => d.status === 'Completed').length}</p><p className="text-xs text-gray-500 font-bold uppercase">Completed</p></div>
                <button onClick={() => setIsSidebarOpen(true)} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 transition shadow-sm">📜 View History</button>
                <button onClick={() => {localStorage.clear(); navigate('/');}} className="bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-bold text-red-600 transition shadow-sm">Logout</button>
            </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg mb-8 border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Submit New Document</h2>
            <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-grow w-full">
                    <input type="file" onChange={e => setFile(e.target.files[0])} className="w-full border p-3 rounded-lg bg-gray-50 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition">Upload & Process</button>
            </form>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">Your Documents</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr><th className="p-4">Tracking ID</th><th className="p-4">Status</th><th className="p-4 text-center">Info</th><th className="p-4 text-center">Report</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {docs.map(doc => (
                        <tr key={doc._id} className="hover:bg-gray-50 transition">
                            <td className="p-4 font-mono text-blue-600 font-bold">{doc.tracking_id}</td>
                            <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm border ${
                                    doc.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                                    doc.status === 'Returned_To_Main' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                    ['Declined', 'Frozen'].includes(doc.status) ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-yellow-50 text-yellow-700 border-yellow-200'
                                }`}>
                                    {doc.status.replace(/_/g, ' ')}
                                </span>
                            </td>
                            <td className="p-4 text-center">
                                <button onClick={() => setInfoDoc(doc)} className="text-gray-400 hover:text-blue-600 text-xl font-bold transition transform hover:scale-110" title="View Timeline">ℹ️</button>
                            </td>
                            <td className="p-4 text-center">
                                 {doc.status === 'Completed' && doc.dept_report ? (
                                    <a href={getFileUrl(doc.dept_report)} target="_blank" rel="noopener noreferrer" className="inline-block bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-green-700 shadow transition">⬇ Download</a>
                                 ) : <span className="text-gray-400 text-xs italic">Pending</span>}
                            </td>
                        </tr>
                        ))}
                        {docs.length === 0 && <tr><td colSpan="4" className="text-center p-8 text-gray-400 italic">No documents uploaded yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {infoDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-[500px] animate-scale-in">
                <div className="flex justify-between items-center mb-6 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800">Document Status</h3>
                    <button onClick={() => setInfoDoc(null)} className="text-gray-400 hover:text-red-500 text-2xl font-bold transition">×</button>
                </div>
                
                <div className="space-y-4 text-sm">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
                        <p className="text-xs font-bold text-blue-800 uppercase mb-1">Tracking Information</p>
                        <p className="font-mono text-xl font-extrabold text-blue-600">{infoDoc.tracking_id}</p>
                        <p className="text-gray-600 mt-1">Current Status: <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border">{infoDoc.status.replace(/_/g, ' ')}</span></p>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-3 shadow-inner">
                        <h4 className="text-xs font-bold text-gray-500 uppercase border-b pb-2 mb-3">Processing Timeline</h4>
                        <div className="flex justify-between items-center"><span className="text-gray-900 font-bold">1. Uploaded:</span><span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{infoDoc.uploaded_at?.replace('T', ' ').slice(0, 16)}</span></div>
                        <div className="flex justify-between items-center"><span className={infoDoc.sent_to_dept_at ? "text-gray-700 font-semibold" : "text-gray-400"}>2. Sent to Dept:</span><span className="font-mono font-bold text-gray-600">{infoDoc.sent_to_dept_at ? infoDoc.sent_to_dept_at.replace('T', ' ').slice(0, 16) : '...'}</span></div>
                        
                        {infoDoc.assigned_to_faculty_at && <div className="flex justify-between items-center pl-4 border-l-2 border-yellow-300 ml-2"><span className="text-gray-600 font-semibold text-xs">↳ Under Faculty Review:</span><span className="font-mono font-bold text-yellow-700 text-xs">{infoDoc.assigned_to_faculty_at.replace('T', ' ').slice(0, 16)}</span></div>}
                        {infoDoc.faculty_processed_at && <div className="flex justify-between items-center pl-4 border-l-2 border-purple-300 ml-2"><span className="text-gray-600 font-semibold text-xs">↳ Faculty Reported:</span><span className="font-mono font-bold text-purple-700 text-xs">{infoDoc.faculty_processed_at.replace('T', ' ').slice(0, 16)}</span></div>}

                        <div className="flex justify-between items-center"><span className={infoDoc.dept_processed_at ? "text-gray-700 font-semibold" : "text-gray-400"}>3. Dept Approved:</span><span className="font-mono font-bold text-gray-600">{infoDoc.dept_processed_at ? infoDoc.dept_processed_at.replace('T', ' ').slice(0, 16) : '...'}</span></div>
                        
                        <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-3">
                            <span className={infoDoc.final_report_sent_at ? "text-green-700 font-extrabold" : "text-gray-400 font-bold"}>4. Final Report Ready:</span>
                            <span className={infoDoc.final_report_sent_at ? "font-mono font-extrabold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200" : "font-mono font-bold text-gray-400"}>
                                {infoDoc.final_report_sent_at ? infoDoc.final_report_sent_at.replace('T', ' ').slice(0, 16) : '...'}
                            </span>
                        </div>
                    </div>

                    {infoDoc.status === 'Completed' && infoDoc.dept_report && (
                        <div className="mt-6">
                             <a href={getFileUrl(infoDoc.dept_report)} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg transform transition hover:-translate-y-0.5">⬇ Download Final Report</a>
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <button onClick={() => setInfoDoc(null)} className="w-full bg-gray-100 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition">Close Tracker</button>
                </div>
            </div>
        </div>
      )}

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
            <div className="relative w-80 sm:w-96 bg-white h-full shadow-2xl p-6 overflow-y-auto transform transition-transform animate-slide-in-right">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-xl font-extrabold text-gray-800">Activity History</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-3xl font-bold text-gray-400 hover:text-red-500 transition">×</button>
                </div>
                <div className="space-y-4">
                    {logs.map(log => (
                        <div key={log._id} className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-100 hover:bg-blue-50 transition">
                            <div className="flex justify-between items-start mb-1">
                                <p className="font-bold text-blue-700 text-sm">{log.action}</p>
                                <p className="text-[10px] text-gray-400 font-mono bg-white px-2 py-0.5 rounded border">{log.timestamp?.slice(5, 16).replace('T', ' ')}</p>
                            </div>
                            <p className="text-gray-600 text-sm">{log.details}</p>
                        </div>
                    ))}
                    {logs.length === 0 && <p className="text-center text-gray-400 italic mt-10">No activity recorded yet.</p>}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}    