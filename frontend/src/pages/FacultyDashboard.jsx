import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';

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
      if(!file) return alert("Select PDF.");
      const formData = new FormData(); formData.append('report_file', file);
      try { await api.post(`/api/documents/${id}/dept_submit_report`, formData); alert("Sent!"); fetchDocs(); } catch(e) { alert("Failed."); }
  };

  const handleReturnToDept = async (id) => {
      if(!window.confirm("Return?")) return;
      try { await api.post(`/api/documents/${id}/return`); alert("Returned."); fetchDocs(); } catch(e) { alert("Failed."); }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8000/${path.replace(/\\/g, '/')}` : '#';

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10 flex justify-between items-end gap-4 border-b pb-6">
            <div><h1 className="text-3xl font-extrabold text-gray-900">Faculty Workspace</h1></div>
            <div className="flex gap-4">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs rounded-lg py-2 px-3 border shadow-sm"><option value="All">All</option><option value="Pending">Pending</option><option value="Submitted">Submitted</option></select>
                <div className="text-right bg-blue-50 px-4 py-2 rounded-lg"><span className="text-[10px] font-bold text-gray-400 uppercase block">Pending</span><span className="text-2xl font-extrabold text-blue-600">{docs.filter(d => d.status === 'With_Faculty').length}</span></div>
            </div>
        </div>

        <div className="space-y-6">
            {filteredDocs.map(doc => (
                <div key={doc._id} className="bg-white rounded-2xl shadow-sm border overflow-hidden transition">
                    <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">TASK</span>
                            <a href={getFileUrl(doc.file)} target="_blank" className="text-xl font-mono font-bold text-gray-900 hover:text-blue-600">{doc.tracking_id}</a>
                            <button onClick={() => setInfoDoc(doc)} className="text-gray-400 hover:text-blue-600 text-lg">ℹ️</button>
                        </div>
                        <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-gray-100 border">{doc.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="p-6">
                        {doc.status === 'With_Faculty' && (
                            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                                <div className="w-full lg:w-2/3"><input type="file" id={`report-${doc._id}`} className="block w-full text-sm file:bg-blue-50 border-0 rounded-lg"/></div>
                                <div className="flex gap-3 justify-end"><button onClick={() => handleReturnToDept(doc._id)} className="px-5 py-2.5 rounded-lg font-bold text-sm bg-gray-100">Return</button><button onClick={() => handleSubmitReport(doc._id, document.getElementById(`report-${doc._id}`).files[0])} className="px-6 py-2.5 rounded-lg font-bold text-sm text-white bg-blue-600 hover:bg-blue-700">Submit</button></div>
                            </div>
                        )}
                        {doc.status === 'Faculty_Reported' && <div className="bg-green-50 p-4 rounded text-green-800 font-bold">✅ Review Submitted</div>}
                    </div>
                </div>
            ))}
        </div>
      </main>

      {/* MODAL */}
      {infoDoc && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl">
                  <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="text-lg font-bold">Detailed Lifecycle</h3><button onClick={() => setInfoDoc(null)} className="text-xl">&times;</button></div>
                  <div className="space-y-4 text-sm">
                      <div className="bg-blue-50 p-3 rounded-lg border flex justify-between"><div><p className="text-xs font-bold uppercase">ID</p><p className="font-mono text-lg font-bold text-blue-900">{infoDoc.tracking_id}</p></div></div>
                      <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
                          <div className="flex justify-between"><span className="text-gray-600">Uploaded:</span><span className="font-mono">{infoDoc.uploaded_at?.slice(0, 16).replace('T', ' ')}</span></div>
                          <div className="flex justify-between pl-4 border-l-2"><span className="text-gray-600">↳ My Report:</span><span className="font-mono">{infoDoc.faculty_processed_at?.slice(0, 16).replace('T', ' ') || '-'}</span></div>
                          <div className="flex justify-between border-t pt-2"><span className="text-gray-800 font-bold">Completed:</span><span className="font-mono font-bold text-green-600">{infoDoc.final_report_sent_at?.slice(0, 16).replace('T', ' ') || '-'}</span></div>
                      </div>
                      <button onClick={() => setInfoDoc(null)} className="w-full bg-gray-100 py-2 rounded font-bold">Close</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}