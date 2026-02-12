import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';
import ProfileModal from '../components/ProfileModal';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AdminDashboard() {
  const [docs, setDocs] = useState([]);
  const [depts, setDepts] = useState([]);
  const [users, setUsers] = useState([]); 
  const [deptStats, setDeptStats] = useState([]);
  const [logs, setLogs] = useState([]);

  // UI States
  const [showHistory, setShowHistory] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All"); // <-- NEW FILTER STATE
  
  const [viewUserHistory, setViewUserHistory] = useState(null);
  const [routingDoc, setRoutingDoc] = useState(null);
  const [infoDoc, setInfoDoc] = useState(null); 
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'Client' });

  const fetchData = async () => {
    try {
      const [dRes, uRes, depRes, statRes, lRes] = await Promise.all([
        api.get('/api/documents'), 
        api.get('/api/users'), 
        api.get('/api/departments'),
        api.get('/api/stats'),
        api.get('/api/logs')
      ]);
      setDocs(Array.isArray(dRes.data) ? dRes.data : dRes.data.results || []);
      setUsers(Array.isArray(uRes.data) ? uRes.data : uRes.data.results || []);
      setDepts(Array.isArray(depRes.data) ? depRes.data : depRes.data.results || []);
      setDeptStats(statRes.data.deptStats || []);
      setLogs(Array.isArray(lRes.data) ? lRes.data : lRes.data.results || []);
    } catch (err) { console.error("Fetch error", err); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- ANALYTICS ---
  const countState = (status) => docs.filter(d => d.status === status).length;
  const stats = {
    pending: countState('Review_Required') + countState('Returned_To_Main'),
    active: countState('In_Progress') + countState('With_Faculty') + countState('Faculty_Reported') + countState('Dept_Reported'),
    completed: countState('Completed'),
    blocked: countState('Declined') + countState('Frozen')
  };

  const chartData = [
    { name: 'Pending', count: stats.pending, fill: '#F59E0B' },     
    { name: 'Active', count: stats.active, fill: '#3B82F6' },        
    { name: 'Done', count: stats.completed, fill: '#10B981' },       
    { name: 'Blocked', count: stats.blocked, fill: '#EF4444' }           
  ];

  // --- FILTER LOGIC (NEW) ---
  const filteredDocs = docs.filter(doc => {
      if (filterStatus === "All") return true;
      if (filterStatus === "Action_Required") return ['Review_Required', 'Returned_To_Main', 'Dept_Reported'].includes(doc.status);
      if (filterStatus === "In_Progress") return ['In_Progress', 'With_Faculty', 'Faculty_Reported'].includes(doc.status);
      if (filterStatus === "Completed") return doc.status === 'Completed';
      if (filterStatus === "Blocked") return ['Declined', 'Frozen'].includes(doc.status);
      return true;
  });

  // --- ACTIONS ---
  const handleUserAction = async (id, action) => {
    if(!window.confirm(`Confirm ${action}?`)) return;
    try { await api.post(`/api/users/${id}/${action}`); fetchData(); } 
    catch (error) { alert("Action failed."); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/users/', newUser);
      alert(`✅ User ${newUser.username} created!`);
      setNewUser({ username: '', email: '', password: '', role: 'Client' });
      fetchData();
    } catch (error) { alert(error.response?.data?.error || "Failed."); }
  };

  // Document Actions
  const toggleFreeze = async (id) => {
    try { await api.post(`/api/documents/${id}/freeze`); fetchData(); }
    catch (e) { alert("Freeze failed"); }
  };

  const declineDoc = async (id) => {
    if(!window.confirm("Permanently Decline this document?")) return;
    try { await api.post(`/api/documents/${id}/decline`); fetchData(); }
    catch (e) { alert("Decline failed"); }
  };

  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    const deptId = e.target.dept.value;
    try {
      await api.post(`/api/documents/${routingDoc._id}/route_to`, { department_id: deptId });
      alert("Routed!"); setRoutingDoc(null); fetchData();
    } catch (error) { alert("Failed."); }
  };

  const handleForwardToClient = async (id) => {
      if(!window.confirm("Forward Report to Client?")) return;
      try { await api.post(`/api/documents/${id}/forward_to_client`); fetchData(); setInfoDoc(null); }
      catch(e) { alert("Failed"); }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8000/${path.replace(/\\/g, '/')}` : '#';

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar toggleHistory={() => setShowHistory(!showHistory)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
                <div><p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Pending</p><h3 className="text-3xl font-extrabold text-yellow-500">{stats.pending}</h3></div>
                <div className="p-3 bg-yellow-50 rounded-xl text-2xl">⏳</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
                <div><p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Processing</p><h3 className="text-3xl font-extrabold text-blue-600">{stats.active}</h3></div>
                <div className="p-3 bg-blue-50 rounded-xl text-2xl">⚙️</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
                <div><p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Finished</p><h3 className="text-3xl font-extrabold text-green-600">{stats.completed}</h3></div>
                <div className="p-3 bg-green-50 rounded-xl text-2xl">✅</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
                <div><p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Depts Active</p><h3 className="text-3xl font-extrabold text-purple-600">{depts.length}</h3></div>
                <div className="p-3 bg-purple-50 rounded-xl text-2xl">🏢</div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN */}
            <div className="space-y-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Live Traffic</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}><XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} /><Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius:'8px'}} /><Bar dataKey="count" radius={[4,4,0,0]}>{chartData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar></BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Department Load</h3>
                    <div className="space-y-3">
                        {deptStats.map((d, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-gray-600">{d.name}</span>
                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{d.count} Pending</span>
                            </div>
                        ))}
                        {deptStats.length === 0 && <p className="text-xs text-gray-400 italic">All departments clear.</p>}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Provision User</h3>
                    <form onSubmit={handleCreateUser} className="space-y-3">
                        <input className="w-full border p-2 rounded text-xs bg-gray-50" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                        <input className="w-full border p-2 rounded text-xs bg-gray-50" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                        <input className="w-full border p-2 rounded text-xs bg-gray-50" placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                        <select className="w-full border p-2 rounded text-xs bg-gray-50" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                            <option value="Client">Client</option><option value="Dept_Admin">Dept Admin</option>
                        </select>
                        <button className="w-full bg-slate-800 text-white py-2 rounded font-bold text-xs hover:bg-slate-900 transition">Create Account</button>
                    </form>
                </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* Documents Table - WITH FILTER */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800">Master Document Control</h3>
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-bold">{filteredDocs.length} Found</span>
                        </div>
                        
                        {/* FILTER DROPDOWN */}
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="text-xs border-gray-200 rounded-lg py-2 px-3 bg-gray-50 font-semibold text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none border"
                        >
                            <option value="All">All Documents</option>
                            <option value="Action_Required">Action Required (Pending/Reported)</option>
                            <option value="In_Progress">Active Processing (In Dept)</option>
                            <option value="Completed">Completed</option>
                            <option value="Blocked">Blocked / Declined</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0">
                                <tr><th className="p-4">Tracking ID</th><th className="p-4">Status</th><th className="p-4 text-center">Controls</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredDocs.map(doc => (
                                    <tr key={doc._id} className="hover:bg-gray-50 transition">
                                        <td className="p-4">
                                            <a href={getFileUrl(doc.file)} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 font-bold hover:underline">{doc.tracking_id}</a>
                                            <div className="text-[10px] text-gray-400">Owner: {doc.client_username}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                                                doc.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                doc.status.includes('Returned') || doc.status === 'Review_Required' ? 'bg-red-50 text-red-700 border-red-200' :
                                                doc.status === 'Dept_Reported' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                doc.status === 'Declined' ? 'bg-gray-200 text-gray-600 border-gray-300' :
                                                'bg-yellow-50 text-yellow-700 border-yellow-200'
                                            }`}>
                                                {doc.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 flex justify-center gap-2">
                                            {/* INFO */}
                                            <button onClick={() => setInfoDoc(doc)} className="text-gray-400 hover:text-blue-600 text-xl p-1" title="View Timeline">ℹ️</button>
                                            
                                            {/* FREEZE */}
                                            <button onClick={() => toggleFreeze(doc._id)} className="text-gray-500 hover:text-blue-600 text-xl p-1" title={doc.is_frozen ? "Unfreeze" : "Freeze"}>
                                                {doc.is_frozen ? "🔒" : "❄️"}
                                            </button>
                                            
                                            {/* ROUTE */}
                                            <button onClick={() => setRoutingDoc(doc)} className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1 rounded hover:bg-blue-100 border border-blue-200">
                                                Route
                                            </button>
                                            
                                            {/* DECLINE */}
                                            <button onClick={() => declineDoc(doc._id)} className="text-red-600 font-bold text-xl p-1 hover:text-red-800" title="Decline">
                                                ✖
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredDocs.length === 0 && (
                                    <tr><td colSpan="3" className="text-center p-8 text-gray-400 italic">No documents match this filter.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* User Directory */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100"><h3 className="font-bold text-gray-800">User Directory</h3></div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                        {users.map(u => (
                            <div key={u._id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${u.role === 'Dept_Admin' ? 'bg-orange-500' : 'bg-blue-500'}`}>{u.username[0].toUpperCase()}</div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{u.username}</p>
                                        <p className="text-[10px] text-gray-500 uppercase">{u.role.replace('_', ' ')} • {u.kyc_status}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setViewUserHistory(u)} className="text-[10px] bg-white border border-gray-200 px-3 py-1 rounded font-bold text-gray-600 hover:bg-gray-50 transition shadow-sm">View History</button>
                                    
                                    {u.kyc_status === 'Pending' && (
                                        <>
                                            <button onClick={() => handleUserAction(u._id, 'approve')} className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs hover:bg-green-100">✓</button>
                                            <button onClick={() => handleUserAction(u._id, 'reject')} className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs hover:bg-red-100">✗</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT SLIDEOUT LOGS */}
            {showHistory && (
                <div className="fixed right-0 top-16 bottom-0 w-80 bg-white shadow-2xl border-l border-gray-200 p-4 z-30 overflow-y-auto animate-slide-in-right">
                    <h3 className="font-bold text-gray-800 mb-2 border-b pb-2">Global Logs</h3>
                    <input type="text" placeholder="Search..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)} className="w-full text-xs p-2 mb-2 border rounded" />
                    <div className="space-y-2">
                        {logs.filter(l => l.action.toLowerCase().includes(logSearch.toLowerCase())).map(log => (
                            <div key={log._id} className="text-xs p-2 bg-gray-50 border-l-2 border-blue-500 rounded">
                                <span className="font-bold block text-blue-700">{log.user_username}</span>
                                <span className="block font-semibold">{log.action}</span>
                                <span className="text-[9px] text-gray-400">{log.timestamp?.slice(5, 16)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </main>

      {/* --- MODALS --- */}
      {viewUserHistory && <ProfileModal targetUser={viewUserHistory} onClose={() => setViewUserHistory(null)} />}
      
      {routingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-96 animate-scale-in">
            <h3 className="text-xl font-bold mb-4">Route Document</h3>
            <form onSubmit={handleRouteSubmit}>
              <select name="dept" className="w-full border p-3 rounded-lg mb-6 bg-gray-50" required>
                <option value="">-- Choose Department --</option>
                {depts.map(d => (<option key={d._id} value={d._id}>{d.name}</option>))}
              </select>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setRoutingDoc(null)} className="px-4 py-2 text-gray-600 font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INFO MODAL - RESTORED FULL TIMELINE */}
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

                      {infoDoc.dept_report && (
                          <div className="mt-4">
                              <a href={getFileUrl(infoDoc.dept_report)} target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700">View PDF Report</a>
                          </div>
                      )}

                      {infoDoc.status === 'Dept_Reported' && (
                          <button onClick={() => handleForwardToClient(infoDoc._id)} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow hover:bg-green-700 mt-2">
                              Forward Final Report to Client
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}