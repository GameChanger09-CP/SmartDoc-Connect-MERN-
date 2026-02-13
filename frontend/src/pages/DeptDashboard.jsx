import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';

export default function DeptDashboard() {
  const [docs, setDocs] = useState([]);
  const [faculty, setFaculty] = useState([]); 
  const [filterStatus, setFilterStatus] = useState("All"); 
  const [infoDoc, setInfoDoc] = useState(null);
  
  // --- 🔥 NEW CUSTOM INSTALLMENT STATE 🔥 ---
  const [paymentDoc, setPaymentDoc] = useState(null); 
  const [installments, setInstallments] = useState([{ amount: '' }]); 
  
  const [newFaculty, setNewFaculty] = useState({ username: '', email: '', password: '', role: 'Faculty' });

  const fetchData = async () => {
    try {
        const [docRes, facRes] = await Promise.all([api.get('/api/documents/'), api.get('/api/faculty/')]);
        setDocs(Array.isArray(docRes.data) ? docRes.data : docRes.data.results || []);
        setFaculty(facRes.data || []);
    } catch (error) { console.error("Fetch error", error); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredDocs = docs.filter(doc => {
      if (filterStatus === "All") return true;
      if (filterStatus === "Action_Required") return doc.status === 'In_Progress';
      if (filterStatus === "With_Faculty") return doc.status === 'With_Faculty';
      if (filterStatus === "Review_Ready") return doc.status === 'Faculty_Reported';
      return true;
  });

  const handleCreateFaculty = async (e) => { e.preventDefault(); try { await api.post('/api/users/', newFaculty); alert(`✅ Faculty created!`); setNewFaculty({ username: '', email: '', password: '', role: 'Faculty' }); fetchData(); } catch (error) { alert("Failed."); } };
  const handleAssignToFaculty = async (docId, facultyId) => { if(!facultyId) return alert("Select faculty."); try { await api.post(`/api/documents/${docId}/assign_faculty`, { faculty_id: facultyId }); alert("Assigned!"); fetchData(); } catch (e) { alert("Failed."); } };
  const handleReturnToMain = async (docId) => { if(!window.confirm("Return to Admin?")) return; try { await api.post(`/api/documents/${docId}/return`); alert("Returned."); fetchData(); } catch (e) { alert("Failed."); } };
  const handleApproveFacultyReport = async (docId) => { if(!window.confirm("Approve report?")) return; try { await api.post(`/api/documents/${docId}/approve_faculty_report`); alert("Approved!"); fetchData(); } catch (e) { alert("Failed."); } };
  const handleSubmitReport = async (id, file) => { if(!file) return alert("Select PDF"); const formData = new FormData(); formData.append('report_file', file); try { await api.post(`/api/documents/${id}/dept_submit_report/`, formData); alert("Sent!"); fetchData(); } catch(e) { alert("Failed."); } };

  // --- 🔥 NEW CUSTOM PAYMENT LOGIC 🔥 ---
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
          alert("Payment requested & Client Notified!"); setPaymentDoc(null); fetchData();
      } catch (error) { alert(error.response?.data?.error || "Failed to request fee."); }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8000/${path.replace(/\\/g, '/')}` : '#';

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between hover:shadow-md transition"><div><p className="text-gray-500 text-xs font-bold uppercase">Pending</p><h3 className="text-3xl font-extrabold text-blue-600">{docs.filter(d => d.status === 'In_Progress').length}</h3></div><div className="text-2xl bg-blue-50 p-3 rounded-xl">📄</div></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between hover:shadow-md transition"><div><p className="text-gray-500 text-xs font-bold uppercase">Staff</p><h3 className="text-3xl font-extrabold text-orange-600">{faculty.length}</h3></div><div className="text-2xl bg-orange-50 p-3 rounded-xl">👨‍🏫</div></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between hover:shadow-md transition"><div><p className="text-gray-500 text-xs font-bold uppercase">Reviews</p><h3 className="text-3xl font-extrabold text-purple-600">{docs.filter(d => d.status === 'With_Faculty').length}</h3></div><div className="text-2xl bg-purple-50 p-3 rounded-xl">👀</div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold mb-4 border-b pb-2">Add Faculty</h3>
                    <form onSubmit={handleCreateFaculty} className="space-y-3">
                        <input className="w-full border p-2 rounded text-xs bg-gray-50" placeholder="Username" value={newFaculty.username} onChange={e => setNewFaculty({...newFaculty, username: e.target.value})} required />
                        <input className="w-full border p-2 rounded text-xs bg-gray-50" placeholder="Email" type="email" value={newFaculty.email} onChange={e => setNewFaculty({...newFaculty, email: e.target.value})} required />
                        <input className="w-full border p-2 rounded text-xs bg-gray-50" placeholder="Password" type="password" value={newFaculty.password} onChange={e => setNewFaculty({...newFaculty, password: e.target.value})} required />
                        <button className="w-full bg-orange-600 text-white py-2 rounded font-bold text-xs hover:bg-orange-700">Create</button>
                    </form>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold mb-4 border-b pb-2">Your Team</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">{faculty.map(fac => (<div key={fac._id} className="p-2 bg-gray-50 border rounded text-xs font-bold flex justify-between"><span className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> {fac.username}</span></div>))}</div>
                </div>
            </div>

            <div className="lg:col-span-3 space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800">Task Inbox</h3>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs border-gray-200 rounded-lg py-2 px-3 bg-gray-50 font-semibold outline-none border shadow-sm"><option value="All">All Tasks</option><option value="Action_Required">Action Required</option><option value="With_Faculty">Assigned</option><option value="Review_Ready">Ready for Approval</option></select>
                </div>

                {filteredDocs.length === 0 ? <div className="text-center py-20 bg-white rounded-2xl border border-dashed text-gray-400">No tasks.</div> : filteredDocs.map(doc => (
                    <div key={doc._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <a href={getFileUrl(doc.file)} target="_blank" rel="noopener noreferrer" className="text-xl font-mono font-bold text-blue-600 hover:underline">{doc.tracking_id}</a>
                                    <button onClick={() => setInfoDoc(doc)} className="text-gray-400 hover:text-blue-600 text-lg">ℹ️</button>
                                    
                                    {/* 🔥 ONLY SHOW BUTTON IF NOT ESTIMATED YET 🔥 */}
                                    {doc.fee_total === 0 && (
                                        <button onClick={() => { setPaymentDoc(doc); setInstallments([{amount: ''}]); }} className="text-green-600 font-bold text-lg p-1 hover:text-green-800" title="Request Fee">💰</button>
                                    )}

                                </div>
                                <p className="text-xs text-gray-500 mt-1">Client: <strong>{doc.client_username}</strong> • Uploaded: {doc.uploaded_at?.slice(0, 10)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${doc.status === 'Faculty_Reported' ? 'bg-purple-100 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>{doc.status.replace(/_/g, ' ')}</span>
                                {doc.fee_total > 0 && <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${doc.fee_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Fee: {doc.fee_status}</span>}
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            {doc.status === 'In_Progress' && (
                                <div className="flex flex-col md:flex-row gap-4 items-center">
                                    <div className="flex-grow flex gap-2 w-full"><select id={`fac-${doc._id}`} className="flex-grow p-2 border rounded text-sm bg-white"><option value="">-- Assign --</option>{faculty.map(f => <option key={f._id} value={f._id}>{f.username}</option>)}</select><button onClick={() => handleAssignToFaculty(doc._id, document.getElementById(`fac-${doc._id}`).value)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold">Assign</button></div>
                                    <div className="flex gap-2 w-full md:w-auto"><input type="file" id={`file-${doc._id}`} className="text-xs w-48 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-white"/><button onClick={() => handleSubmitReport(doc._id, document.getElementById(`file-${doc._id}`).files[0])} className="bg-orange-600 text-white px-3 py-2 rounded text-sm font-bold">Self-Upload</button></div>
                                    <button onClick={() => handleReturnToMain(doc._id)} className="text-red-500 text-xs font-bold underline">Return</button>
                                </div>
                            )}
                            {doc.status === 'With_Faculty' && <div className="flex justify-between items-center"><p className="text-sm text-blue-600 font-bold">⏳ With: {doc.current_faculty?.username}</p></div>}
                            {doc.status === 'Faculty_Reported' && <button onClick={() => handleApproveFacultyReport(doc._id)} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold">Approve</button>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </main>

      {/* 🔥 NEW DYNAMIC PAYMENT REQUEST MODAL 🔥 */}
      {paymentDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-[400px] animate-scale-in max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-2 text-gray-800">Generate Fee Request</h3>
                <p className="text-sm text-gray-500 mb-6">For Document ID: <span className="font-mono font-bold text-blue-600">{paymentDoc.tracking_id}</span></p>
                
                <form onSubmit={handlePaymentRequest}>
                    <div className="space-y-3 mb-6">
                        {installments.map((inst, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="flex-grow">
                                    <label className="block text-xs font-bold mb-1 text-gray-500">Installment {index + 1} Amount (₹)</label>
                                    <input type="number" min="1" value={inst.amount} onChange={e => handleInstallmentChange(index, e.target.value)} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" required placeholder="e.g. 500" />
                                </div>
                                {installments.length > 1 && (
                                    <button type="button" onClick={() => handleRemoveInstallment(index)} className="mt-5 text-red-500 hover:text-red-700 font-bold text-xl">&times;</button>
                                )}
                            </div>
                        ))}
                    </div>

                    <button type="button" onClick={handleAddInstallment} className="text-xs font-bold text-blue-600 border border-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition w-full mb-6">+ Add Another Installment</button>

                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setPaymentDoc(null)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700">Send Request</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* RETAINED FULL TIMELINE MODAL + FINANCE */}
      {infoDoc && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl animate-scale-in">
                  <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="text-lg font-bold">Document Lifecycle</h3><button onClick={() => setInfoDoc(null)} className="text-xl font-bold text-gray-400 hover:text-red-500">&times;</button></div>
                  <div className="space-y-4 text-sm">
                      <div className="bg-blue-50 p-3 rounded-lg border flex justify-between"><div><p className="text-xs font-bold uppercase">ID</p><p className="font-mono text-lg font-bold text-blue-900">{infoDoc.tracking_id}</p></div><div className="text-right"><p className="text-xs font-bold uppercase">Fee</p><p className="font-bold">{infoDoc.fee_status}</p></div></div>
                      <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
                          <h4 className="text-xs font-bold text-gray-500 uppercase border-b pb-2">Timeline Events</h4>
                          <div className="flex justify-between"><span className="text-gray-600">Uploaded:</span><span className="font-mono">{infoDoc.uploaded_at?.slice(0, 16).replace('T', ' ')}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Sent to Dept:</span><span className="font-mono">{infoDoc.sent_to_dept_at?.slice(0, 16).replace('T', ' ') || '-'}</span></div>
                          <div className="flex justify-between pl-4 border-l-2"><span className="text-gray-600">↳ Faculty:</span><span className="font-mono text-xs">{infoDoc.assigned_to_faculty_at?.slice(0, 16).replace('T', ' ') || '-'}</span></div>
                          <div className="flex justify-between pl-4 border-l-2"><span className="text-gray-600">↳ Reported:</span><span className="font-mono text-xs">{infoDoc.faculty_processed_at?.slice(0, 16).replace('T', ' ') || '-'}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Dept Approved:</span><span className="font-mono">{infoDoc.dept_processed_at?.slice(0, 16).replace('T', ' ') || '-'}</span></div>
                          <div className="flex justify-between border-t pt-2"><span className="text-gray-800 font-bold">Completed:</span><span className="font-mono font-bold text-green-600">{infoDoc.final_report_sent_at?.slice(0, 16).replace('T', ' ') || '-'}</span></div>
                      </div>
                      {infoDoc.fee_total > 0 && (
                          <div className="bg-blue-50/50 p-3 rounded border border-blue-100">
                              <span className="text-xs font-bold text-blue-800 uppercase block mb-2">Financial Lifecycle (₹{infoDoc.fee_total})</span>
                              {infoDoc.installments.map((inst, idx) => (<div key={inst._id} className="flex justify-between text-xs mt-1 border-b border-blue-50 pb-1"><span className="text-gray-600">↳ Part {idx + 1} (₹{inst.amount}):</span><span className={inst.status==='Paid'?"text-green-600 font-bold":"text-red-500 font-bold"}>{inst.status}</span></div>))}
                          </div>
                      )}
                      <button onClick={() => setInfoDoc(null)} className="w-full bg-gray-100 py-2 rounded font-bold hover:bg-gray-200">Close</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}