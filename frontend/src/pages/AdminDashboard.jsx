import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';
import ProfileModal from '../components/ProfileModal';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatIST, getFileUrl, forceDownload, DOC_STATUS, ROLES } from '../../constants';

export default function AdminDashboard() {
  const [docs, setDocs] = useState([]);
  const [depts, setDepts] = useState([]);
  const [users, setUsers] = useState([]); 
  const [deptStats, setDeptStats] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All"); 
  
  const [viewUserHistory, setViewUserHistory] = useState(null);
  const [routingDoc, setRoutingDoc] = useState(null);
  const [selectedRoutes, setSelectedRoutes] = useState([]); 
  const [docCategory, setDocCategory] = useState(""); // NEW: Category Selection
  const [infoDoc, setInfoDoc] = useState(null); 
  
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: ROLES.CLIENT, department: '', newDepartmentName: '' });
  const [actionNote, setActionNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);

  const fetchData = async () => {
    try {
      const [dRes, uRes, depRes, statRes, lRes] = await Promise.all([
        api.get('/api/documents'), 
        api.get('/api/users'), 
        api.get('/api/users/departments'),
        api.get('/api/users/stats'),
        api.get('/api/users/logs')
      ]);
      setDocs(Array.isArray(dRes?.data) ? dRes.data : []);
      setUsers(Array.isArray(uRes?.data) ? uRes.data : []);
      setDepts(Array.isArray(depRes?.data) ? depRes.data : []);
      setDeptStats(statRes?.data?.deptStats || []);
      setLogs(Array.isArray(lRes?.data) ? lRes.data : []);
    } catch (err) { console.error("Fetch error", err); }
  };

  useEffect(() => { fetchData(); }, []);

  const countState = (status) => docs.filter(d => d.status === status).length;
  const chartData = [
    { name: 'Pending', count: countState(DOC_STATUS.REVIEW_REQUIRED) + countState(DOC_STATUS.RETURNED_TO_MAIN), fill: '#F59E0B' },     
    { name: 'Active', count: countState(DOC_STATUS.IN_PROGRESS) + countState(DOC_STATUS.WITH_FACULTY) + countState(DOC_STATUS.FACULTY_REPORTED) + countState(DOC_STATUS.DEPT_REPORTED), fill: '#3B82F6' },        
    { name: 'Done', count: countState(DOC_STATUS.COMPLETED), fill: '#10B981' },        
    { name: 'Blocked', count: countState(DOC_STATUS.DECLINED) + countState(DOC_STATUS.FROZEN), fill: '#EF4444' }            
  ];

  const filteredDocs = docs.filter(doc => {
      if (filterStatus === "All") return true;
      if (filterStatus === "Action_Required") return [DOC_STATUS.REVIEW_REQUIRED, DOC_STATUS.RETURNED_TO_MAIN, DOC_STATUS.DEPT_REPORTED].includes(doc.status);
      if (filterStatus === "In_Progress") return [DOC_STATUS.IN_PROGRESS, DOC_STATUS.WITH_FACULTY, DOC_STATUS.FACULTY_REPORTED].includes(doc.status);
      if (filterStatus === "Completed") return doc.status === DOC_STATUS.COMPLETED;
      if (filterStatus === "Blocked") return [DOC_STATUS.DECLINED, DOC_STATUS.FROZEN].includes(doc.status);
      return true;
  });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try { 
        await api.post('/api/users/', newUser); 
        alert(`✅ User ${newUser.username} created!`); 
        setNewUser({ username: '', email: '', password: '', role: ROLES.CLIENT, department: '', newDepartmentName: '' }); 
        fetchData(); 
    } catch (error) { alert(error.response?.data?.error || "Failed to create user."); }
    finally { setIsProcessing(false); }
  };

  const toggleFreeze = async (id) => { try { await api.post(`/api/documents/${id}/freeze`); fetchData(); } catch (e) { alert("Freeze failed"); } };
  
  const declineDoc = async (id) => { 
      const note = window.prompt("Reason for declining? (Optional)");
      if(note === null) return;
      try { await api.post(`/api/documents/${id}/decline`, { note }); fetchData(); } catch (e) { alert("Decline failed"); } 
  };
  
  const toggleRouteSelection = (deptId) => {
      setSelectedRoutes(prev => 
          prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
      );
  };

  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    if (selectedRoutes.length === 0) {
        alert("Select at least one Dept Admin / Department");
        setIsProcessing(false);
        return;
    }
    if (!docCategory) {
        alert("Please select a Service Category (Testing, Consultancy, or Both).");
        setIsProcessing(false);
        return;
    }

    try { 
        await api.post(`/api/documents/${routingDoc._id}/route_to`, { 
            department_ids: selectedRoutes,
            doc_category: docCategory, // Include category
            note: actionNote
        }); 
        alert("Routed Successfully!"); 
        setRoutingDoc(null); 
        setSelectedRoutes([]); 
        setDocCategory(""); 
        setActionNote(""); 
        fetchData(); 
    } catch (error) { alert(error.response?.data?.error || "Failed to route."); }
    finally { setIsProcessing(false); }
  };

  const handleForwardToClient = async (id) => {
      if(!window.confirm("Forward Report to Client?")) return;
      try { await api.post(`/api/documents/${id}/forward_to_client`); fetchData(); setInfoDoc(null); } catch(e) { alert("Failed"); }
  };

  const handleSearchUser = async (q) => {
      setUserQuery(q);
      if(q.length > 2) {
          try {
              const res = await api.get(`/api/users/search?q=${encodeURIComponent(q)}`);
              setSearchResults(res.data || []);
          } catch(e) { console.error(e); setSearchResults([]); }
      } else {
          setSearchResults([]);
      }
  };

  const handleAdminUpload = async (e) => {
      e.preventDefault();
      if(!selectedUser || !uploadFile) return alert("Select user and file");
      setIsProcessing(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('target_user_id', selectedUser._id);
      try {
          await api.post('/api/documents/', formData);
          alert("Document Uploaded for Client!");
          setShowUploadModal(false);
          setSelectedUser(null);
          setUploadFile(null);
          fetchData();
      } catch (e) { alert(e.response?.data?.error || "Upload Failed"); }
      finally { setIsProcessing(false); }
  };

  const matchedDept = routingDoc?.ai_suggested_dept 
    ? depts.find(d => d.name.toLowerCase() === routingDoc.ai_suggested_dept.toLowerCase()) 
    : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar toggleHistory={() => setShowHistory(!showHistory)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex justify-between items-end mb-8">
            <div><h2 className="text-3xl font-extrabold text-slate-900">System Overview</h2><p className="text-slate-500 mt-1">Main Admin Control Panel</p></div>
            <div className="flex gap-3">
                <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-sm bg-blue-600 text-white hover:bg-blue-700 transition"><span>📤 Upload for Client</span></button>
                <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition ${showHistory ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}><span>{showHistory ? 'Close Logs' : '📜 Global Logs'}</span></button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {chartData.map((d, i) => (<div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition"><div><p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{d.name}</p><h3 className="text-3xl font-extrabold" style={{color: d.fill}}>{d.count}</h3></div><div className="w-4 h-4 rounded-full" style={{backgroundColor: d.fill}}></div></div>))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="font-bold text-slate-800 mb-4">Traffic</h3><div className="h-48 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} /><Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius:'8px'}} /><Bar dataKey="count" radius={[4,4,0,0]}>{chartData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar></BarChart></ResponsiveContainer></div></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Department Load</h3><div className="space-y-3">{deptStats.map((d, i) => (<div key={i} className="flex justify-between items-center text-sm"><span className="font-medium text-slate-600">{d.name}</span><span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{d.count} Pending</span></div>))}{deptStats.length === 0 && <p className="text-xs text-slate-400 italic">All departments clear.</p>}</div></div>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Provision User</h3>
                    <form onSubmit={handleCreateUser} className="space-y-3">
                        <input className="w-full border p-2 rounded text-xs outline-none focus:border-blue-500" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                        <input className="w-full border p-2 rounded text-xs outline-none focus:border-blue-500" placeholder="Email" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                        <input className="w-full border p-2 rounded text-xs outline-none focus:border-blue-500" placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                        <select className="w-full border p-2 rounded text-xs outline-none focus:border-blue-500" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                            <option value={ROLES.CLIENT}>Client</option>
                            <option value={ROLES.DEPT_ADMIN}>Dept Admin</option>
                        </select>
                        
                        {newUser.role === ROLES.DEPT_ADMIN && (
                            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Assign Department</label>
                                <select 
                                    className="w-full border p-2 rounded text-xs outline-none focus:border-blue-500" 
                                    value={newUser.department || ""} 
                                    onChange={e => setNewUser({...newUser, department: e.target.value, newDepartmentName: ''})}
                                >
                                    <option value="">-- Select Existing Department --</option>
                                    {depts.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                                <div className="text-center text-xs text-slate-400 font-bold">- OR -</div>
                                <input 
                                    className="w-full border p-2 rounded text-xs outline-none focus:border-blue-500" 
                                    placeholder="Create New Department Name" 
                                    value={newUser.newDepartmentName || ''} 
                                    onChange={e => setNewUser({...newUser, newDepartmentName: e.target.value, department: ''})} 
                                />
                            </div>
                        )}

                        <button disabled={isProcessing} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded font-bold text-xs transition disabled:opacity-50">Create Account</button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2"><h3 className="font-bold text-slate-800">Master Document Control</h3><span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-bold">{filteredDocs.length} Found</span></div>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs border-slate-200 rounded-lg py-2 px-3 bg-slate-50 font-semibold text-slate-600 outline-none border"><option value="All">All Documents</option><option value="Action_Required">Action Required</option><option value="In_Progress">Active Processing</option><option value="Completed">Completed</option><option value="Blocked">Blocked</option></select>
                    </div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0"><tr><th className="p-4">Tracking ID & AI</th><th className="p-4">Status & Fee</th><th className="p-4 text-center">Controls</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDocs.length === 0 ? <tr><td colSpan="3" className="text-center p-6 text-slate-400">No documents found.</td></tr> : filteredDocs.map(doc => (
                                    <tr key={doc._id} className="hover:bg-slate-50 transition">
                                        <td className="p-4">
                                            <a href={getFileUrl(doc.file)} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 font-bold hover:underline">{doc.tracking_id}</a>
                                            <div className="text-[10px] text-slate-400">Owner: {doc.client_username || 'Unknown'}</div>
                                            
                                            {doc.ai_suggested_dept && (
                                                <div className="text-[10px] text-purple-600 mt-1 font-bold flex items-center gap-1 bg-purple-50 inline-block px-2 py-0.5 rounded border border-purple-100" title="Click Route to review AI suggestion">
                                                    🤖 AI: {doc.ai_suggested_dept}
                                                </div>
                                            )}

                                            {doc.dept_report && (<div className="flex gap-2 mt-1"><a href={getFileUrl(doc.dept_report)} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold hover:bg-purple-100 transition">View</a><button onClick={() => forceDownload(getFileUrl(doc.dept_report), `${doc.tracking_id}_final`)} className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200 font-bold hover:bg-green-100 transition cursor-pointer">Download</button></div>)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${doc.status === DOC_STATUS.COMPLETED ? 'bg-green-50 text-green-700 border-green-200' : doc.status === DOC_STATUS.DECLINED ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{doc.status?.replace(/_/g, ' ')}</span>
                                                {doc.fee_total > 0 && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${doc.fee_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Fee: {doc.fee_status}</span>}
                                                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded uppercase">CAT: {doc.doc_category}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => setInfoDoc(doc)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition flex items-center justify-center" title="Details">ℹ️</button>
                                                <button onClick={() => toggleFreeze(doc._id)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition flex items-center justify-center text-sm" title={doc.is_frozen ? "Unfreeze" : "Freeze"}>{doc.is_frozen ? "🔒" : "❄️"}</button>
                                                <button onClick={() => { setRoutingDoc(doc); setSelectedRoutes(doc.current_dept?.map(d=>d._id) || []); setDocCategory(doc.doc_category === 'Pending' ? '' : doc.doc_category); }} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold border border-blue-200 hover:bg-blue-100 transition">Route</button>
                                                <button onClick={() => declineDoc(doc._id)} className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition flex items-center justify-center font-bold" title="Decline">✕</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showHistory && (
                <div className="fixed right-0 top-16 bottom-0 w-80 bg-white shadow-2xl border-l border-slate-200 p-4 z-30 overflow-y-auto animate-slide-in-right">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
                        <h3 className="font-bold text-slate-800 text-sm">Global Logs</h3>
                        <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-red-600 text-xl font-bold leading-none">×</button>
                    </div>
                    <div className="p-3 border-b"><input type="text" placeholder="Search logs..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)} className="w-full text-xs p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">{logs.filter(l => l.action?.toLowerCase().includes(logSearch.toLowerCase())).map(log => (<div key={log._id} className="text-xs p-2 bg-slate-50 border-l-2 border-blue-500 rounded"><span className="font-bold block text-blue-700">{log.user_username || 'System'}</span><span className="block font-semibold">{log.action}</span><span className="text-[9px] text-slate-400">{formatIST(log.timestamp)}</span></div>))}</div>
                </div>
            )}
        </div>
      </main>

      {/* --- MODALS --- */}
      {viewUserHistory && <ProfileModal targetUser={viewUserHistory} onClose={() => setViewUserHistory(null)} />}
      
      {/* ROUTING MODAL: Category Selector + Checkboxes & AI Box */}
      {routingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm animate-scale-in">
                <h3 className="text-xl font-bold mb-4">Route Document</h3>

                {/* AI SUGGESTION BOX */}
                {routingDoc.ai_suggested_dept && (
                    <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-300 shadow-sm rounded-lg flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-purple-900 font-extrabold text-sm">
                            <span className="text-2xl">🤖</span> AI Suggestion
                        </div>
                        <p className="text-xs text-purple-800 font-medium">
                            Dept: <strong className="bg-white px-1 py-0.5 rounded shadow-sm">{matchedDept ? matchedDept.name : 'N/A'}</strong> <br/>
                            Category: <strong className="bg-white px-1 py-0.5 rounded shadow-sm">{routingDoc.ai_suggested_category || 'N/A'}</strong><br/>
                            Confidence: {routingDoc.ai_confidence || 0}%
                        </p>
                        
                        {routingDoc.ai_suggested_dept && !matchedDept && (
                            <p className="text-[10px] text-red-500 italic mt-1 leading-tight">
                                Note: AI suggested "{routingDoc.ai_suggested_dept}", but no exact match was found.
                            </p>
                        )}
                        
                        {(matchedDept || routingDoc.ai_suggested_category) && (
                            <button 
                                type="button"
                                onClick={() => {
                                    if(matchedDept && !selectedRoutes.includes(matchedDept._id)) {
                                        setSelectedRoutes([...selectedRoutes, matchedDept._id]);
                                    }
                                    if (routingDoc.ai_suggested_category && ['Testing', 'Consultancy', 'Both'].includes(routingDoc.ai_suggested_category)) {
                                        setDocCategory(routingDoc.ai_suggested_category);
                                    }
                                }}
                                className="mt-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 px-4 rounded-lg shadow transition self-start"
                            >
                                + Apply Suggestion
                            </button>
                        )}
                    </div>
                )}

                <form onSubmit={handleRouteSubmit}>
                    
                    {/* NEW: Category Dropdown */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Service Category</label>
                        <select value={docCategory} onChange={e => setDocCategory(e.target.value)} className="w-full border p-3 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" required>
                            <option value="">-- Select Category --</option>
                            <option value="Testing">Testing (T)</option>
                            <option value="Consultancy">Consultancy (C)</option>
                            <option value="Both">Testing & Consultancy (TC)</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Dept Admins</label>
                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-2 space-y-1">
                            {depts.map(d => (
                                <label key={d._id} className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer transition">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        checked={selectedRoutes.includes(d._id)}
                                        onChange={() => toggleRouteSelection(d._id)}
                                    />
                                    <span className="text-sm font-semibold text-slate-700">{d.name}</span>
                                </label>
                            ))}
                            {depts.length === 0 && <p className="text-xs text-slate-400 italic p-2">No departments available.</p>}
                        </div>
                    </div>

                    <textarea className="w-full border p-3 rounded-lg mb-6 bg-slate-50 text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Add remarks..." value={actionNote} onChange={(e) => setActionNote(e.target.value)}></textarea>
                    
                    <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => { setRoutingDoc(null); setSelectedRoutes([]); setDocCategory(''); }} className="px-4 py-2 text-slate-600 font-bold">Cancel</button>
                        <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow disabled:opacity-50">Confirm Route</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md animate-scale-in">
                  <h3 className="text-xl font-bold mb-4">Offline Document Upload</h3>
                  {!selectedUser ? (
                      <div className="mb-4 relative">
                          <label className="block text-xs font-bold mb-1">Find Client (Name/Email)</label>
                          <input className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500" value={userQuery} onChange={e => handleSearchUser(e.target.value)} placeholder="Type to search..." />
                          {searchResults.length > 0 && (
                              <div className="absolute w-full bg-white border shadow-lg mt-1 max-h-40 overflow-y-auto z-10 rounded">
                                  {searchResults.map(u => (
                                      <div key={u._id} onClick={() => { setSelectedUser(u); setSearchResults([]); }} className="p-2 hover:bg-blue-50 cursor-pointer text-sm">
                                          {u.username} <span className="text-gray-400 text-xs">({u.email})</span>
                                      </div>
                                  ))}
                              </div>
                          )}
                          <div className="mt-2 text-center text-xs text-gray-500">User not found? Create them in 'Provision User' first.</div>
                      </div>
                  ) : (
                      <div className="mb-4 bg-blue-50 p-3 rounded flex justify-between items-center border border-blue-100">
                          <span className="font-bold text-blue-800 text-sm">{selectedUser.username}</span>
                          <button onClick={() => setSelectedUser(null)} className="text-red-500 text-xs font-bold hover:underline">Change</button>
                      </div>
                  )}
                  <form onSubmit={handleAdminUpload}>
                      <input type="file" required className="w-full mb-4 text-sm file:bg-blue-50 file:border-0 file:rounded file:px-3 file:py-1 file:text-blue-700" onChange={e => setUploadFile(e.target.files[0])} />
                      <div className="flex gap-3 justify-end">
                          <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-slate-600 font-bold">Cancel</button>
                          <button disabled={!selectedUser || isProcessing} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow disabled:opacity-50">Upload</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
      
      {/* INFO MODAL */}
      {infoDoc && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl animate-scale-in">
                  <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="text-lg font-bold">Document Lifecycle</h3><button onClick={() => setInfoDoc(null)} className="text-xl font-bold text-slate-400 hover:text-red-500">&times;</button></div>
                  <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Communication Log</p>
                      {infoDoc.notes && infoDoc.notes.length > 0 ? infoDoc.notes.map((n, i) => (
                          <div key={i} className="text-xs border-b border-slate-200 pb-2 mb-2 last:border-0">
                              <span className="font-bold text-blue-700">{n.sender} ({n.role}): </span>
                              <span className="text-slate-700">{n.message}</span>
                              <div className="text-[9px] text-slate-400 mt-0.5">{formatIST(n.timestamp)}</div>
                          </div>
                      )) : <p className="text-xs text-slate-400 italic">No notes available.</p>}
                  </div>
                  <div className="space-y-4 text-sm">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between"><div><p className="text-xs font-bold text-blue-800 uppercase">ID</p><p className="font-mono text-lg font-bold text-blue-900">{infoDoc.tracking_id}</p><span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded uppercase mt-1 inline-block border">Category: {infoDoc.doc_category}</span></div><div className="text-right"><p className="text-xs font-bold text-blue-800 uppercase">Fee</p><p className="font-bold">{infoDoc.fee_status}</p></div></div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                          <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-2">Timeline Events</h4>
                          <div className="flex justify-between"><span className="text-slate-600">Uploaded:</span><span className="font-mono">{formatIST(infoDoc.uploaded_at)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-600">Sent to Dept:</span><span className="font-mono">{infoDoc.sent_to_dept_at ? formatIST(infoDoc.sent_to_dept_at) : '-'}</span></div>
                          
                          {infoDoc.current_dept && infoDoc.current_dept.length > 0 && (
                               <div className="flex justify-between pl-4 text-xs"><span className="text-slate-500">↳ Assigned Dept Admins:</span><span className="font-bold text-blue-600 text-right">{infoDoc.current_dept.map(d => d.name).join(', ')}</span></div>
                          )}

                          <div className="flex justify-between pl-4 border-l-2 border-yellow-200"><span className="text-slate-600">↳ Faculty Assigned:</span><span className="font-mono text-xs">{infoDoc.assigned_to_faculty_at ? formatIST(infoDoc.assigned_to_faculty_at) : '-'}</span></div>
                          
                          {infoDoc.current_faculty && infoDoc.current_faculty.length > 0 && (
                               <div className="flex justify-between pl-8 text-xs"><span className="text-slate-500">↳ Assigned Staff:</span><span className="font-bold text-orange-600 text-right">{infoDoc.current_faculty.map(f => f.username).join(', ')}</span></div>
                          )}

                          <div className="flex justify-between pl-4 border-l-2 border-purple-200"><span className="text-slate-600">↳ Faculty Reported:</span><span className="font-mono text-xs">{infoDoc.faculty_processed_at ? formatIST(infoDoc.faculty_processed_at) : '-'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-600">Dept Approved:</span><span className="font-mono">{infoDoc.dept_processed_at ? formatIST(infoDoc.dept_processed_at) : '-'}</span></div>
                          <div className="flex justify-between border-t pt-2 mt-2"><span className="text-slate-800 font-bold">Completed:</span><span className="font-mono font-bold text-green-600">{infoDoc.final_report_sent_at ? formatIST(infoDoc.final_report_sent_at) : '-'}</span></div>
                      </div>
                      
                      {infoDoc.fee_total > 0 && (
                          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                              <span className="text-xs font-bold text-blue-800 uppercase block mb-2">Financial Lifecycle (₹{infoDoc.fee_total})</span>
                              {infoDoc.installments?.map((inst, idx) => (
                                  <div key={inst._id} className="flex justify-between items-center text-xs mt-1 border-b border-blue-100 pb-1 last:border-0">
                                      <span className="text-slate-600">↳ {idx===0 ? "Advance" : "Balance"} (₹{inst.amount}):</span>
                                      <div className="flex items-center gap-2">
                                          <span className={inst.status==='Paid'?"text-green-600 font-bold":"text-red-500 font-bold"}>{inst.status === 'Paid' ? `Paid: ${formatIST(inst.paid_at)}` : 'Unpaid'}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                      
                      {infoDoc.dept_report && (<div className="mt-4 flex gap-2"><a href={getFileUrl(infoDoc.dept_report)} target="_blank" rel="noopener noreferrer" className="flex-1 block text-center bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700 transition">View Report</a><button onClick={() => forceDownload(getFileUrl(infoDoc.dept_report), `${infoDoc.tracking_id}_report`)} className="flex-1 block text-center bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 transition">Download Report</button></div>)}
                      {infoDoc.status === DOC_STATUS.DEPT_REPORTED && (<button onClick={() => handleForwardToClient(infoDoc._id)} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow hover:bg-green-700 mt-2 transition">Forward Final Report to Client</button>)}
                      <button onClick={() => setInfoDoc(null)} className="w-full bg-slate-100 py-2 rounded-lg font-bold hover:bg-slate-200 mt-2 transition">Close</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}