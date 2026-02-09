import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [docs, setDocs] = useState([]);
  const [depts, setDepts] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [routingDoc, setRoutingDoc] = useState(null);
  
  // State for Creating User
  const [newUser, setNewUser] = useState({ 
      username: '', 
      email: '', 
      password: '', 
      role: 'Client'
  });
  
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
        // Fetch Docs
        const docRes = await api.get('/documents/');
        setDocs(Array.isArray(docRes.data) ? docRes.data : docRes.data.results || []);
        
        // Fetch Pending Users
        const userRes = await api.get('/users/');
        setPendingUsers(Array.isArray(userRes.data) ? userRes.data : userRes.data.results || []);

        // Fetch Departments (Simplified)
        const deptRes = await api.get('/departments/');
        // Handle both paginated and non-paginated responses safely
        setDepts(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data.results || []);
    } catch (err) {
        console.error("Fetch error", err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- ACTIONS ---
  const handleUserAction = async (id, action) => {
    if(!window.confirm(`Confirm ${action}?`)) return;
    await api.post(`/users/${id}/${action}/`);
    fetchData();
    setSelectedUser(null);
  };

  const toggleFreeze = async (id) => {
    await api.post(`/documents/${id}/freeze/`);
    fetchData();
  };

  const declineDoc = async (id) => {
    if(!window.confirm("Are you sure you want to DECLINE this document?")) return;
    try {
        await api.post(`/documents/${id}/decline/`);
        fetchData(); 
    } catch (error) {
        alert("Decline failed. Check permissions.");
    }
  };

  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    const deptId = e.target.dept.value;
    
    if(!deptId) return alert("Please select a department from the list.");

    try {
        console.log(`Sending Doc ${routingDoc.id} to Dept ID: ${deptId}`); // Debug Log
        
        await api.post(`/documents/${routingDoc.id}/route_to/`, { 
            department_id: deptId 
        });
        
        alert("Success! Document has been routed.");
        setRoutingDoc(null);
        fetchData();
    } catch (error) {
        console.error("Routing Error:", error.response);
        // This will show the REAL error from the backend
        alert(error.response?.data?.error || "Routing Failed. Check console.");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
        await api.post('/users/', newUser);
        
        let msg = `User ${newUser.username} created!`;
        if (newUser.role === 'Dept_Admin') {
            msg += `\nDepartment '${newUser.username}' was also auto-created.`;
        }
        alert(msg);
        
        setNewUser({ username: '', email: '', password: '', role: 'Client' });
        fetchData();
    } catch (error) {
        alert("Failed to create user. Username might be taken.");
    }
  };

  const getFileUrl = (path) => {
      if (!path) return '#';
      if (path.startsWith('http')) return path;
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `http://127.0.0.1:8000${cleanPath}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600">GOD MODE DASHBOARD</h1>
        </div>
        <button onClick={() => {localStorage.clear(); navigate('/');}} className="bg-black text-white px-6 py-2 rounded-lg font-bold">Logout</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COL: Management Tools */}
        <div className="space-y-8 lg:col-span-1">
            
            {/* Create User */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <h2 className="text-xl font-bold mb-4 text-green-700 border-b pb-2">👤 Create Verified User</h2>
                <form onSubmit={handleCreateUser} className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Username / Dept Name</label>
                        <input className="w-full border p-2 rounded text-sm" placeholder="Ex: Electrical" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                    </div>
                    
                    <input className="w-full border p-2 rounded text-sm" placeholder="Email" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                    <input className="w-full border p-2 rounded text-sm" placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                    
                    <select className="w-full border p-2 rounded text-sm" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                        <option value="Client">Client</option>
                        <option value="Vendor">Vendor</option>
                        <option value="Dept_Admin">Dept Admin</option>
                    </select>

                    {newUser.role === 'Dept_Admin' && (
                        <p className="text-[10px] text-blue-600 bg-blue-50 p-2 rounded">
                            ℹ User <b>{newUser.username || '...'}</b> will manage the <b>{newUser.username || '...'}</b> Department.
                        </p>
                    )}

                    <button className="w-full bg-green-600 text-white py-2 rounded font-bold text-sm hover:bg-green-700">Create</button>
                </form>
            </div>

            {/* Pending Approvals */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">⚠ Pending Approvals</h2>
                {pendingUsers.length === 0 ? <p className="text-gray-400 italic">No pending users.</p> : (
                    <div className="space-y-3">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                <span onClick={() => setSelectedUser(user)} className="cursor-pointer text-blue-600 font-bold hover:underline text-sm">{user.username}</span>
                                <div className="flex gap-1">
                                    <button onClick={() => handleUserAction(user.id, 'approve')} className="bg-green-500 text-white px-2 py-1 rounded text-xs">✓</button>
                                    <button onClick={() => handleUserAction(user.id, 'reject')} className="bg-red-500 text-white px-2 py-1 rounded text-xs">✗</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Active Depts */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                 <h2 className="text-xl font-bold mb-4 text-gray-600 border-b pb-2">🏢 Active Depts</h2>
                 <div className="flex flex-wrap gap-2">
                    {depts.length > 0 ? depts.map(d => (
                        <span key={d.id} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded border">{d.name}</span>
                    )) : <span className="text-gray-400 italic text-sm">No departments yet.</span>}
                 </div>
            </div>
        </div>

        {/* RIGHT COL: Document Control */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold mb-6 text-blue-900">📄 Document Control</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 uppercase text-xs">
                            <th className="p-3">ID</th>
                            <th className="p-3">Dept</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {docs.map(doc => (
                            <tr key={doc.id} className="hover:bg-gray-50">
                                <td className="p-3 font-mono text-blue-600">
                                    <a 
                                        href={getFileUrl(doc.file)} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="font-bold hover:underline flex items-center gap-1"
                                    >
                                        {doc.tracking_id} ↗
                                    </a>
                                </td>
                                <td className="p-3">{depts.find(d => d.id === doc.current_dept)?.name || "Unassigned"}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${doc.status === 'Declined' ? 'bg-gray-300 text-gray-600 line-through' : 'bg-green-100 text-green-600'}`}>
                                        {doc.status}
                                    </span>
                                </td>
                                <td className="p-3 flex gap-2 justify-center">
                                    <button onClick={() => toggleFreeze(doc.id)} className="p-2 rounded bg-gray-100 hover:bg-gray-200" title={doc.is_frozen ? "Unfreeze" : "Freeze"}>{doc.is_frozen ? "🔓" : "❄"}</button>
                                    <button onClick={() => setRoutingDoc(doc)} className="p-2 rounded bg-blue-50 text-blue-600 font-bold hover:bg-blue-100">↪ Route</button>
                                    <button onClick={() => declineDoc(doc.id)} className="p-2 rounded bg-red-50 text-red-600 font-bold hover:bg-red-100">✖</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* Routing Modal */}
      {routingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-96">
                <h3 className="text-xl font-bold mb-4">Route Document</h3>
                <form onSubmit={handleRouteSubmit}>
                    <select name="dept" className="w-full border p-3 rounded-lg mb-6" required>
                        <option value="">-- Choose Department --</option>
                        {/* ROBUST DROPDOWN LIST */}
                        {(depts || []).map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                    <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => setRoutingDoc(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Confirm</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-xl w-96">
                <h3 className="text-xl font-bold mb-4">User Details</h3>
                <p><strong>User:</strong> {selectedUser.username}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Role:</strong> {selectedUser.role}</p>
                {selectedUser.gov_id ? (
                    <a 
                        href={getFileUrl(selectedUser.gov_id)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="mt-4 block text-center w-full bg-blue-50 text-blue-700 py-2 rounded font-bold hover:bg-blue-100"
                    >
                        View ID Proof 📎
                    </a>
                ) : <p className="text-red-400 mt-4 italic">No ID uploaded</p>}
                <button onClick={() => setSelectedUser(null)} className="mt-4 w-full bg-gray-200 py-2 rounded font-bold hover:bg-gray-300">Close</button>
            </div>
        </div>
      )}
    </div>
  );
}   