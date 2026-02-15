import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';

const formatIST = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function FacultyDashboard() {
  const [docs, setDocs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All"); 
  const [infoDoc, setInfoDoc] = useState(null); 

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

  const handleSubmitReport = async (id, file, note) => {
      if(!file) return alert("Please select a PDF file.");
      const formData = new FormData(); 
      formData.append('report_file', file);
      formData.append('note', note);
      try { await api.post(`/api/documents/${id}/dept_submit_report`, formData); alert("Sent!"); fetchDocs(); } catch(e) { alert("Failed."); }
  };

  const handleReturnToDept = async (id) => {
      const note = window.prompt("Reason for return?");
      if(!note) return;
      try { await api.post(`/api/documents/${id}/return`, { note }); alert("Returned."); fetchDocs(); } catch(e) { alert("Failed."); }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8000/${path.replace(/\\/g, '/')}` : '#';

  // 🔥 FORCE DOWNLOAD 🔥
  const handleForceDownload = (url, baseFilename) => {
      const extension = url.split('.').pop().split(/\#|\?/)[0];
      const filename = `${baseFilename}.${extension}`;
      fetch(url).then(response => response.blob()).then(blob => {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }).catch(() => window.open(url, '_blank'));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10 flex justify-between items-end gap-4 border-b pb-6">
            <div><h1 className="text-3xl font-extrabold text-gray-900">Faculty Workspace</h1></div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs rounded-lg py-2 px-3 border shadow-sm"><option value="All">All</option><option value="Pending">Pending</option><option value="Submitted">Submitted</option></select>
        </div>

        <div className="space-y-6">
            {filteredDocs.map(doc => (
                <div key={doc._id} className="bg-white rounded-2xl shadow-sm border overflow-hidden transition">
                    <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">TASK</span>
                            <a href={getFileUrl(doc.file)} target="_blank" rel="noreferrer" className="text-xl font-mono font-bold text-gray-900 hover:text-blue-600">{doc.tracking_id}</a>
                            <button onClick={() => setInfoDoc(doc)} className="text-gray-400 text-lg">ℹ️</button>
                        </div>
                        <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-gray-100 border">{doc.status}</span>
                    </div>
                    <div className="p-6">
                        {doc.status === 'With_Faculty' && (
                            <div className="flex flex-col gap-4">
                                <input id={`note-${doc._id}`} className="w-full border p-2 rounded text-sm" placeholder="Add remarks for Dept Admin..." />
                                <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                                    <div className="w-full lg:w-2/3"><input type="file" id={`report-${doc._id}`} className="block w-full text-sm file:bg-blue-50 border-0 rounded-lg"/></div>
                                    <div className="flex gap-3 justify-end">
                                        <button onClick={() => handleReturnToDept(doc._id)} className="px-5 py-2.5 rounded-lg font-bold text-sm bg-gray-100">Return</button>
                                        <button onClick={() => handleSubmitReport(doc._id, document.getElementById(`report-${doc._id}`).files[0], document.getElementById(`note-${doc._id}`).value)} className="px-6 py-2.5 rounded-lg font-bold text-sm text-white bg-blue-600 hover:bg-blue-700">Submit</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {doc.status === 'Faculty_Reported' && (
                            <div className="flex justify-between items-center">
                                <div className="bg-green-50 p-3 rounded text-green-800 font-bold text-sm">✅ Review Submitted</div>
                                {/* 🔥 DOWNLOAD OWN REPORT 🔥 */}
                                {doc.dept_report && (
                                    <div className="flex gap-2">
                                        <a href={getFileUrl(doc.dept_report)} target="_blank" rel="noreferrer" className="text-xs bg-white text-purple-700 px-3 py-1.5 rounded border">View</a>
                                        <button onClick={() => handleForceDownload(getFileUrl(doc.dept_report), `${doc.tracking_id}_report`)} className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded border">Download</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </main>

      {/* INFO MODAL WITH NOTES */}
      {infoDoc && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="text-lg font-bold">Details</h3><button onClick={() => setInfoDoc(null)} className="text-xl">&times;</button></div>
                  <div className="mb-4 bg-slate-50 p-3 rounded border max-h-40 overflow-y-auto">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Communication Log</p>
                      {infoDoc.notes && infoDoc.notes.length > 0 ? infoDoc.notes.map((n, i) => (<div key={i} className="text-xs border-b border-slate-200 pb-2 mb-2 last:border-0"><span className="font-bold text-blue-700">{n.sender} ({n.role}): </span><span className="text-slate-700">{n.message}</span><div className="text-[9px] text-slate-400">{formatIST(n.timestamp)}</div></div>)) : <p className="text-xs text-slate-400 italic">No notes.</p>}
                  </div>
                  <div className="space-y-4 text-sm">
                      <div className="flex justify-between"><span>Uploaded:</span><span className="font-mono">{formatIST(infoDoc.uploaded_at)}</span></div>
                      <button onClick={() => setInfoDoc(null)} className="w-full bg-gray-100 py-2 rounded font-bold">Close</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}