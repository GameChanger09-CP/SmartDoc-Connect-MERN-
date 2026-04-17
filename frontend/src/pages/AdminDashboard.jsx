import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';
import ProfileModal from '../components/ProfileModal';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
  const [infoDoc, setInfoDoc] = useState(null); 
  const [paymentDoc, setPaymentDoc] = useState(null); 
  
  // Index 0 = Advance, Index 1+ = Remaining
  const [installments, setInstallments] = useState([{ amount: '' }, { amount: '' }]); 
  
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'Client' });
  const [actionNote, setActionNote] = useState("");

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
      setDocs(Array.isArray(dRes.data) ? dRes.data : dRes.data.results || []);
      setUsers(Array.isArray(uRes.data) ? uRes.data : uRes.data.results || []);
      setDepts(Array.isArray(depRes.data) ? depRes.data : depRes.data.results || []);
      setDeptStats(statRes.data.deptStats || []);
      setLogs(Array.isArray(lRes.data) ? lRes.data : lRes.data.results || []);
    } catch (err) { console.error("Fetch error", err); }
  };

  useEffect(() => { fetchData(); }, []);

  const countState = (status) => docs.filter(d => d.status === status).length;
  const chartData = [
    { name: 'Pending', count: countState('Review_Required') + countState('Returned_To_Main'), fill: '#F59E0B' },     
    { name: 'Active', count: countState('In_Progress') + countState('With_Faculty') + countState('Faculty_Reported') + countState('Dept_Reported'), fill: '#3B82F6' },        
    { name: 'Done', count: countState('Completed'), fill: '#10B981' },       
    { name: 'Blocked', count: countState('Declined') + countState('Frozen'), fill: '#EF4444' }           
  ];

  const filteredDocs = docs.filter(doc => {
      if (filterStatus === "All") return true;
      if (filterStatus === "Action_Required") return ['Review_Required', 'Returned_To_Main', 'Dept_Reported'].includes(doc.status);
      if (filterStatus === "In_Progress") return ['In_Progress', 'With_Faculty', 'Faculty_Reported'].includes(doc.status);
      if (filterStatus === "Completed") return doc.status === 'Completed';
      if (filterStatus === "Blocked") return ['Declined', 'Frozen'].includes(doc.status);
      return true;
  });

  const handleUserAction = async (id, action) => {
    if(!window.confirm(`Confirm ${action}?`)) return;
    try { await api.post(`/api/users/${id}/${action}`); fetchData(); } catch (error) { alert("Action failed."); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try { await api.post('/api/users/', newUser); alert(`✅ User ${newUser.username} created!`); setNewUser({ username: '', email: '', password: '', role: 'Client' }); fetchData(); } catch (error) { alert("Failed."); }
  };

  const toggleFreeze = async (id) => { try { await api.post(`/api/documents/${id}/freeze`); fetchData(); } catch (e) { alert("Freeze failed"); } };
  
  const declineDoc = async (id) => { 
      const note = window.prompt("Reason for declining? (Optional)");
      if(note === null) return;
      try { await api.post(`/api/documents/${id}/decline`, { note }); fetchData(); } catch (e) { alert("Decline failed"); } 
  };
  
  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    try { 
        await api.post(`/api/documents/${routingDoc._id}/route_to`, { 
            department_id: e.target.dept.value,
            note: actionNote
        }); 
        alert("Routed Successfully!"); setRoutingDoc(null); setActionNote(""); fetchData(); 
    } catch (error) { alert("Failed to route."); }
  };

  const handleForwardToClient = async (id) => {
      if(!window.confirm("Forward Report to Client?")) return;
      try { await api.post(`/api/documents/${id}/forward_to_client`); fetchData(); setInfoDoc(null); } catch(e) { alert("Failed"); }
  };

  const handleAddInstallment = () => setInstallments([...installments, { amount: '' }]);
  const handleRemoveInstallment = (index) => setInstallments(installments.filter((_, i) => i !== index));
  const handleInstallmentChange = (index, value) => { const newInst = [...installments]; newInst[index].amount = value; setInstallments(newInst); };

  const handlePaymentRequest = async (e) => {
      e.preventDefault();
      // Allow 0 for Advance
      const amounts = installments.map(i => i.amount === '' ? 0 : Number(i.amount));
      try { await api.post(`/api/documents/${paymentDoc._id}/request_payment`, { installments: amounts }); alert("Payment Structure Generated!"); setPaymentDoc(null); setInstallments([{ amount: '' }, { amount: '' }]); fetchData(); } catch (error) { alert("Failed."); }
  };

  const handleSendReminder = async (docId, installmentId) => {
      if(!window.confirm("Send payment reminder email?")) return;
      try {
          await api.post(`/api/documents/${docId}/remind_payment/${installmentId}`);
          alert("Reminder Sent Successfully! 📧");
      } catch(e) { alert("Failed to send reminder."); }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8001/${path.replace(/\\/g, '/')}` : '#';

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

  const handleSearchUser = async (q) => {
      setUserQuery(q);
      if(q.length > 2) {
          try {
              const res = await api.get(`/api/users/search?q=${q}`);
              setSearchResults(res.data);
          } catch(e) { console.error(e); }
      } else {
          setSearchResults([]);
      }
  };

  const handleAdminUpload = async (e) => {
      e.preventDefault();
      if(!selectedUser || !uploadFile) return alert("Select user and file");
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
      } catch (e) { alert("Upload Failed"); }
  };

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
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Provision User</h3><form onSubmit={handleCreateUser} className="space-y-3"><input className="w-full border p-2 rounded text-xs" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required /><input className="w-full border p-2 rounded text-xs" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required /><input className="w-full border p-2 rounded text-xs" placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required /><select className="w-full border p-2 rounded text-xs" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}><option value="Client">Client</option><option value="Dept_Admin">Dept Admin</option></select><button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded font-bold text-xs transition">Create Account</button></form></div>
            </div>

            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2"><h3 className="font-bold text-slate-800">Master Document Control</h3><span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-bold">{filteredDocs.length} Found</span></div>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs border-slate-200 rounded-lg py-2 px-3 bg-slate-50 font-semibold text-slate-600 outline-none border"><option value="All">All Documents</option><option value="Action_Required">Action Required</option><option value="In_Progress">Active Processing</option><option value="Completed">Completed</option><option value="Blocked">Blocked</option></select>
                    </div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0"><tr><th className="p-4">Tracking ID</th><th className="p-4">Status & Fee</th><th className="p-4 text-center">Controls</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDocs.map(doc => (
                                    <tr key={doc._id} className="hover:bg-slate-50 transition">
                                        <td className="p-4">
                                            <a href={getFileUrl(doc.file)} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 font-bold hover:underline">{doc.tracking_id}</a>
                                            <div className="text-[10px] text-slate-400">Owner: {doc.client_username}</div>
                                            {doc.dept_report && (<div className="flex gap-2 mt-1"><a href={getFileUrl(doc.dept_report)} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold hover:bg-purple-100 transition">View</a><button onClick={() => handleForceDownload(getFileUrl(doc.dept_report), `${doc.tracking_id}_final`)} className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200 font-bold hover:bg-green-100 transition cursor-pointer">Download</button></div>)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${doc.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : doc.status === 'Declined' ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{doc.status.replace(/_/g, ' ')}</span>
                                                {doc.fee_total > 0 && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${doc.fee_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Fee: {doc.fee_status}</span>}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => setInfoDoc(doc)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition flex items-center justify-center" title="Details">ℹ️</button>
                                                {doc.fee_total === 0 ? (<button onClick={() => { setPaymentDoc(doc); setInstallments([{amount: ''}, {amount: ''}]); }} className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition flex items-center justify-center font-bold text-sm" title="Request Payment">₹</button>) : <div className="w-8"></div>}
                                                <button onClick={() => toggleFreeze(doc._id)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition flex items-center justify-center text-sm" title={doc.is_frozen ? "Unfreeze" : "Freeze"}>{doc.is_frozen ? "🔒" : "❄️"}</button>
                                                <button onClick={() => setRoutingDoc(doc)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold border border-blue-200 hover:bg-blue-100 transition">Route</button>
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
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">{logs.filter(l => l.action.toLowerCase().includes(logSearch.toLowerCase())).map(log => (<div key={log._id} className="text-xs p-2 bg-slate-50 border-l-2 border-blue-500 rounded"><span className="font-bold block text-blue-700">{log.user_username}</span><span className="block font-semibold">{log.action}</span><span className="text-[9px] text-slate-400">{formatIST(log.timestamp)}</span></div>))}</div>
                </div>
            )}
        </div>
      </main>

      {/* --- MODALS --- */}
      {viewUserHistory && <ProfileModal targetUser={viewUserHistory} onClose={() => setViewUserHistory(null)} />}
      {routingDoc && (/* ... Routing Modal ... */ <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"><div className="bg-white p-8 rounded-xl shadow-2xl w-96 animate-scale-in"><h3 className="text-xl font-bold mb-4">Route Document</h3><form onSubmit={handleRouteSubmit}><select name="dept" className="w-full border p-3 rounded-lg mb-4 bg-slate-50" required><option value="">-- Choose Department --</option>{depts.map(d => (<option key={d._id} value={d._id}>{d.name}</option>))}</select><textarea className="w-full border p-3 rounded-lg mb-6 bg-slate-50 text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Add remarks for Dept Admin..." value={actionNote} onChange={(e) => setActionNote(e.target.value)}></textarea><div className="flex gap-3 justify-end"><button type="button" onClick={() => setRoutingDoc(null)} className="px-4 py-2 text-slate-600 font-bold">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow">Confirm Route</button></div></form></div></div>)}
      
      {/* 🔥 PAYMENT GENERATION MODAL (Updated Labels) 🔥 */}
      {paymentDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-[400px] animate-scale-in max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 text-slate-800 border-b pb-2">Generate Fee Structure</h3>
                <form onSubmit={handlePaymentRequest}>
                    <div className="space-y-4 mb-6">
                        {installments.map((inst, index) => (
                            <div key={index} className="flex flex-col gap-1">
                                {/* LABEL LOGIC: Index 0 is Advance, others are Installments */}
                                <label className={`block text-xs font-bold uppercase mb-1 ${index===0 ? 'text-blue-600' : 'text-slate-500'}`}>
                                    {index === 0 ? '✨ Advance Amount (Paid Now)' : `Future Installment #${index} (Paid Later)`}
                                </label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={inst.amount} 
                                        onChange={e => handleInstallmentChange(index, e.target.value)} 
                                        className={`w-full border p-2 rounded-lg focus:ring-2 outline-none ${index===0 ? 'border-blue-300 focus:ring-blue-500 bg-blue-50' : 'border-slate-300 focus:ring-slate-500'}`}
                                        placeholder={index === 0 ? "e.g. 500 (Can be 0)" : "e.g. 2000"} 
                                    />
                                    {index > 0 && <button type="button" onClick={() => handleRemoveInstallment(index)} className="text-red-500 font-bold text-xl hover:text-red-700">&times;</button>}
                                </div>
                                {index === 0 && <p className="text-[10px] text-slate-400">Enter 0 if no advance is required.</p>}
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={handleAddInstallment} className="text-xs font-bold text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 transition w-full mb-6 border-dashed">+ Add Another Future Installment</button>
                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100"><button type="button" onClick={() => setPaymentDoc(null)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg shadow hover:bg-green-700">Create Plan</button></div>
                </form>
            </div>
        </div>
      )}

      {showUploadModal && (/* ... Upload Modal ... */ <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"><div className="bg-white p-8 rounded-xl shadow-2xl w-96 animate-scale-in"><h3 className="text-xl font-bold mb-4">Offline Document Upload</h3>{!selectedUser ? (<div className="mb-4 relative"><label className="block text-xs font-bold mb-1">Find Client (Name/Email)</label><input className="w-full border p-2 rounded" value={userQuery} onChange={e => handleSearchUser(e.target.value)} placeholder="Type to search..." />{searchResults.length > 0 && (<div className="absolute w-full bg-white border shadow-lg mt-1 max-h-40 overflow-y-auto z-10 rounded">{searchResults.map(u => (<div key={u._id} onClick={() => { setSelectedUser(u); setSearchResults([]); }} className="p-2 hover:bg-blue-50 cursor-pointer text-sm">{u.username} <span className="text-gray-400 text-xs">({u.email})</span></div>))}</div>)}<div className="mt-2 text-center text-xs text-gray-500">User not found? Create them in 'Provision User' first.</div></div>) : (<div className="mb-4 bg-blue-50 p-3 rounded flex justify-between items-center"><span className="font-bold text-blue-800 text-sm">{selectedUser.username}</span><button onClick={() => setSelectedUser(null)} className="text-red-500 text-xs font-bold">Change</button></div>)}<form onSubmit={handleAdminUpload}><input type="file" required className="w-full mb-4 text-sm" onChange={e => setUploadFile(e.target.files[0])} /><div className="flex gap-3 justify-end"><button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-slate-600 font-bold">Cancel</button><button disabled={!selectedUser} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow disabled:opacity-50">Upload</button></div></form></div></div>)}
      
      {/* 🔥 INFO MODAL WITH PAYMENT SUMMARY 🔥 */}
      {infoDoc && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl animate-scale-in">
                  <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="text-lg font-bold">Document Lifecycle</h3><button onClick={() => setInfoDoc(null)} className="text-xl font-bold text-slate-400 hover:text-red-500">&times;</button></div>
                  <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto"><p className="text-xs font-bold text-slate-400 uppercase mb-2">Communication Log</p>{infoDoc.notes && infoDoc.notes.length > 0 ? infoDoc.notes.map((n, i) => (<div key={i} className="text-xs border-b border-slate-200 pb-2 mb-2 last:border-0"><span className="font-bold text-blue-700">{n.sender} ({n.role}): </span><span className="text-slate-700">{n.message}</span><div className="text-[9px] text-slate-400 mt-0.5">{formatIST(n.timestamp)}</div></div>)) : <p className="text-xs text-slate-400 italic">No notes available.</p>}</div>
                  <div className="space-y-4 text-sm">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between"><div><p className="text-xs font-bold text-blue-800 uppercase">ID</p><p className="font-mono text-lg font-bold text-blue-900">{infoDoc.tracking_id}</p></div><div className="text-right"><p className="text-xs font-bold text-blue-800 uppercase">Fee</p><p className="font-bold">{infoDoc.fee_status}</p></div></div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3"><h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-2">Timeline Events</h4><div className="flex justify-between"><span className="text-slate-600">Uploaded:</span><span className="font-mono">{formatIST(infoDoc.uploaded_at)}</span></div><div className="flex justify-between"><span className="text-slate-600">Sent to Dept:</span><span className="font-mono">{infoDoc.sent_to_dept_at ? formatIST(infoDoc.sent_to_dept_at) : '-'}</span></div><div className="flex justify-between pl-4 border-l-2 border-yellow-200"><span className="text-slate-600">↳ Faculty Assigned:</span><span className="font-mono text-xs">{infoDoc.assigned_to_faculty_at ? formatIST(infoDoc.assigned_to_faculty_at) : '-'}</span></div><div className="flex justify-between pl-4 border-l-2 border-purple-200"><span className="text-slate-600">↳ Faculty Reported:</span><span className="font-mono text-xs">{infoDoc.faculty_processed_at ? formatIST(infoDoc.faculty_processed_at) : '-'}</span></div><div className="flex justify-between"><span className="text-slate-600">Dept Approved:</span><span className="font-mono">{infoDoc.dept_processed_at ? formatIST(infoDoc.dept_processed_at) : '-'}</span></div><div className="flex justify-between border-t pt-2 mt-2"><span className="text-slate-800 font-bold">Completed:</span><span className="font-mono font-bold text-green-600">{infoDoc.final_report_sent_at ? formatIST(infoDoc.final_report_sent_at) : '-'}</span></div></div>
                      
                      {infoDoc.fee_total > 0 && (
                          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                              <span className="text-xs font-bold text-blue-800 uppercase block mb-2">Financial Lifecycle (₹{infoDoc.fee_total})</span>
                              {infoDoc.installments.map((inst, idx) => (
                                  <div key={inst._id} className="flex justify-between items-center text-xs mt-1 border-b border-blue-100 pb-1">
                                      <span className="text-slate-600">↳ {idx===0 ? "Advance" : "Balance"} (₹{inst.amount}):</span>
                                      <div className="flex items-center gap-2">
                                          <span className={inst.status==='Paid'?"text-green-600 font-bold":"text-red-500 font-bold"}>{inst.status === 'Paid' ? 'Paid' : inst.amount === 0 ? 'N/A' : 'Pending'}</span>
                                          {inst.status === 'Pending' && inst.amount > 0 && <button onClick={() => handleSendReminder(infoDoc._id, inst._id)} className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded border border-orange-200 text-[10px] font-bold hover:bg-orange-200">🔔 Notify</button>}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                      
                      {infoDoc.dept_report && (<div className="mt-4 flex gap-2"><a href={getFileUrl(infoDoc.dept_report)} target="_blank" rel="noopener noreferrer" className="flex-1 block text-center bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700">View Report</a><button onClick={() => handleForceDownload(getFileUrl(infoDoc.dept_report), `${infoDoc.tracking_id}_report`)} className="flex-1 block text-center bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Download Report</button></div>)}
                      {infoDoc.status === 'Dept_Reported' && (<button onClick={() => handleForwardToClient(infoDoc._id)} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow hover:bg-green-700 mt-2">Forward Final Report to Client</button>)}
                      <button onClick={() => setInfoDoc(null)} className="w-full bg-slate-100 py-2 rounded-lg font-bold hover:bg-slate-200 mt-2">Close</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}