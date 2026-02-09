import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function ClientDashboard() {
  const [file, setFile] = useState(null);
  const [priority, setPriority] = useState('Normal');
  const [docs, setDocs] = useState([]);
  const navigate = useNavigate();

  const fetchDocs = async () => {
    try {
        const res = await api.get('/documents/');
        setDocs(res.data);
    } catch (error) {
        console.error("Fetch error", error);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if(!file) return alert("Please select a file");
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('priority', priority);

    try {
        await api.post('/documents/', formData); 
        fetchDocs();
        setFile(null);
        alert('Document Uploaded Successfully!');
    } catch (error) {
        console.error("Upload Error:", error.response);
        alert("Upload Failed. Check console for details.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Client Portal</h1>
        <button onClick={() => {localStorage.clear(); navigate('/');}} className="text-red-600 hover:text-red-800 font-medium">Logout</button>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-white p-8 rounded-2xl shadow-lg mb-8 border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-700">Submit New Document</h2>
            <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-grow w-full">
                    <label className="block text-sm font-bold text-gray-600 mb-1">Select File (PDF/Image)</label>
                    <input type="file" onChange={e => setFile(e.target.files[0])} className="w-full border p-2 rounded-lg bg-gray-50" />
                </div>
                <div className="w-full md:w-48">
                    <label className="block text-sm font-bold text-gray-600 mb-1">Priority Level</label>
                    <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50">
                        <option>Normal</option>
                        <option>Urgent</option>
                    </select>
                </div>
                <button className="w-full md:w-auto bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold shadow hover:bg-blue-700 transition">
                    Upload & Process
                </button>
            </form>
        </div>

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
                        <th className="p-4">AI Processing</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {docs.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition">
                        {/* --- CLICKABLE TRACKING ID --- */}
                        <td className="p-4 font-mono font-medium">
                            <a 
                                href={`http://127.0.0.1:8000${doc.file}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2"
                            >
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
                        <td className="p-4">
                            {doc.priority === 'Urgent' ? <span className="text-red-500 font-bold">Urgent</span> : 'Normal'}
                        </td>
                        <td className="p-4 text-gray-500 text-sm">
                            {(doc.ai_confidence * 100).toFixed(0)}% Confidence
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
            {docs.length === 0 && <div className="p-8 text-center text-gray-400">No documents uploaded yet.</div>}
        </div>
      </div>
    </div>
  );
}