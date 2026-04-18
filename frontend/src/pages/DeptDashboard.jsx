import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';
import { formatIST, getFileUrl, forceDownload, DOC_STATUS, ROLES } from '../../constants';

export default function DeptDashboard() {
  const [docs, setDocs] = useState([]);
  const [faculty, setFaculty] = useState([]); 
  const [filterStatus, setFilterStatus] = useState("All"); 
  const [infoDoc, setInfoDoc] = useState(null);
  const [paymentDoc, setPaymentDoc] = useState(null); 
  const [installments, setInstallments] = useState([{ amount: '' }, { amount: '' }]); 
  const [newFaculty, setNewFaculty] = useState({ username: '', email: '', password: '', role: ROLES.FACULTY });
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async () => {
    try {
        const [docRes, facRes] = await Promise.all([api.get('/api/documents/'), api.get('/api/users/faculty')]);
        setDocs(Array.isArray(docRes?.data) ? docRes.data : []);
        setFaculty(facRes?.data || []);
    } catch (error) { console.error("Fetch error", error); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredDocs = docs.filter(doc => {
      if (filterStatus === "All") return true;
      if (filterStatus === "Action_Required") return doc.status === DOC_STATUS.IN_PROGRESS;
      if (filterStatus === "With_Faculty") return doc.status === DOC_STATUS.WITH_FACULTY;
      if (filterStatus === "Review_Ready") return doc.status === DOC_STATUS.FACULTY_REPORTED;
      return true;
  });

  const handleCreateFaculty = async (e) => { 
      e.preventDefault(); 
      setIsProcessing(true);
      try { 
          await api.post('/api/users/', newFaculty); 
          alert(`✅ Faculty created!`); 
          setNewFaculty({ username: '', email: '', password: '', role: ROLES.FACULTY }); 
          fetchData(); 
      } catch (error) { alert(error.response?.data?.error || "Failed to create."); } 
      finally { setIsProcessing(false); }
  };

  const handleAssignToFaculty = async (docId, facultyId) => { 
      if(!facultyId) return alert("Select faculty."); 
      const note = document.getElementById(`note-${docId}`)?.value || ""; 
      try { await api.post(`/api/documents/${docId}/assign_faculty`, { faculty_id: facultyId, note: note }); alert("Assigned!"); fetchData(); } catch (e) { alert("Failed."); } 
  };

  const handleReturnToMain = async (docId) => { 
      const note = window.prompt("Reason for return?"); 
      if(note === null) return; 
      try { await api.post(`/api/documents/${docId}/return`, { note }); alert("Returned."); fetchData(); } catch (e) { alert("Failed."); } 
  };

  const handleApproveFacultyReport = async (docId) => { 
      const note = window.prompt("Approval Note (Optional):"); 
      if(note === null) return;
      if(!window.confirm("Approve report?")) return; 
      try { await api.post(`/api/documents/${docId}/approve_faculty_report`, { note }); alert("Approved!"); fetchData(); } catch (e) { alert("Failed."); } 
  };

  const handleRejectFacultyReport = async (docId) => { 
      const note = window.prompt("Reason for rejection? (Required)"); 
      if(!note) return; 
      try { await api.post(`/api/documents/${docId}/reject_faculty_report`, { note }); alert("Report Rejected. Document reset."); fetchData(); } catch (e) { alert("Failed."); } 
  };

  const handleUnassign = async (docId) => { 
      if(!window.confirm("Revoke this document?")) return; 
      try { await api.post(`/api/documents/${docId}/unassign_faculty`); alert("Document reclaimed!"); fetchData(); } catch (e) { alert("Failed to unassign."); } 
  };

  const handleSubmitReport = async (id, file) => { 
      if(!file) return alert("Select PDF"); 
      const formData = new FormData(); formData.append('report_file', file); 
      try { await api.post(`/api/documents/${id}/dept_submit_report/`, formData); alert("Sent!"); fetchData(); } catch(e) { alert("Failed."); } 
  };

  const handlePaymentRequest = async (e) => { 
      e.preventDefault(); 
      setIsProcessing(true);
      const amounts = installments.map(i => i.amount === '' ? 0 : Number(i.amount)); 
      try { await api.post(`/api/documents/${paymentDoc._id}/request_payment`, { installments: amounts }); alert("Requested!"); setPaymentDoc(null); fetchData(); } catch (error) { alert("Failed."); } 
      finally { setIsProcessing(false); }
  };

  const handleAddInstallment = () => setInstallments([...installments, { amount: '' }]);
  const handleRemoveInstallment = (index) => setInstallments(installments.filter((_, i) => i !== index));
  const handleInstallmentChange = (index, value) => { const newInst = [...installments]; newInst[index].amount = value; setInstallments(newInst); };
  
  const handleSendReminder = async (docId, installmentId) => {
      if(!window.confirm("Send payment reminder email?")) return;
      try {
          await api.post(`/api/documents/${docId}/remind_payment/${installmentId}`);
          alert("Reminder Sent Successfully! 📧");
      } catch(e) { alert("Failed to send reminder."); }
  };

  const handleForwardToClient = async (id) => {
      if(!window.confirm("Forward Final Report to Client?")) return;
      try { await api.post(`/api/documents/${id}/forward_to_client`); fetchData(); setInfoDoc(null); alert("Forwarded Successfully!"); } catch(e) { alert("Failed"); }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between hover:shadow-md transition"><div><p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pending</p><h3 className="text-3xl font-extrabold text-blue-600">{docs.filter(d => d.status === DOC_STATUS.IN_PROGRESS).length}</h3></div><div className="text-2xl bg-blue-50 p-3 rounded-xl">📄</div></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between hover:shadow-md transition"><div><p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Staff</p><h3 className="text-3xl font-extrabold text-orange-600">{faculty.length}</h3></div><div className="text-2xl bg-orange-50 p-3 rounded-xl">👨‍🏫</div></div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between hover:shadow-md transition"><div><p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Reviews</p><h3 className="text-3xl font-extrabold text-purple-600">{docs.filter(d => d.status === DOC_STATUS.WITH_FACULTY).length}</h3></div><div className="text-2xl bg-purple-50 p-3 rounded-xl">👀</div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Add Faculty</h3><form onSubmit={handleCreateFaculty} className="space-y-3"><input className="w-full border p-2.5 rounded-lg text-sm bg-slate-50 outline-none focus:border-orange-500" placeholder="Username" value={newFaculty.username} onChange={e => setNewFaculty({...newFaculty, username: e.target.value})} required /><input className="w-full border p-2.5 rounded-lg text-sm bg-slate-50 outline-none focus:border-orange-500" placeholder="Email" type="email" value={newFaculty.email} onChange={e => setNewFaculty({...newFaculty, email: e.target.value})} required /><input className="w-full border p-2.5 rounded-lg text-sm bg-slate-50 outline-none focus:border-orange-500" placeholder="Password" type="password" value={newFaculty.password} onChange={e => setNewFaculty({...newFaculty, password: e.target.value})} required /><button disabled={isProcessing} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-50">Create</button></form></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Your Team</h3><div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">{faculty.length === 0 ? <p className="text-xs italic text-gray-400">No faculty members.</p> : faculty.map(fac => (<div key={fac._id} className="p-2 bg-slate-50 border rounded-lg text-xs font-bold text-slate-700 flex justify-between"><span className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> {fac.username}</span></div>))}</div></div>
            </div>

            <div className="lg:col-span-3 space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><h3 className="font-bold text-slate-800">Task Inbox</h3><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm border-slate-200 rounded-lg py-1.5 px-3 bg-white font-semibold text-slate-600 outline-none border shadow-sm"><option value="All">All Tasks</option><option value="Action_Required">Action Required</option><option value="With_Faculty">Assigned</option><option value="Review_Ready">Ready for Approval</option></select></div>

                {filteredDocs.length === 0 && <p className="text-center text-gray-500 italic py-10">Inbox is empty.</p>}
                
                {filteredDocs.map(doc => (
                    <div key={doc._id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <a href={getFileUrl(doc.file)} target="_blank" rel="noreferrer" className="text-xl font-mono font-bold text-blue-600 hover:underline">{doc.tracking_id}</a>
                                    <button onClick={() => setInfoDoc(doc)} className="text-slate-400 hover:text-blue-600 text-lg">ℹ️</button>
                                    {doc.fee_total === 0 && <button onClick={() => { setPaymentDoc(doc); setInstallments([{amount: ''}, {amount: ''}]); }} className="text-green-600 hover:text-green-800 text-lg p-1" title="Request Fee">💰</button>}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Client: <strong>{doc.client_username || 'Unknown'}</strong> • Uploaded: {formatIST(doc.uploaded_at)}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${doc.status === DOC_STATUS.FACULTY_REPORTED ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>{doc.status?.replace(/_/g, ' ')}</span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            {doc.status === DOC_STATUS.IN_PROGRESS && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <select id={`fac-${doc._id}`} className="flex-grow p-2.5 border rounded-lg text-sm bg-white outline-none"><option value="">-- Assign --</option>{faculty.map(f => <option key={f._id} value={f._id}>{f.username}</option>)}</select>
                                        <button onClick={() => handleAssignToFaculty(doc._id, document.getElementById(`fac-${doc._id}`)?.value)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">Assign</button>
                                    </div>
                                    <input id={`note-${doc._id}`} className="w-full border p-2 rounded text-xs outline-none" placeholder="Add instructions for faculty..." />
                                    <div className="flex justify-between mt-2">
                                        <div className="flex gap-2"><input type="file" id={`file-${doc._id}`} className="text-xs w-32"/><button onClick={() => handleSubmitReport(doc._id, document.getElementById(`file-${doc._id}`)?.files[0])} className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700 transition">Self-Upload</button></div>
                                        <button onClick={() => handleReturnToMain(doc._id)} className="text-red-500 text-xs font-bold underline hover:text-red-700">Return</button>
                                    </div>
                                </div>
                            )}

                            {doc.status === DOC_STATUS.WITH_FACULTY && (
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-blue-600 font-bold">⏳ With: {doc.current_faculty?.username || 'Unknown'}</p>
                                    <button onClick={() => handleUnassign(doc._id)} className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded font-bold border border-red-200 hover:bg-red-200 transition">Revoke</button>
                                </div>
                            )}

                            {doc.status === DOC_STATUS.FACULTY_REPORTED && (
                                <div className="flex flex-col gap-3 w-full">
                                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex justify-between items-center">
                                        <div className="flex items-center gap-2"><span className="text-xl">📑</span><div><p className="text-xs font-bold text-purple-800 uppercase">Report Submitted</p><p className="text-[10px] text-purple-600">By: {doc.current_faculty?.username || 'Unknown'}</p></div></div>
                                        {doc.dept_report && (<div className="flex gap-2"><a href={getFileUrl(doc.dept_report)} target="_blank" rel="noreferrer" className="text-xs bg-white text-purple-700 px-3 py-1 rounded-lg border border-purple-200 font-bold hover:bg-purple-50">View</a><button onClick={() => forceDownload(getFileUrl(doc.dept_report), `${doc.tracking_id}_report`)} className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-lg border border-green-200 font-bold hover:bg-green-100">Download</button></div>)}
                                    </div>
                                    <div className="flex gap-3 justify-end pt-2 border-t border-slate-200/50">
                                        <button onClick={() => handleRejectFacultyReport(doc._id)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow transition text-xs">Reject & Re-Route</button>
                                        <button onClick={() => handleApproveFacultyReport(doc._id)} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow transition text-xs">Approve & Forward</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </main>

      {/* Payment Modal */}
      {paymentDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 text-slate-800 border-b pb-2">Generate Fee Structure</h3>
                <form onSubmit={handlePaymentRequest}>
                    <div className="space-y-4 mb-6">
                        {installments.map((inst, index) => (
                            <div key={index} className="flex flex-col gap-1">
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
                                {index === 0 && <p className="text-[10px] text-slate-400">If 0, client won't be charged immediately.</p>}
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={handleAddInstallment} className="text-xs font-bold text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 transition w-full mb-6 border-dashed">+ Add Another Future Installment</button>
                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setPaymentDoc(null)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg shadow hover:bg-green-700 disabled:opacity-50">Create Plan</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Info Modal */}
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
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between"><div><p className="text-xs font-bold text-blue-800 uppercase">ID</p><p className="font-mono text-lg font-bold text-blue-900">{infoDoc.tracking_id}</p></div><div className="text-right"><p className="text-xs font-bold text-blue-800 uppercase">Fee</p><p className="font-bold">{infoDoc.fee_status}</p></div></div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                          <div className="flex justify-between border-t pt-2 mt-2"><span className="text-slate-800 font-bold">Completed:</span><span className="font-mono font-bold text-green-600">{infoDoc.final_report_sent_at ? formatIST(infoDoc.final_report_sent_at) : '-'}</span></div>
                      </div>
                      
                      {infoDoc.fee_total > 0 && (<div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100"><span className="text-xs font-bold text-blue-800 uppercase block mb-2">Financial Lifecycle (₹{infoDoc.fee_total})</span>{infoDoc.installments?.map((inst, idx) => (
                          <div key={inst._id} className="flex justify-between items-center text-xs mt-1 border-b border-blue-100 pb-1">
                              <span className="text-slate-600">↳ {idx===0?"Advance":"Balance"} (₹{inst.amount}):</span>
                              <div className="flex items-center gap-2">
                                  <span className={inst.status==='Paid'?"text-green-600 font-bold":"text-red-500 font-bold"}>{inst.status === 'Paid' ? 'Paid' : inst.amount === 0 ? 'N/A' : 'Pending'}</span>
                                  {inst.status === 'Pending' && inst.amount > 0 && <button onClick={() => handleSendReminder(infoDoc._id, inst._id)} className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded border border-orange-200 text-[10px] font-bold hover:bg-orange-200">🔔 Notify</button>}
                              </div>
                          </div>
                      ))}</div>)}
                      
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