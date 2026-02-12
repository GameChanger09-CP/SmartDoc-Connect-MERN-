import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';

export default function DeptDashboard() {
  const [docs, setDocs] = useState([]);
  const [faculty, setFaculty] = useState([]); 
  const [filterStatus, setFilterStatus] = useState("All"); 
  const [infoDoc, setInfoDoc] = useState(null);
  const [newFaculty, setNewFaculty] = useState({ username: '', email: '', password: '', role: 'Faculty' });

  const fetchData = async () => {
    try {
        const [docRes, facRes] = await Promise.all([
            api.get('/api/documents/'),
            api.get('/api/faculty/') 
        ]);
        setDocs(Array.isArray(docRes.data) ? docRes.data : docRes.data.results || []);
        setFaculty(facRes.data || []);
    } catch (error) { console.error("Fetch error", error); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- FILTER LOGIC ---
  const filteredDocs = docs.filter(doc => {
      if (filterStatus === "All") return true;
      if (filterStatus === "Action_Required") return doc.status === 'In_Progress';
      if (filterStatus === "With_Faculty") return doc.status === 'With_Faculty';
      if (filterStatus === "Review_Ready") return doc.status === 'Faculty_Reported';
      return true;
  });

  // --- ACTIONS ---
  const handleCreateFaculty = async (e) => {
      e.preventDefault();
      try {
          await api.post('/api/users/', newFaculty);
          alert(`✅ Faculty member ${newFaculty.username} created!`);
          setNewFaculty({ username: '', email: '', password: '', role: 'Faculty' });
          fetchData();
      } catch (error) { 
          alert(error.response?.data?.error || "Failed to create faculty."); 
      }
  };

  const handleAssignToFaculty = async (docId, facultyId) => {
      if(!facultyId) return alert("Select a faculty member first.");
      try {
          await api.post(`/api/documents/${docId}/assign_faculty`, { faculty_id: facultyId });
          alert("Assigned to Faculty!"); fetchData();
      } catch (e) { alert("Assignment failed."); }
  };

  const handleReturnToMain = async (docId) => {
      if(!window.confirm("Return this to Main Admin?")) return;
      try { await api.post(`/api/documents/${docId}/return`); alert("Returned."); fetchData(); } 
      catch (e) { alert("Failed."); }
  };

  const handleApproveFacultyReport = async (docId) => {
      if(!window.confirm("Approve report and send to Main Admin?")) return;
      try { await api.post(`/api/documents/${docId}/approve_faculty_report`); alert("Approved!"); fetchData(); } 
      catch (e) { alert("Failed."); }
  };

  const handleSubmitReport = async (id, file) => {
      if(!file) return alert("Select PDF first");
      const formData = new FormData();
      formData.append('report_file', file);
      try { await api.post(`/api/documents/${id}/dept_submit_report/`, formData); alert("Sent!"); fetchData(); } 
      catch(e) { alert("Failed."); }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8000/${path.replace(/\\/g, '/')}` : '#';

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* STATS HEADER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
                <div><p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Pending</p><h3 className="text-3xl font-extrabold text-blue-600">{docs.filter(d => d.status === 'In_Progress').length}</h3></div>
                <div className="text-2xl bg-blue-50 p-3 rounded-xl">📄</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
                <div><p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Faculty Staff</p><h3 className="text-3xl font-extrabold text-orange-600">{faculty.length}</h3></div>
                <div className="text-2xl bg-orange-50 p-3 rounded-xl">👨‍🏫</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
                <div><p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Active Reviews</p><h3 className="text-3xl font-extrabold text-purple-600">{docs.filter(d => d.status === 'With_Faculty').length}</h3></div>
                <div className="text-2xl bg-purple-50 p-3 rounded-xl">👀</div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* LEFT: Faculty Management */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Add Faculty</h3>
                    <form onSubmit={handleCreateFaculty} className="space-y-3">
                        <input className="w-full border p-2 rounded text-xs bg-gray-50" placeholder="Username" value={newFaculty.username} onChange={e => setNewFaculty({...newFaculty, username: e.target.value})} required />
                        <input className="w-full border p-2 rounded text-xs bg-gray-50" placeholder="Email" type="email" value={newFaculty.email} onChange={e => setNewFaculty({...newFaculty, email: e.target.value})} required />
                        <input className="w-full border p-2 rounded text-xs bg-gray-50" placeholder="Password" type="password" value={newFaculty.password} onChange={e => setNewFaculty({...newFaculty, password: e.target.value})} required />
                        <button className="w-full bg-orange-600 text-white py-2 rounded font-bold text-xs hover:bg-orange-700 transition">Create Account</button>
                    </form>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Your Team</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {faculty.map(fac => (
                            <div key={fac._id} className="p-2 bg-gray-50 border rounded text-xs font-bold text-gray-700 flex justify-between items-center">
                                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> {fac.username}</span>
                            </div>
                        ))}
                        {faculty.length === 0 && <p className="text-xs text-gray-400">No faculty members yet.</p>}
                    </div>
                </div>
            </div>

            {/* RIGHT: Document Workflow */}
            <div className="lg:col-span-3 space-y-6">
                
                {/* FILTER HEADER */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800">Task Inbox</h3>
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="text-xs border-gray-200 rounded-lg py-2 px-3 bg-gray-50 font-semibold text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none border shadow-sm"
                    >
                        <option value="All">All Tasks</option>
                        <option value="Action_Required">Action Required (New)</option>
                        <option value="With_Faculty">Assigned to Faculty</option>
                        <option value="Review_Ready">Ready for Approval</option>
                    </select>
                </div>

                {/* DOC LIST */}
                {filteredDocs.length === 0 ? <div className="text-center py-20 bg-white rounded-2xl border border-dashed text-gray-400">No matching tasks found.</div> : filteredDocs.map(doc => (
                    <div key={doc._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <a href={getFileUrl(doc.file)} target="_blank" rel="noopener noreferrer" className="text-xl font-mono font-bold text-blue-600 hover:underline">{doc.tracking_id}</a>
                                    {/* INFO BUTTON FOR LIFECYCLE */}
                                    <button onClick={() => setInfoDoc(doc)} className="text-gray-400 hover:text-blue-600 text-lg">ℹ️</button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Client: <strong>{doc.client_username}</strong> • Uploaded: {doc.uploaded_at?.slice(0, 10)}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                                doc.status === 'Faculty_Reported' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>{doc.status.replace(/_/g, ' ')}</span>
                        </div>

                        {/* WORKFLOW ACTIONS */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            
                            {/* CASE 1: New Doc - Assign or Self-Process */}
                            {doc.status === 'In_Progress' && (
                                <div className="flex flex-col md:flex-row gap-4 items-center">
                                    <div className="flex-grow flex gap-2 w-full">
                                        <select id={`fac-${doc._id}`} className="flex-grow p-2 border rounded text-sm bg-white">
                                            <option value="">-- Assign to Faculty --</option>
                                            {faculty.map(f => <option key={f._id} value={f._id}>{f.username}</option>)}
                                        </select>
                                        <button onClick={() => handleAssignToFaculty(doc._id, document.getElementById(`fac-${doc._id}`).value)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">Assign</button>
                                    </div>
                                    <div className="text-xs text-gray-400 font-bold uppercase">OR</div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <input type="file" id={`file-${doc._id}`} className="text-xs w-48 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-white"/>
                                        <button onClick={() => handleSubmitReport(doc._id, document.getElementById(`file-${doc._id}`).files[0])} className="bg-orange-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-orange-700">Self-Upload</button>
                                    </div>
                                    <button onClick={() => handleReturnToMain(doc._id)} className="text-red-500 hover:text-red-700 text-xs font-bold underline">Return</button>
                                </div>
                            )}

                            {/* CASE 2: Waiting for Faculty */}
                            {doc.status === 'With_Faculty' && (
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-blue-600 font-bold">⏳ Currently with: {doc.current_faculty?.username}</p>
                                    <button onClick={() => handleAssignToFaculty(doc._id, null)} className="text-xs text-gray-500 underline hover:text-red-500">Re-assign</button>
                                </div>
                            )}

                            {/* CASE 3: Faculty Finished - Needs Approval */}
                            {doc.status === 'Faculty_Reported' && (
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">✅</span>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Faculty Report Ready</p>
                                            <a href={getFileUrl(doc.dept_report)} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline">View PDF Report</a>
                                        </div>
                                    </div>
                                    <button onClick={() => handleApproveFacultyReport(doc._id)} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-green-700 transition">Approve & Send to Admin</button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </main>

      {/* --- INFO MODAL (FULL DETAILED LIFECYCLE) --- */}
      {infoDoc && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl animate-scale-in">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-lg font-bold text-gray-800">Document Lifecycle</h3>
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

                      {/* BUTTON TO FORWARD TO CLIENT (ONLY IF READY) */}
                      {infoDoc.status === 'Dept_Reported' && (
                          <button onClick={() => handleApproveFacultyReport(infoDoc._id)} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow hover:bg-green-700 mt-2">
                              Forward Final Report to Client
                          </button>
                      )}
                      
                      <button onClick={() => setInfoDoc(null)} className="mt-2 w-full bg-gray-100 py-2 rounded font-bold hover:bg-gray-200">Close</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}