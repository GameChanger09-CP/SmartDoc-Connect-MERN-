import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';

// --- HELPER: FORMAT DATE TO IST ---
const formatIST = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

export default function FacultyDashboard() {
  const [docs, setDocs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All"); 
  const [infoDoc, setInfoDoc] = useState(null); 
  const username = localStorage.getItem('username') || 'Faculty'; 

  const fetchDocs = async () => {
    try {
        const res = await api.get('/api/documents/');
        setDocs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) { console.error("Fetch error", error); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const filteredDocs = docs.filter(doc => {
      if (filterStatus === "All") return true;
      if (filterStatus === "Pending") return doc.status === 'With_Faculty';
      if (filterStatus === "Submitted") return doc.status === 'Faculty_Reported';
      return true;
  });

  const handleSubmitReport = async (id, file) => {
      if(!file) return alert("Please select a PDF file.");
      const formData = new FormData(); formData.append('report_file', file);
      try { await api.post(`/api/documents/${id}/dept_submit_report`, formData); alert("Report Sent Successfully!"); fetchDocs(); } catch(e) { alert("Failed to submit."); }
  };

  const handleReturnToDept = async (id) => {
      if(!window.confirm("Return this document to the Department Admin?")) return;
      try { await api.post(`/api/documents/${id}/return`); alert("Returned to Department."); fetchDocs(); } catch(e) { alert("Failed to return."); }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8000/${path.replace(/\\/g, '/')}` : '#';

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header Section */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-6">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900">Faculty Workspace</h1>
                <p className="text-slate-500 mt-1">Review assigned documents and submit reports.</p>
            </div>
            <div className="flex gap-4 items-center">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm border border-slate-300 rounded-lg p-2.5 bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <option value="All">All Assignments</option>
                    <option value="Pending">Pending Review</option>
                    <option value="Submitted">Completed / Submitted</option>
                </select>
                <div className="text-right bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                    <span className="text-[10px] font-bold text-blue-400 uppercase block tracking-widest">Pending Tasks</span>
                    <span className="text-2xl font-extrabold text-blue-600">{docs.filter(d => d.status === 'With_Faculty').length}</span>
                </div>
            </div>
        </div>

        {/* Task List */}
        <div className="space-y-6">
            {filteredDocs.length === 0 && <div className="text-center py-12 text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-300">No tasks found.</div>}
            
            {filteredDocs.map(doc => (
                <div key={doc._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition hover:shadow-md">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">TASK</span>
                            <div>
                                <a href={getFileUrl(doc.file)} target="_blank" rel="noreferrer" className="text-xl font-mono font-bold text-slate-900 hover:text-blue-600 underline-offset-2 hover:underline">
                                    {doc.tracking_id}
                                </a>
                                {/* 🔥 IST TIME 🔥 */}
                                <p className="text-[10px] text-slate-500 mt-1">Assigned: {formatIST(doc.assigned_to_faculty_at)}</p>
                            </div>
                            <button onClick={() => setInfoDoc(doc)} className="text-slate-400 hover:text-blue-600 text-xl p-2">ℹ️</button>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${doc.status === 'Faculty_Reported' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                            {doc.status.replace(/_/g, ' ')}
                        </span>
                    </div>

                    <div className="p-6">
                        {/* ACTION AREA: Pending */}
                        {doc.status === 'With_Faculty' && (
                            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                                <div className="w-full lg:w-2/3">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Upload Review Report (PDF)</label>
                                    <input type="file" id={`report-${doc._id}`} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                </div>
                                <div className="flex gap-3 justify-end w-full lg:w-auto">
                                    <button onClick={() => handleReturnToDept(doc._id)} className="px-5 py-2.5 rounded-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Return to Dept</button>
                                    <button onClick={() => handleSubmitReport(doc._id, document.getElementById(`report-${doc._id}`).files[0])} className="px-6 py-2.5 rounded-lg font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md transition">Submit Report</button>
                                </div>
                            </div>
                        )}

                        {/* ACTION AREA: Submitted */}
                        {doc.status === 'Faculty_Reported' && (
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
                                <div className="text-2xl">✅</div>
                                <div>
                                    <p className="text-green-800 font-bold text-sm">Review Submitted Successfully</p>
                                    {/* 🔥 IST TIME 🔥 */}
                                    <p className="text-green-600 text-xs">Submitted on: {formatIST(doc.faculty_processed_at)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </main>

      {/* INFO MODAL */}
      {infoDoc && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl animate-scale-in">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-lg font-bold text-slate-800">Assignment Details</h3>
                      <button onClick={() => setInfoDoc(null)} className="text-2xl text-slate-400 hover:text-red-500">&times;</button>
                  </div>
                  <div className="space-y-4 text-sm">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
                          <div>
                              <p className="text-xs font-bold text-blue-800 uppercase tracking-widest">Tracking ID</p>
                              <p className="font-mono text-xl font-bold text-blue-900">{infoDoc.tracking_id}</p>
                          </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                          <div className="flex justify-between">
                              <span className="text-slate-600 font-medium">Uploaded By Client:</span>
                              <span className="font-mono text-slate-800">{formatIST(infoDoc.uploaded_at)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-2">
                              <span className="text-slate-600 font-medium">Assigned To Me:</span>
                              <span className="font-mono text-slate-800 font-bold">{formatIST(infoDoc.assigned_to_faculty_at)}</span>
                          </div>
                          {infoDoc.faculty_processed_at && (
                              <div className="flex justify-between border-t border-slate-200 pt-2">
                                  <span className="text-green-600 font-bold">My Report Submitted:</span>
                                  <span className="font-mono text-green-700">{formatIST(infoDoc.faculty_processed_at)}</span>
                              </div>
                          )}
                      </div>
                      
                      <button onClick={() => setInfoDoc(null)} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition">Close</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}