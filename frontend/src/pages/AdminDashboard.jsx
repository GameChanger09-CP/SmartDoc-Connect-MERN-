import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';
import ProfileModal from '../components/ProfileModal';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- HELPER: FORMAT DATE TO IST ---
const formatIST = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

export default function AdminDashboard() {
  // --- STATE MANAGEMENT ---
  const [docs, setDocs] = useState([]);
  const [depts, setDepts] = useState([]);
  const [users, setUsers] = useState([]); 
  const [deptStats, setDeptStats] = useState([]);
  const [logs, setLogs] = useState([]);

  // UI State
  const [showHistory, setShowHistory] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All"); 
  
  // Modals & Active Items
  const [viewUserHistory, setViewUserHistory] = useState(null);
  const [routingDoc, setRoutingDoc] = useState(null);
  const [infoDoc, setInfoDoc] = useState(null); 
  const [paymentDoc, setPaymentDoc] = useState(null); 
  const [installments, setInstallments] = useState([{ amount: '' }]); 
  
  // Forms
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'Client' });
  
  // 🔥 NEW: NOTES STATE FOR ROUTING 🔥
  const [actionNote, setActionNote] = useState("");

  // --- DATA FETCHING ---
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

  // --- ANALYTICS LOGIC ---
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

  // --- FILTERING ---
  const filteredDocs = docs.filter(doc => {
      if (filterStatus === "All") return true;
      if (filterStatus === "Action_Required") return ['Review_Required', 'Returned_To_Main', 'Dept_Reported'].includes(doc.status);
      if (filterStatus === "In_Progress") return ['In_Progress', 'With_Faculty', 'Faculty_Reported'].includes(doc.status);
      if (filterStatus === "Completed") return doc.status === 'Completed';
      if (filterStatus === "Blocked") return ['Declined', 'Frozen'].includes(doc.status);
      return true;
  });

  // --- ACTION HANDLERS ---
  const handleUserAction = async (id, action) => {
    if(!window.confirm(`Confirm ${action}?`)) return;
    try { await api.post(`/api/users/${id}/${action}`); fetchData(); } catch (error) { alert("Action failed."); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try { await api.post('/api/users/', newUser); alert(`✅ User ${newUser.username} created!`); setNewUser({ username: '', email: '', password: '', role: 'Client' }); fetchData(); } catch (error) { alert("Failed. Username might exist."); }
  };

  const toggleFreeze = async (id) => { try { await api.post(`/api/documents/${id}/freeze`); fetchData(); } catch (e) { alert("Freeze failed"); } };
  
  const declineDoc = async (id) => { 
      // 🔥 Ask for Remark before Declining 🔥
      const note = window.prompt("Please enter a reason for declining:");
      if(note === null) return; // Cancelled
      
      try { 
          await api.post(`/api/documents/${id}/decline`, { note }); 
          fetchData(); 
      } catch (e) { alert("Decline failed"); } 
  };
  
  // 🔥 UPDATED: ROUTE WITH NOTE 🔥
  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    try { 
        await api.post(`/api/documents/${routingDoc._id}/route_to`, { 
            department_id: e.target.dept.value,
            note: actionNote // Send the text area content
        }); 
        alert("Document Routed Successfully!"); 
        setRoutingDoc(null); 
        setActionNote(""); 
        fetchData(); 
    } catch (error) { alert("Failed to route."); }
  };

  const handleForwardToClient = async (id) => {
      if(!window.confirm("Forward Report to Client?")) return;
      try { await api.post(`/api/documents/${id}/forward_to_client`); fetchData(); setInfoDoc(null); } catch(e) { alert("Failed"); }
  };

  // --- PAYMENT LOGIC ---
  const handleAddInstallment = () => setInstallments([...installments, { amount: '' }]);
  const handleRemoveInstallment = (index) => setInstallments(installments.filter((_, i) => i !== index));
  const handleInstallmentChange = (index, value) => {
      const newInst = [...installments];
      newInst[index].amount = value;
      setInstallments(newInst);
  };

  const handlePaymentRequest = async (e) => {
      e.preventDefault();
      const amounts = installments.map(i => Number(i.amount)).filter(a => a > 0);
      if (amounts.length === 0) return alert("Please enter valid amounts.");

      try {
          await api.post(`/api/documents/${paymentDoc._id}/request_payment`, { installments: amounts });
          alert("Payment requested & Client Notified!");
          setPaymentDoc(null); setInstallments([{ amount: '' }]); fetchData();
      } catch (error) { 
          alert(error.response?.data?.error || "Failed to create payment."); 
      }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8000/${path.replace(/\\/g, '/')}` : '#';

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar toggleHistory={() => setShowHistory(!showHistory)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* --- HEADER & LOG TOGGLE --- */}
        <div className="flex justify-between items-end mb-8">
            <div>
                <h2 className="text-3xl font-extrabold text-slate-900">System Overview</h2>
                <p className="text-slate-500 mt-1">Admin Control Panel</p>
            </div>
            <button 
                onClick={() => setShowHistory(!showHistory)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition ${showHistory ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
            >
                <span>{showHistory ? 'Close Logs' : '📜 Global Logs'}</span>
            </button>
        </div>

        {/* --- KPI CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition">
                <div><p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Pending</p><h3 className="text-3xl font-extrabold text-yellow-500">{stats.pending}</h3></div>
                <div className="p-3 bg-yellow-50 rounded-xl text-2xl">⏳</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition">
                <div><p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Processing</p><h3 className="text-3xl font-extrabold text-blue-600">{stats.active}</h3></div>
                <div className="p-3 bg-blue-50 rounded-xl text-2xl">⚙️</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition">
                <div><p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Finished</p><h3 className="text-3xl font-extrabold text-green-600">{stats.completed}</h3></div>
                <div className="p-3 bg-green-50 rounded-xl text-2xl">✅</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition">
                <div><p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Depts Active</p><h3 className="text-3xl font-extrabold text-purple-600">{depts.length}</h3></div>
                <div className="p-3 bg-purple-50 rounded-xl text-2xl">🏢</div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- LEFT COLUMN: STATS & FORMS --- */}
            <div className="space-y-8">
                {/* Traffic Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4">Live Traffic</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}><XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} /><Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius:'8px'}} /><Bar dataKey="count" radius={[4,4,0,0]}>{chartData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar></BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Dept Load */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Department Load</h3>
                    <div className="space-y-3">
                        {deptStats.map((d, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-600">{d.name}</span>
                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{d.count} Pending</span>
                            </div>
                        ))}
                        {deptStats.length === 0 && <p className="text-xs text-slate-400 italic">All departments clear.</p>}
                    </div>
                </div>

                {/* Create User Form */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Provision User</h3>
                    <form onSubmit={handleCreateUser} className="space-y-3">
                        <input className="w-full border p-2 rounded text-xs bg-slate-50" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                        <input className="w-full border p-2 rounded text-xs bg-slate-50" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                        <input className="w-full border p-2 rounded text-xs bg-slate-50" placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                        <select className="w-full border p-2 rounded text-xs bg-slate-50" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                            <option value="Client">Client</option><option value="Dept_Admin">Dept Admin</option>
                        </select>
                        <button className="w-full bg-slate-800 text-white py-2 rounded font-bold text-xs hover:bg-slate-900 transition">Create Account</button>
                    </form>
                </div>
            </div>

            {/* --- RIGHT COLUMN: TABLES --- */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* Documents Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">Master Document Control</h3>
                            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-bold">{filteredDocs.length} Found</span>
                        </div>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs border-slate-200 rounded-lg py-2 px-3 bg-slate-50 font-semibold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none border">
                            <option value="All">All Documents</option>
                            <option value="Action_Required">Action Required</option>
                            <option value="In_Progress">Active Processing</option>
                            <option value="Completed">Completed</option>
                            <option value="Blocked">Blocked / Declined</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0">
                                <tr><th className="p-4">Tracking ID</th><th className="p-4">Status & Fee</th><th className="p-4 text-center">Controls</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDocs.map(doc => (
                                    <tr key={doc._id} className="hover:bg-slate-50 transition">
                                        <td className="p-4">
                                            <a href={getFileUrl(doc.file)} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 font-bold hover:underline">{doc.tracking_id}</a>
                                            <div className="text-[10px] text-slate-400">Owner: {doc.client_username}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${doc.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : doc.status === 'Declined' ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                                    {doc.status.replace(/_/g, ' ')}
                                                </span>
                                                {doc.fee_total > 0 && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${doc.fee_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Fee: {doc.fee_status}</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 flex justify-center gap-2">
                                            <button onClick={() => setInfoDoc(doc)} className="text-slate-400 hover:text-blue-600 text-xl p-1" title="View Timeline">ℹ️</button>
                                            
                                            {/* PAYMENT REQUEST BUTTON (Only if fee not set) */}
                                            {doc.fee_total === 0 && (
                                                <button onClick={() => { setPaymentDoc(doc); setInstallments([{amount: ''}]); }} className="text-green-600 font-bold text-lg p-1 hover:text-green-800" title="Request Payment">💰</button>
                                            )}

                                            <button onClick={() => toggleFreeze(doc._id)} className="text-slate-500 hover:text-blue-600 text-xl p-1" title={doc.is_frozen ? "Unfreeze" : "Freeze"}>{doc.is_frozen ? "🔒" : "❄️"}</button>
                                            <button onClick={() => setRoutingDoc(doc)} className="text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1 rounded hover:bg-blue-100 border border-blue-200">Route</button>
                                            <button onClick={() => declineDoc(doc._id)} className="text-red-600 font-bold text-xl p-1 hover:text-red-800" title="Decline">✖</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* User Directory */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100"><h3 className="font-bold text-slate-800">User Directory</h3></div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                        {users.map(u => (
                            <div key={u._id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${u.role === 'Dept_Admin' ? 'bg-orange-500' : 'bg-blue-500'}`}>{u.username[0].toUpperCase()}</div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{u.username}</p>
                                        <p className="text-[10px] text-slate-500 uppercase">{u.role.replace('_', ' ')} • {u.kyc_status}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setViewUserHistory(u)} className="text-[10px] bg-white border border-slate-200 px-3 py-1 rounded font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm">History</button>
                                    
                                    {/* 🔥 VIEW ID BUTTON 🔥 */}
                                    {u.gov_id && (
                                        <a href={getFileUrl(u.gov_id)} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded font-bold hover:bg-purple-100 transition shadow-sm">
                                            View ID
                                        </a>
                                    )}

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
                <div className="fixed right-0 top-16 bottom-0 w-80 bg-white shadow-2xl border-l border-slate-200 p-4 z-30 overflow-y-auto animate-slide-in-right">
                    <h3 className="font-bold text-slate-800 mb-2 border-b pb-2">Global Logs</h3>
                    <input type="text" placeholder="Search..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)} className="w-full text-xs p-2 mb-2 border rounded" />
                    <div className="space-y-2">
                        {logs.filter(l => l.action.toLowerCase().includes(logSearch.toLowerCase())).map(log => (
                            <div key={log._id} className="text-xs p-2 bg-slate-50 border-l-2 border-blue-500 rounded">
                                <span className="font-bold block text-blue-700">{log.user_username}</span>
                                <span className="block font-semibold">{log.action}</span>
                                <span className="text-[9px] text-slate-400">{formatIST(log.timestamp)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </main>

      {/* --- MODALS --- */}
      {viewUserHistory && <ProfileModal targetUser={viewUserHistory} onClose={() => setViewUserHistory(null)} />}
      
      {/* 🔥 ROUTING MODAL WITH NOTES 🔥 */}
      {routingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-96 animate-scale-in">
            <h3 className="text-xl font-bold mb-4">Route Document</h3>
            <form onSubmit={handleRouteSubmit}>
              <select name="dept" className="w-full border p-3 rounded-lg mb-4 bg-slate-50" required>
                <option value="">-- Choose Department --</option>
                {depts.map(d => (<option key={d._id} value={d._id}>{d.name}</option>))}
              </select>
              
              {/* 🔥 REMARK FIELD 🔥 */}
              <textarea 
                  className="w-full border p-3 rounded-lg mb-6 bg-slate-50 text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Add instructions/remarks for Dept Admin..."
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
              ></textarea>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setRoutingDoc(null)} className="px-4 py-2 text-slate-600 font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow">Confirm Route</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {paymentDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-[400px] animate-scale-in max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-2 text-slate-800">Generate Fee Request</h3>
                <p className="text-sm text-slate-500 mb-6">For Document ID: <span className="font-mono font-bold text-blue-600">{paymentDoc.tracking_id}</span></p>
                
                <form onSubmit={handlePaymentRequest}>
                    <div className="space-y-3 mb-6">
                        {installments.map((inst, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="flex-grow">
                                    <label className="block text-xs font-bold mb-1 text-slate-500">Installment {index + 1} Amount (₹)</label>
                                    <input type="number" min="1" value={inst.amount} onChange={e => handleInstallmentChange(index, e.target.value)} className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required placeholder="e.g. 500" />
                                </div>
                                {installments.length > 1 && (
                                    <button type="button" onClick={() => handleRemoveInstallment(index)} className="mt-5 text-red-500 hover:text-red-700 font-bold text-xl">&times;</button>
                                )}
                            </div>
                        ))}
                    </div>

                    <button type="button" onClick={handleAddInstallment} className="text-xs font-bold text-blue-600 border border-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition w-full mb-6">+ Add Another Installment</button>

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setPaymentDoc(null)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg shadow hover:bg-green-700">Send Request</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* INFO MODAL WITH NOTES */}
      {infoDoc && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl animate-scale-in">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-lg font-bold text-slate-800">Document Lifecycle</h3>
                      <button onClick={() => setInfoDoc(null)} className="text-xl font-bold text-slate-400 hover:text-red-500">&times;</button>
                  </div>
                  
                  {/* 🔥 NOTES HISTORY 🔥 */}
                  <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Communication Log</p>
                      {infoDoc.notes && infoDoc.notes.length > 0 ? infoDoc.notes.map((n, i) => (
                          <div key={i} className="text-xs border-b border-slate-200 pb-2 mb-2 last:border-0">
                              <span className="font-bold text-blue-700">{n.sender} ({n.role}): </span>
                              <span className="text-slate-700">{n.message}</span>
                              <div className="text-[9px] text-slate-400 mt-0.5">{formatIST(n.timestamp)}</div>
                          </div>
                      )) : <p className="text-xs text-slate-400 italic">No notes.</p>}
                  </div>

                  <div className="space-y-4 text-sm">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between"><div><p className="text-xs font-bold text-blue-800 uppercase">ID</p><p className="font-mono text-lg font-bold text-blue-900">{infoDoc.tracking_id}</p></div><div className="text-right"><p className="text-xs font-bold text-blue-800 uppercase">Fee</p><p className="font-bold">{infoDoc.fee_status}</p></div></div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                          <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-2">Timeline Events</h4>
                          <div className="flex justify-between"><span className="text-slate-600">1. Uploaded:</span><span className="font-mono font-bold">{formatIST(infoDoc.uploaded_at)}</span></div>
                          <div className="flex justify-between"><span className={infoDoc.sent_to_dept_at ? "text-slate-800 font-semibold" : "text-slate-400"}>2. Sent to Dept:</span><span className="font-mono">{infoDoc.sent_to_dept_at ? formatIST(infoDoc.sent_to_dept_at) : '-'}</span></div>
                          <div className="flex justify-between pl-4 border-l-2 border-yellow-200"><span className={infoDoc.assigned_to_faculty_at ? "text-slate-800 font-semibold" : "text-slate-400"}>↳ Faculty Assigned:</span><span className="font-mono text-xs">{infoDoc.assigned_to_faculty_at ? formatIST(infoDoc.assigned_to_faculty_at) : '-'}</span></div>
                          <div className="flex justify-between pl-4 border-l-2 border-purple-200"><span className={infoDoc.faculty_processed_at ? "text-slate-800 font-semibold" : "text-slate-400"}>↳ Faculty Reported:</span><span className="font-mono text-xs">{infoDoc.faculty_processed_at ? formatIST(infoDoc.faculty_processed_at) : '-'}</span></div>
                          <div className="flex justify-between"><span className={infoDoc.dept_processed_at ? "text-slate-800 font-semibold" : "text-slate-400"}>3. Dept Approved:</span><span className="font-mono">{infoDoc.dept_processed_at ? formatIST(infoDoc.dept_processed_at) : '-'}</span></div>
                          <div className="flex justify-between border-t pt-2 mt-2"><span className={infoDoc.final_report_sent_at ? "text-green-700 font-bold" : "text-slate-400"}>4. Completed:</span><span className="font-mono font-bold text-green-600">{infoDoc.final_report_sent_at ? formatIST(infoDoc.final_report_sent_at) : '-'}</span></div>
                      </div>
                      {infoDoc.fee_total > 0 && (
                          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                              <span className="text-xs font-bold text-blue-800 uppercase block mb-2">Financial Lifecycle (₹{infoDoc.fee_total})</span>
                              {infoDoc.installments.map((inst, idx) => (
                                  <div key={inst._id} className="flex justify-between text-xs mt-1 border-b border-blue-100 pb-1">
                                      <span className="text-slate-600">↳ Part {idx + 1} (₹{inst.amount}):</span>
                                      <span className={inst.status === 'Paid' ? "font-mono font-bold text-green-600" : "font-mono font-bold text-red-500"}>
                                          {inst.status === 'Paid' ? `PAID on ${formatIST(inst.paid_at)}` : 'PENDING'}
                                      </span>
                                  </div>
                              ))}
                          </div>
                      )}
                      {infoDoc.dept_report && (
                          <div className="mt-4"><a href={getFileUrl(infoDoc.dept_report)} target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700">View PDF Report</a></div>
                      )}
                      {infoDoc.status === 'Dept_Reported' && (
                          <button onClick={() => handleForwardToClient(infoDoc._id)} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow hover:bg-green-700 mt-2">Forward Final Report to Client</button>
                      )}
                      <button onClick={() => setInfoDoc(null)} className="w-full bg-slate-100 py-2 rounded-lg font-bold hover:bg-slate-200 mt-2">Close</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}