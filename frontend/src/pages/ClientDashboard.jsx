import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';

export default function ClientDashboard() {
  const [file, setFile] = useState(null);
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

  // --- FILTER LOGIC ---
  const filteredDocs = docs.filter(doc => {
      if (filterStatus === "All") return true;
      if (filterStatus === "Active") return doc.status !== 'Completed' && doc.status !== 'Declined';
      if (filterStatus === "Completed") return doc.status === 'Completed';
      return true;
  });

  const handleUpload = async (e) => {
    e.preventDefault();
    if(!file) return alert("Please select a file");
    const formData = new FormData();
    formData.append('file', file);
    try { await api.post('/api/documents/', formData); fetchDocs(); setFile(null); alert('Uploaded!'); } 
    catch (error) { alert("Upload Failed."); }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8000/${path.replace(/\\/g, '/')}` : '#';

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      <div className="max-w-6xl mx-auto p-6 py-10">
        
        {/* Welcome Section */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-4">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900">My Documents</h1>
                <p className="text-gray-500 mt-2">Track the live status of your submissions.</p>
            </div>
            <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs border-gray-200 rounded-lg py-2 px-3 bg-white font-semibold text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none border shadow-sm"
            >
                <option value="All">All Documents</option>
                <option value="Active">Active / Pending</option>
                <option value="Completed">Completed</option>
            </select>
        </div>

        {/* Upload Card */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 mb-10 flex flex-col md:flex-row items-center gap-6">
            <div className="bg-blue-50 p-4 rounded-full text-blue-600 text-3xl">📄</div>
            <div className="flex-grow">
                <h3 className="text-lg font-bold text-gray-800">Submit New Application</h3>
                <p className="text-sm text-gray-500">Upload PDF or Image files for verification.</p>
            </div>
            <form onSubmit={handleUpload} className="flex gap-3 w-full md:w-auto">
                <input type="file" onChange={e => setFile(e.target.files[0])} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition">Upload</button>
            </form>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map(doc => (
                <div key={doc._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition relative overflow-hidden group">
                    <div className={`absolute top-0 left-0 w-1 h-full ${doc.status === 'Completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    
                    <div className="flex justify-between items-start mb-4">
                        <span className="font-mono text-xs font-bold text-gray-400 uppercase">{doc.tracking_id}</span>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${doc.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{doc.status.replace(/_/g, ' ')}</span>
                    </div>
                    
                    <h4 className="font-bold text-gray-800 mb-2 truncate">Application Document</h4>
                    <p className="text-xs text-gray-500 mb-6">Uploaded: {doc.uploaded_at?.slice(0, 10)}</p>

                    <div className="flex justify-between items-center border-t border-gray-50 pt-4">
                        <button onClick={() => setInfoDoc(doc)} className="text-sm font-bold text-blue-600 hover:underline">View Status</button>
                        {doc.status === 'Completed' && doc.dept_report && (
                            <a href={getFileUrl(doc.dept_report)} target="_blank" rel="noopener noreferrer" className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-bold hover:bg-green-200">⬇ Report</a>
                        )}
                    </div>
                </div>
            ))}
            {filteredDocs.length === 0 && <div className="col-span-full text-center text-gray-400 italic py-10">No documents match this filter.</div>}
        </div>
      </div>

      {/* --- SIMPLIFIED CLIENT MODAL (No Internal Steps) --- */}
      {infoDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl animate-scale-in">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-800">Document Status</h3>
                    <button onClick={() => setInfoDoc(null)} className="text-xl font-bold text-gray-400 hover:text-red-500">&times;</button>
                </div>
                
                <div className="space-y-4 text-sm">
                    {/* Header Info */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                        <p className="text-xs font-bold text-blue-800 uppercase">Tracking ID</p>
                        <p className="font-mono text-2xl font-extrabold text-blue-900">{infoDoc.tracking_id}</p>
                    </div>

                    {/* Simplified Timeline */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-6">
                        {/* Step 1: Submission */}
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl">📤</div>
                            <div>
                                <p className="font-bold text-gray-800">Submission Received</p>
                                <p className="text-xs text-gray-500">{infoDoc.uploaded_at?.slice(0, 16).replace('T', ' ')}</p>
                            </div>
                        </div>

                        {/* Step 2: Processing (Generic) */}
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${infoDoc.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600 animate-pulse'}`}>
                                {infoDoc.status === 'Completed' ? '✅' : '⚙️'}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">Internal Processing</p>
                                <p className="text-xs text-gray-500">
                                    {infoDoc.status === 'Completed' ? 'Verification Complete' : 'Currently under review by our team.'}
                                </p>
                            </div>
                        </div>

                        {/* Step 3: Completion (Only shows if done) */}
                        {infoDoc.status === 'Completed' && (
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl">📬</div>
                                <div className="flex-grow">
                                    <p className="font-bold text-gray-800">Final Report Delivered</p>
                                    <p className="text-xs text-gray-500">{infoDoc.final_report_sent_at?.slice(0, 16).replace('T', ' ')}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Download Button */}
                    {infoDoc.status === 'Completed' && infoDoc.dept_report && (
                        <a href={getFileUrl(infoDoc.dept_report)} target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow hover:bg-green-700 mt-2">
                            Download Final Report
                        </a>
                    )}
                    
                    <button onClick={() => setInfoDoc(null)} className="w-full bg-white border border-gray-300 py-2 rounded font-bold text-gray-600 hover:bg-gray-50 mt-2">Close</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}