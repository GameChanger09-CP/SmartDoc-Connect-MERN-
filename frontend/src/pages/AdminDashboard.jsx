import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AdminDashboard() {
  const [docs, setDocs] = useState([]);
  const [depts, setDepts] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  // UI States
  const [showHistory, setShowHistory] = useState(false);
  const [logSearch, setLogSearch] = useState("");

  // Modal States
  const [selectedUser, setSelectedUser] = useState(null);
  const [routingDoc, setRoutingDoc] = useState(null);
  const [infoDoc, setInfoDoc] = useState(null); 

  const [newUser, setNewUser] = useState({
    username: '', email: '', password: '', role: 'Client'
  });

  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Superuser';

  const fetchData = async () => {
    try {
      const [dRes, uRes, depRes, lRes] = await Promise.all([
        api.get('/documents/'), api.get('/users/'), api.get('/departments/'), api.get('/logs/')
      ]);
      setDocs(Array.isArray(dRes.data) ? dRes.data : dRes.data.results || []);
      setPendingUsers(Array.isArray(uRes.data) ? uRes.data : uRes.data.results || []);
      setDepts(Array.isArray(depRes.data) ? depRes.data : depRes.data.results || []);
      setLogs(Array.isArray(lRes.data) ? lRes.data : lRes.data.results || []);
    } catch (err) { console.error("Fetch error", err); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- 📊 CALCULATE ANALYTICS ---
  const countState = (status) => docs.filter(d => d.status === status).length;
  
  const stats = {
    pending: countState('Review_Required'),
    withDept: countState('In_Progress'),
    reportReady: countState('Dept_Reported'),
    completed: countState('Completed'),
    declined: countState('Declined') + countState('Frozen')
  };

  const chartData = [
    { name: 'New / Pending', count: stats.pending, fill: '#F59E0B' },     // Amber
    { name: 'With Dept', count: stats.withDept, fill: '#3B82F6' },        // Blue
    { name: 'Report Ready', count: stats.reportReady, fill: '#8B5CF6' },  // Purple
    { name: 'Completed', count: stats.completed, fill: '#10B981' },       // Green
    { name: 'Blocked', count: stats.declined, fill: '#EF4444' }           // Red
  ];

  // --- ACTIONS ---
  const handleUserAction = async (id, action) => {
    if(!window.confirm(`Confirm ${action}?`)) return;
    await api.post(`/users/${id}/${action}/`);
    fetchData(); setSelectedUser(null);
  };

  const toggleFreeze = async (id) => {
    await api.post(`/documents/${id}/freeze/`); fetchData();
  };

  const declineDoc = async (id) => {
    if(!window.confirm("Are you sure you want to DECLINE this document?")) return;
    try { await api.post(`/documents/${id}/decline/`); fetchData(); }
    catch (error) { alert("Decline failed."); }
  };

  const handleForwardToClient = async (id) => {
    if(!window.confirm("Confirm: Forward the Department's PDF Report to the Client?")) return;
    try {
      await api.post(`/documents/${id}/forward_to_client/`);
      alert("✅ Success! Report sent to Client.");
      setInfoDoc(null); fetchData();
    } catch (error) { alert("Action failed. Check console."); }
  };

  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    const deptId = e.target.dept.value;
    if(!deptId) return alert("Please select a department.");
    try {
      await api.post(`/documents/${routingDoc.id}/route_to/`, { department_id: deptId });
      alert("Success! Document has been routed.");
      setRoutingDoc(null); fetchData();
    } catch (error) { alert("Routing Failed."); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/', newUser);
      alert(`User ${newUser.username} created!`);
      setNewUser({ username: '', email: '', password: '', role: 'Client' });
      fetchData();
    } catch (error) { alert("Failed to create user."); }
  };

  const getFileUrl = (path) => {
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    return `http://127.0.0.1:8000${path.startsWith('/') ? path : '/' + path}`;
  };

  const filteredLogs = logs.filter(log =>
    log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
    log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
    (log.user_username && log.user_username.toLowerCase().includes(logSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-12">

      {/* HEADER */}
      <div className="bg-gray-900 text-white p-6 mb-8 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-3xl shadow-lg border-2 border-white">🛡️</div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">MAIN ADMIN</h1>
              <p className="text-red-300 text-sm font-mono">System Overseer: {username}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowHistory(!showHistory)} className="bg-gray-800 border border-gray-600 px-4 py-2 rounded text-sm font-bold hover:bg-gray-700">
              {showHistory ? 'Hide Logs' : 'View Logs'}
            </button>
            <button onClick={() => {localStorage.clear(); navigate('/');}} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-bold shadow-lg">Logout</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mb-8">
        {/* --- 🔥 ANALYTICS SECTION 🔥 --- */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {/* Quick Stat Cards */}
            <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-yellow-500">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Awaiting Admin Route</p>
                    <div className="flex items-end justify-between mt-1">
                        <p className="text-4xl font-extrabold text-gray-800">{stats.pending}</p>
                        <span className="text-yellow-500 text-2xl mb-1">⏳</span>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-500">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active In Departments</p>
                    <div className="flex items-end justify-between mt-1">
                        <p className="text-4xl font-extrabold text-gray-800">{stats.withDept + stats.reportReady}</p>
                        <span className="text-blue-500 text-2xl mb-1">⚙️</span>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Successfully Completed</p>
                    <div className="flex items-end justify-between mt-1">
                        <p className="text-4xl font-extrabold text-gray-800">{stats.completed}</p>
                        <span className="text-green-500 text-2xl mb-1">✅</span>
                    </div>
                </div>
            </div>

            {/* Main Interactive Chart */}
            <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">Live Workflow Telemetry</h3>
                    <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold border border-blue-100">Live</span>
                </div>
                <div className="flex-grow w-full min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12, fontWeight: 600}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                            <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={60}>
                                {chartData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.fill} /> ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT COL: Tools */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-5 rounded-xl shadow border border-gray-200">
              <h2 className="text-lg font-bold mb-3 text-green-700 border-b pb-2">👤 Create User</h2>
              <form onSubmit={handleCreateUser} className="space-y-3">
                <input className="w-full border p-2 rounded text-xs" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                <input className="w-full border p-2 rounded text-xs" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                <input className="w-full border p-2 rounded text-xs" placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                <select className="w-full border p-2 rounded text-xs" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                  <option value="Client">Client</option>
                  <option value="Dept_Admin">Dept Admin</option>
                </select>
                <button className="w-full bg-green-600 text-white py-2 rounded font-bold text-xs hover:bg-green-700">Create</button>
              </form>
            </div>

            <div className="bg-white p-5 rounded-xl shadow border border-gray-200">
              <h2 className="text-lg font-bold mb-3 text-gray-800 border-b pb-2">⚠ Pending Approvals</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingUsers.map(user => (
                  <div key={user.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                    <span onClick={() => setSelectedUser(user)} className="cursor-pointer text-blue-600 font-bold hover:underline text-xs">{user.username}</span>
                    <div className="flex gap-1">
                      <button onClick={() => handleUserAction(user.id, 'approve')} className="bg-green-500 text-white px-2 py-1 rounded text-[10px]">✓</button>
                      <button onClick={() => handleUserAction(user.id, 'reject')} className="bg-red-500 text-white px-2 py-1 rounded text-[10px]">✗</button>
                    </div>
                  </div>
                ))}
                {pendingUsers.length === 0 && <p className="text-gray-400 italic text-xs">No pending users.</p>}
              </div>
            </div>
          </div>

          {/* MIDDLE: Document Control */}
          <div className={`space-y-6 transition-all duration-300 ${showHistory ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
              <h2 className="text-xl font-bold mb-4 text-blue-900">📄 Document Control</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <th className="p-3">ID</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Info</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {docs.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <a href={getFileUrl(doc.file)} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 font-bold hover:underline">{doc.tracking_id}</a>
                          <div className="text-[10px] text-gray-400">{doc.uploaded_at?.slice(0,10)}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                            doc.status === 'Dept_Reported' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            doc.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                            doc.status === 'Frozen' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            {doc.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3">
                          <button onClick={() => setInfoDoc(doc)} className="text-gray-500 hover:text-blue-600 font-bold text-lg" title="View Metadata">ℹ️</button>
                        </td>
                        <td className="p-3 flex gap-2 justify-center">
                          <button onClick={() => toggleFreeze(doc.id)} className="p-2 rounded bg-gray-100 hover:bg-gray-200" title="Freeze">{doc.is_frozen ? "🔓" : "❄"}</button>
                          <button onClick={() => setRoutingDoc(doc)} className="p-2 rounded bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 text-xs">Route</button>
                          <button onClick={() => declineDoc(doc.id)} className="p-2 rounded bg-red-50 text-red-600 font-bold hover:bg-red-100 text-xs">✖</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT: Audit Log WITH SEARCH */}
          {showHistory && (
            <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow h-[80vh] border border-gray-200 flex flex-col animate-fade-in-right">
              <h3 className="font-bold text-gray-800 mb-2 border-b pb-2 flex justify-between items-center">
                <span>Audit Log</span>
                <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">{filteredLogs.length}</span>
              </h3>
              
              <input type="text" placeholder="Search logs..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)} className="w-full text-xs p-2 mb-2 border rounded bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              
              <div className="space-y-2 overflow-y-auto flex-grow pr-1">
                {filteredLogs.map(log => (
                  <div key={log.id} className="text-xs p-2 bg-gray-50 border-b border-gray-100 rounded hover:bg-gray-100 transition">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-blue-600">{log.user_username || 'System'}</span>
                      <span className="text-[10px] text-gray-400">{log.timestamp?.slice(5, 16).replace('T', ' ')}</span>
                    </div>
                    <span className="font-semibold text-gray-700 block mb-1">{log.action}</span>
                    <p className="text-gray-500 italic leading-tight">{log.details}</p>
                  </div>
                ))}
                {filteredLogs.length === 0 && <p className="text-center text-gray-400 mt-10">No matching logs.</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}
      {/* 1. METADATA INFO MODAL */}
      {infoDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-[500px] animate-scale-in">
            <div className="flex justify-between items-center mb-6 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-800">Document Metadata</h3>
              <button onClick={() => setInfoDoc(null)} className="text-gray-400 hover:text-red-500 text-xl font-bold">×</button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Client Information</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-gray-500 text-xs">Client Name:</p><p className="font-bold text-gray-900">{infoDoc.client_username || 'Unknown'}</p></div>
                  <div><p className="text-gray-500 text-xs">User ID:</p><p className="font-mono font-bold text-gray-900">#{infoDoc.client_id}</p></div>
                  <div><p className="text-gray-500 text-xs">Tracking ID:</p><p className="font-mono font-bold text-blue-600">{infoDoc.tracking_id}</p></div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Lifecycle Timeline</h4>
                <div className="flex justify-between"><span className="text-gray-500">Uploaded:</span><span className="font-mono font-bold">{infoDoc.uploaded_at?.replace('T', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sent to Dept:</span><span className="font-mono font-bold">{infoDoc.sent_to_dept_at?.replace('T', ' ') || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Dept Processed:</span><span className="font-mono font-bold">{infoDoc.dept_processed_at?.replace('T', ' ') || '-'}</span></div>
                <div className="flex justify-between border-t pt-2 mt-2"><span className="text-gray-900 font-bold">Client Received:</span><span className="font-mono font-bold text-green-600">{infoDoc.final_report_sent_at?.replace('T', ' ') || '-'}</span></div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Acknowledgement Report</p>
                {infoDoc.dept_report ? (
                  <div className="flex flex-col gap-1">
                    <a href={getFileUrl(infoDoc.dept_report)} target="_blank" rel="noopener noreferrer" className="text-purple-600 font-bold hover:underline flex items-center gap-1">📄 View PDF Report</a>
                    <span className="text-xs text-gray-400 font-mono">Report ID: {infoDoc.tracking_id}_REP</span>
                  </div>
                ) : <span className="text-gray-400 italic">No report uploaded yet.</span>}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {infoDoc.status === 'Dept_Reported' ? (
                <button onClick={() => handleForwardToClient(infoDoc.id)} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow hover:bg-green-700 transition flex justify-center items-center gap-2"><span>📤</span> Forward Report to Client</button>
              ) : infoDoc.status === 'Completed' ? (
                <div className="w-full bg-gray-100 text-green-700 py-2 rounded text-center font-bold border border-green-200">✔ Cycle Completed</div>
              ) : (
                <div className="w-full bg-gray-100 text-gray-400 py-2 rounded text-center text-xs italic">Waiting for Department Response...</div>
              )}
              <button onClick={() => setInfoDoc(null)} className="w-full bg-white border border-gray-300 py-2 rounded font-bold text-gray-600 hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Routing Modal */}
      {routingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-96">
            <h3 className="text-xl font-bold mb-4">Route Document</h3>
            <form onSubmit={handleRouteSubmit}>
              <select name="dept" className="w-full border p-3 rounded-lg mb-6 bg-gray-50" required>
                <option value="">-- Choose Department --</option>
                {depts.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setRoutingDoc(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 text-sm">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl w-96">
            <h3 className="text-xl font-bold mb-4">User Details</h3>
            <p><strong>Username:</strong> {selectedUser.username}</p>
            <p><strong>Status:</strong> {selectedUser.kyc_status}</p>
            {selectedUser.gov_id && (
              <a href={getFileUrl(selectedUser.gov_id)} target="_blank" className="mt-4 block text-center w-full bg-blue-50 text-blue-700 py-2 rounded font-bold border border-blue-200">View ID Proof 📎</a>
            )}
            <button onClick={() => setSelectedUser(null)} className="mt-4 w-full bg-gray-100 py-2 rounded font-bold text-gray-600">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}