import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function DeptDashboard() {
  const [docs, setDocs] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [faculty, setFaculty] = useState([]); 
  const [showHistory, setShowHistory] = useState(false);
  const [infoDoc, setInfoDoc] = useState(null);

  const [newFaculty, setNewFaculty] = useState({ username: '', email: '', password: '', role: 'Faculty' });

  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Dept'; 
  const role = localStorage.getItem('role') || 'Dept_Admin';

  const fetchData = async () => {
    try {
        const [docRes, logRes, facRes] = await Promise.all([
            api.get('/api/documents/'),
            api.get('/api/logs/'),
            api.get('/api/faculty/') 
        ]);
        setDocs(Array.isArray(docRes.data) ? docRes.data : docRes.data.results || []);
        setLogs(Array.isArray(logRes.data) ? logRes.data : logRes.data.results || []);
        setFaculty(facRes.data || []);
    } catch (error) { console.error("Fetch error", error); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- ACTIONS ---
  const handleCreateFaculty = async (e) => {
      e.preventDefault();
      try {
          await api.post('/api/users/', newFaculty);
          alert(`✅ Faculty member ${newFaculty.username} created successfully!`);
          setNewFaculty({ username: '', email: '', password: '', role: 'Faculty' });
          fetchData();
      } catch (error) { 
          alert(error.response?.data?.error || "Failed to create faculty. Please check your network."); 
      }
  };

  const handleAssignToFaculty = async (docId, facultyId) => {
      if(!facultyId) return alert("Select a faculty member first.");
      try {
          await api.post(`/api/documents/${docId}/assign_faculty`, { faculty_id: facultyId });
          alert("Assigned to Faculty!");
          fetchData();
      } catch (e) { alert("Assignment failed."); }
  };

  const handleReturnToMain = async (docId) => {
      if(!window.confirm("Return this to Main Admin? (Not your department's task?)")) return;
      try {
          await api.post(`/api/documents/${docId}/return`);
          alert("Returned to Main Admin.");
          fetchData();
      } catch (e) { alert("Failed to return."); }
  };

  const handleApproveFacultyReport = async (docId) => {
      if(!window.confirm("Approve this report and send to Main Admin?")) return;
      try {
          await api.post(`/api/documents/${docId}/approve_faculty_report`);
          alert("Report Approved & Forwarded!");
          fetchData();
      } catch (e) { alert("Failed to approve."); }
  };

  const handleSubmitReport = async (id, file) => {
      if(!file) return alert("Select PDF first");
      const formData = new FormData();
      formData.append('report_file', file);
      try {
          await api.post(`/api/documents/${id}/dept_submit_report/`, formData);
          alert("Report Sent Successfully!");
          fetchData();
      } catch(e) { alert("Failed to send report"); }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8000/${path.replace(/\\/g, '/')}` : '#';

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b border-orange-100 p-6 mb-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-3xl">📂</div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{username.toUpperCase()}</h1>
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{role.replace('_', ' ')}</span>
                </div>
            </div>
            <button onClick={() => {localStorage.clear(); navigate('/');}} className="bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-bold text-red-600 transition">Logout</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEFT COLUMN: Faculty Management */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
                <h2 className="text-lg font-bold mb-4 text-orange-800 border-b pb-2">👨‍🏫 Create Faculty</h2>
                <form onSubmit={handleCreateFaculty} className="space-y-3">
                    <input className="w-full border p-2 rounded text-sm bg-gray-50 focus:bg-white transition" placeholder="Username" value={newFaculty.username} onChange={e => setNewFaculty({...newFaculty, username: e.target.value})} required />
                    <input className="w-full border p-2 rounded text-sm bg-gray-50 focus:bg-white transition" placeholder="Email" type="email" value={newFaculty.email} onChange={e => setNewFaculty({...newFaculty, email: e.target.value})} required />
                    <input className="w-full border p-2 rounded text-sm bg-gray-50 focus:bg-white transition" placeholder="Password" type="password" value={newFaculty.password} onChange={e => setNewFaculty({...newFaculty, password: e.target.value})} required />
                    <button className="w-full bg-orange-600 text-white py-2 rounded font-bold hover:bg-orange-700 transition">Add Faculty</button>
                </form>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
                <h2 className="text-lg font-bold mb-3 text-gray-800 border-b pb-2">Your Faculty Staff</h2>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {faculty.length === 0 ? <p className="text-xs text-gray-400 italic">No faculty added yet.</p> : 
                        faculty.map(fac => (
                            <div key={fac._id} className="p-2 bg-gray-50 border rounded text-sm font-bold text-gray-700 flex justify-between items-center">
                                <span>👤 {fac.username}</span>
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: Task List */}
        <div className="lg:col-span-3 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <h2 className="text-xl font-bold mb-6 text-gray-800">Department Task Inbox</h2>
            {docs.length === 0 ? <p className="text-gray-400 italic">No active tasks.</p> : (
                <div className="space-y-6">
                    {docs.map(doc => (
                        <div key={doc._id} className={`p-5 rounded-xl border-l-4 shadow-sm transition ${doc.status === 'Faculty_Reported' ? 'bg-purple-50 border-purple-500' : 'bg-gray-50 border-orange-500'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <a href={getFileUrl(doc.file)} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline font-mono text-lg">{doc.tracking_id} ↗</a>
                                    <p className="text-xs font-bold text-gray-700 mt-1">Client: {doc.client_username}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${doc.status === 'Faculty_Reported' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-white text-gray-700'}`}>
                                        {doc.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>

                            {/* Actions based on Status */}
                            {doc.status === 'In_Progress' && (
                                <div className="mt-4 pt-4 border-t flex flex-wrap gap-3 items-center">
                                    {/* Option 1: Assign to Faculty */}
                                    <div className="flex gap-2 flex-grow">
                                        <select id={`fac-select-${doc._id}`} className="p-2 border rounded text-sm bg-white flex-grow">
                                            <option value="">-- Assign to Faculty --</option>
                                            {faculty.map(f => <option key={f._id} value={f._id}>{f.username}</option>)}
                                        </select>
                                        <button onClick={() => handleAssignToFaculty(doc._id, document.getElementById(`fac-select-${doc._id}`).value)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 transition shadow-sm">Assign</button>
                                    </div>
                                    
                                    {/* Option 2: Self Upload */}
                                    <div className="flex gap-2 items-center border-l border-gray-300 pl-4">
                                        <input type="file" id={`file-${doc._id}`} className="text-xs w-48 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-200 hover:file:bg-gray-300"/>
                                        <button onClick={() => handleSubmitReport(doc._id, document.getElementById(`file-${doc._id}`).files[0])} className="bg-orange-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-orange-700 transition shadow-sm">Upload Report</button>
                                    </div>

                                    {/* Option 3: Return to Main */}
                                    <button onClick={() => handleReturnToMain(doc._id)} className="ml-auto text-red-600 text-sm font-bold hover:underline">Return to Main Admin</button>
                                </div>
                            )}

                            {doc.status === 'With_Faculty' && (
                                <p className="mt-3 text-sm text-blue-700 font-bold bg-blue-50 border border-blue-100 p-3 rounded inline-block shadow-sm">⏳ Currently assigned to: {doc.current_faculty?.username}</p>
                            )}

                            {doc.status === 'Faculty_Reported' && (
                                <div className="mt-4 pt-4 border-t border-purple-200 flex justify-between items-center">
                                    <a href={getFileUrl(doc.dept_report)} target="_blank" rel="noopener noreferrer" className="text-purple-700 font-bold hover:underline flex items-center gap-2">📄 View Faculty's PDF Report</a>
                                    <button onClick={() => handleApproveFacultyReport(doc._id)} className="bg-purple-600 text-white px-6 py-2 rounded font-bold shadow hover:bg-purple-700 transition transform hover:-translate-y-0.5">Approve & Send to Main Admin</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}