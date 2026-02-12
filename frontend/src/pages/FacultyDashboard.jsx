import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';

export default function FacultyDashboard() {
  const [docs, setDocs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All"); 
  const [infoDoc, setInfoDoc] = useState(null); // <-- ADDED FOR INFO MODAL
  const username = localStorage.getItem('username') || 'Faculty'; 

  const fetchDocs = async () => {
    try {
        const res = await api.get('/api/documents/');
        setDocs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) { console.error("Fetch error", error); }
  };

  useEffect(() => { fetchDocs(); }, []);

  // --- FILTER LOGIC ---
  const filteredDocs = docs.filter(doc => {
      if (filterStatus === "All") return true;
      if (filterStatus === "Pending") return doc.status === 'With_Faculty';
      if (filterStatus === "Submitted") return doc.status === 'Faculty_Reported';
      return true;
  });

  const handleSubmitReport = async (id, file) => {
      if(!file) return alert("Select your PDF report first.");
      const formData = new FormData();
      formData.append('report_file', file);
      try {
          await api.post(`/api/documents/${id}/dept_submit_report`, formData);
          alert("Report Submitted!"); fetchDocs();
      } catch(e) { alert("Failed to submit report"); }
  };

  const handleReturnToDept = async (id) => {
      if(!window.confirm("Return this document to the Department Admin?")) return;
      try {
          await api.post(`/api/documents/${id}/return`);
          alert("Returned to Dept Admin."); fetchDocs();
      } catch(e) { alert("Failed to return."); }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8000/${path.replace(/\\/g, '/')}` : '#';

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Welcome Section */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-200 pb-6">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Faculty Workspace</h1>
                <p className="text-gray-500 mt-2">Review assigned documents and submit verification reports.</p>
            </div>
            
            {/* FILTER + STATS */}
            <div className="flex items-center gap-4">
                <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="text-xs border-gray-200 rounded-lg py-2 px-3 bg-white font-semibold text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none border shadow-sm"
                >
                    <option value="All">All Assignments</option>
                    <option value="Pending">Pending Action</option>
                    <option value="Submitted">Submitted Reports</option>
                </select>
                <div className="text-right bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Pending</span>
                    <span className="text-2xl font-extrabold text-blue-600 leading-none">
                        {docs.filter(d => d.status === 'With_Faculty').length}
                    </span>
                </div>
            </div>
        </div>

        {/* Task Grid */}
        <div className="space-y-6">
            {filteredDocs.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                    <p className="text-gray-400 italic text-lg">No documents match this filter.</p>
                </div>
            ) : (
                filteredDocs.map(doc => (
                    <div key={doc._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition hover:shadow-md">
                        {/* Card Header */}
                        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded border border-blue-200">TASK</span>
                                    <a href={getFileUrl(doc.file)} target="_blank" rel="noopener noreferrer" className="text-xl font-mono font-bold text-gray-900 hover:text-blue-600 hover:underline transition">
                                        {doc.tracking_id} ↗
                                    </a>
                                    {/* INFO BUTTON FOR LIFECYCLE */}
                                    <button onClick={() => setInfoDoc(doc)} className="text-gray-400 hover:text-blue-600 text-lg">ℹ️</button>
                                </div>
                                <div className="mt-1 flex gap-4 text-xs text-gray-500 font-medium">
                                    <span>Uploaded by: <span className="text-gray-800">{doc.client_username}</span></span>
                                    <span>•</span>
                                    <span>Assigned: {doc.assigned_to_faculty_at?.slice(0, 10)}</span>
                                </div>
                            </div>
                            
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm uppercase tracking-wide ${
                                doc.status === 'With_Faculty' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 animate-pulse' : 
                                doc.status === 'Faculty_Reported' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}>
                                {doc.status.replace(/_/g, ' ')}
                            </span>
                        </div>

                        {/* Action Area */}
                        <div className="p-6">
                            {doc.status === 'With_Faculty' && (
                                <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                                    <div className="w-full lg:w-2/3">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Upload Verification Report (PDF)</label>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="file" 
                                                id={`report-${doc._id}`} 
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-3 w-full lg:w-auto justify-end">
                                        <button 
                                            onClick={() => handleReturnToDept(doc._id)} 
                                            className="px-5 py-2.5 rounded-lg font-bold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition"
                                        >
                                            Return Task
                                        </button>
                                        <button 
                                            onClick={() => handleSubmitReport(doc._id, document.getElementById(`report-${doc._id}`).files[0])} 
                                            className="px-6 py-2.5 rounded-lg font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition transform active:scale-95"
                                        >
                                            Submit Report
                                        </button>
                                    </div>
                                </div>
                            )}

                            {doc.status === 'Faculty_Reported' && (
                                <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3 text-green-800">
                                    <div className="bg-white p-2 rounded-full shadow-sm text-lg">✅</div>
                                    <div>
                                        <p className="font-bold text-sm">Review Submitted Successfully</p>
                                        <p className="text-xs opacity-80">Waiting for Department Admin approval.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
      </main>

      {/* --- FULL LIFECYCLE MODAL FOR FACULTY --- */}
      {infoDoc && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl animate-scale-in">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-lg font-bold text-gray-800">Detailed Lifecycle</h3>
                      <button onClick={() => setInfoDoc(null)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
                  </div>
                  
                  <div className="space-y-4 text-sm">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <p className="text-xs font-bold text-blue-800 uppercase">Tracking ID</p>
                          <p className="font-mono text-lg font-bold text-blue-900">{infoDoc.tracking_id}</p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                          <h4 className="text-xs font-bold text-gray-500 uppercase border-b pb-2">Timeline Events</h4>
                          
                          <div className="flex justify-between">
                              <span className="text-gray-600">1. Uploaded:</span> 
                              <span className="font-mono font-bold">{infoDoc.uploaded_at?.slice(0, 16).replace('T', ' ')}</span>
                          </div>
                          
                          <div className="flex justify-between">
                              <span className={infoDoc.sent_to_dept_at ? "text-gray-800 font-semibold" : "text-gray-400"}>2. Sent to Dept:</span> 
                              <span className="font-mono">{infoDoc.sent_to_dept_at?.slice(0, 16).replace('T', ' ') || '-'}</span>
                          </div>

                          <div className="flex justify-between pl-4 border-l-2 border-yellow-200">
                              <span className={infoDoc.assigned_to_faculty_at ? "text-gray-800 font-semibold" : "text-gray-400"}>↳ Faculty Assigned:</span> 
                              <span className="font-mono text-xs">{infoDoc.assigned_to_faculty_at?.slice(0, 16).replace('T', ' ') || '-'}</span>
                          </div>

                          <div className="flex justify-between pl-4 border-l-2 border-purple-200">
                              <span className={infoDoc.faculty_processed_at ? "text-gray-800 font-semibold" : "text-gray-400"}>↳ Faculty Reported:</span> 
                              <span className="font-mono text-xs">{infoDoc.faculty_processed_at?.slice(0, 16).replace('T', ' ') || '-'}</span>
                          </div>

                          <div className="flex justify-between">
                              <span className={infoDoc.dept_processed_at ? "text-gray-800 font-semibold" : "text-gray-400"}>3. Dept Approved:</span> 
                              <span className="font-mono">{infoDoc.dept_processed_at?.slice(0, 16).replace('T', ' ') || '-'}</span>
                          </div>

                          <div className="flex justify-between border-t pt-2 mt-2">
                              <span className={infoDoc.final_report_sent_at ? "text-green-700 font-bold" : "text-gray-400"}>4. Completed:</span> 
                              <span className="font-mono font-bold text-green-600">{infoDoc.final_report_sent_at?.slice(0, 16).replace('T', ' ') || '-'}</span>
                          </div>
                      </div>

                      <button onClick={() => setInfoDoc(null)} className="mt-4 w-full bg-gray-100 py-2 rounded font-bold hover:bg-gray-200">Close</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}