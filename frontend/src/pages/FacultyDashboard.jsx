import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function FacultyDashboard() {
  const [docs, setDocs] = useState([]);
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Faculty'; 

  const fetchDocs = async () => {
    try {
        const res = await api.get('/api/documents/');
        setDocs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) { console.error("Fetch error", error); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleSubmitReport = async (id, file) => {
      if(!file) return alert("Select your PDF report first.");
      const formData = new FormData();
      formData.append('report_file', file);
      try {
          await api.post(`/api/documents/${id}/dept_submit_report`, formData);
          alert("Report Submitted to Dept Admin!");
          fetchDocs();
      } catch(e) { alert("Failed to submit report"); }
  };

  const handleReturnToDept = async (id) => {
      if(!window.confirm("Return this document to the Department Admin?")) return;
      try {
          await api.post(`/api/documents/${id}/return`);
          alert("Returned to Dept Admin.");
          fetchDocs();
      } catch(e) { alert("Failed to return."); }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8000/${path.replace(/\\/g, '/')}` : '#';

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-12">
      <div className="bg-blue-900 text-white p-6 mb-8 shadow-lg">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center text-3xl shadow">👨‍🏫</div>
                <div>
                    <h1 className="text-2xl font-bold">{username.toUpperCase()}</h1>
                    <span className="text-blue-300 text-sm font-mono tracking-widest uppercase">Faculty Member</span>
                </div>
            </div>
            <button onClick={() => {localStorage.clear(); navigate('/');}} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-bold shadow">Logout</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 bg-white rounded-2xl shadow-xl border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">Assigned Documents for Review</h2>
        
        {docs.length === 0 ? <p className="text-gray-400 italic text-center py-10">You have no pending assignments.</p> : (
            <div className="space-y-6">
                {docs.map(doc => (
                    <div key={doc._id} className="p-5 rounded-xl border bg-gray-50 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <a href={getFileUrl(doc.file)} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline font-mono text-xl">{doc.tracking_id} ↗</a>
                                <p className="text-sm font-bold text-gray-700 mt-1">Uploaded by: {doc.client_username}</p>
                                <p className="text-xs text-gray-500 mt-1">Assigned on: {doc.assigned_to_faculty_at?.slice(0, 10)}</p>
                            </div>
                            <span className={`px-3 py-1 rounded text-xs font-bold shadow-sm ${doc.status === 'With_Faculty' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                                {doc.status.replace(/_/g, ' ')}
                            </span>
                        </div>

                        {doc.status === 'With_Faculty' && (
                            <div className="mt-4 p-4 bg-white rounded-lg border flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Upload Verification Report (PDF)</label>
                                    <input type="file" id={`report-${doc._id}`} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <button onClick={() => handleReturnToDept(doc._id)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded font-bold text-sm hover:bg-gray-300 transition">Return</button>
                                    <button onClick={() => handleSubmitReport(doc._id, document.getElementById(`report-${doc._id}`).files[0])} className="bg-blue-600 text-white px-6 py-2 rounded font-bold shadow hover:bg-blue-700 transition">Submit Report</button>
                                </div>
                            </div>
                        )}
                        {doc.status === 'Faculty_Reported' && <p className="mt-2 text-sm text-green-600 font-bold flex items-center gap-2">✅ Report submitted to Department Admin. Awaiting approval.</p>}
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}