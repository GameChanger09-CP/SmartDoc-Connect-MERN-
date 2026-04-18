import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';
import { formatIST, getFileUrl, forceDownload, loadRazorpay, DOC_STATUS } from '../../constants';

export default function ClientDashboard() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null); 
  const [docs, setDocs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All"); 
  const [infoDoc, setInfoDoc] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocs = async () => {
    try {
        const res = await api.get('/api/documents/');
        setDocs(Array.isArray(res?.data) ? res.data : []);
    } catch (error) { console.error("Fetch error", error); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const getClientStatus = (status) => {
      const activeStates = [DOC_STATUS.REVIEW_REQUIRED, DOC_STATUS.IN_PROGRESS, DOC_STATUS.WITH_FACULTY, DOC_STATUS.FACULTY_REPORTED, DOC_STATUS.DEPT_REPORTED, DOC_STATUS.RETURNED_TO_MAIN];
      if (activeStates.includes(status)) return 'In Progress';
      if (status === DOC_STATUS.COMPLETED) return 'Completed';
      if (status === DOC_STATUS.DECLINED) return 'Declined';
      if (status === DOC_STATUS.FROZEN) return 'On Hold';
      return status; 
  };

  const getStatusColor = (status) => {
      const s = getClientStatus(status);
      if (s === 'Completed') return 'bg-green-100 text-green-700 border-green-200';
      if (s === 'Declined') return 'bg-red-100 text-red-700 border-red-200';
      if (s === 'On Hold') return 'bg-slate-100 text-slate-700 border-slate-200';
      return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const filteredDocs = docs.filter(doc => {
      if (filterStatus === "All") return true;
      if (filterStatus === "Active") return doc.status !== DOC_STATUS.COMPLETED && doc.status !== DOC_STATUS.DECLINED;
      if (filterStatus === "Completed") return doc.status === DOC_STATUS.COMPLETED;
      return true;
  });

  const handleFileSelect = (e) => {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
          setFile(selectedFile);
          setPreviewUrl(URL.createObjectURL(selectedFile));
      }
  };

  const cancelUpload = () => {
      setFile(null);
      setPreviewUrl(null);
      document.getElementById('client-file-upload').value = '';
  };

  const confirmUpload = async () => {
    if(!file) return alert("Please select a file to upload.");
    setIsUploading(true);
    const formData = new FormData(); formData.append('file', file);
    try { 
        await api.post('/api/documents/', formData); 
        fetchDocs(); 
        cancelUpload(); 
        alert('Document uploaded successfully!'); 
    } 
    catch (error) { alert(error.response?.data?.error || "Upload Failed."); }
    finally { setIsUploading(false); }
  };

  const handleCheckout = async (doc, installment) => {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) return alert("Razorpay failed to load. Check your internet connection.");
      try {
          const { data: { key } } = await api.get('/api/documents/get-razorpay-key');
          const options = {
              key: key,
              amount: Math.round(installment.amount * 100),
              currency: "INR",
              name: "SmartDoc Connect",
              description: `Verification Fee`,
              order_id: installment.razorpay_order_id,
              handler: async function (response) {
                  try {
                      await api.post('/api/documents/verify_payment', {
                          doc_id: doc._id,
                          installment_id: installment._id,
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_signature: response.razorpay_signature
                      });
                      alert("Payment Successful! ✅"); fetchDocs();
                  } catch (err) { alert("Verification failed. Please contact support."); }
              },
              theme: { color: "#2563EB" }
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
      } catch (err) { alert("Payment initialization failed."); }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 py-10">
        <div className="mb-10 flex justify-between items-end">
            <div><h1 className="text-3xl font-extrabold text-slate-900">My Documents</h1><p className="text-slate-500 mt-1">Track status and pay fees.</p></div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm border border-slate-300 rounded-lg p-2 outline-none"><option value="All">All Documents</option><option value="Active">Active</option><option value="Completed">Completed</option></select>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-10 flex flex-col md:flex-row items-center gap-6 animate-fade-in-up">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-full text-3xl">📄</div>
            <div className="flex-grow"><h3 className="text-lg font-bold">New Application</h3><p className="text-sm text-slate-500">Upload PDF documents.</p></div>
            <div className="flex gap-3">
                <input 
                    type="file" 
                    id="client-file-upload"
                    accept="application/pdf,image/jpeg,image/png" 
                    onChange={handleFileSelect} 
                    className="text-sm file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded-full file:px-4 file:py-2 hover:file:bg-blue-100 transition cursor-pointer" 
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map(doc => (
                <div key={doc._id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden group hover:shadow-xl transition duration-300 animate-fade-in-up">
                    <div className={`absolute top-0 left-0 w-1 h-full ${doc.status === DOC_STATUS.COMPLETED ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                    
                    <div className="flex justify-between items-start mb-4">
                        <a href={getFileUrl(doc.file)} target="_blank" rel="noopener noreferrer" className="font-mono text-xs font-bold text-blue-600 hover:underline uppercase">
                            {doc.tracking_id}
                        </a>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(doc.status)}`}>
                            {getClientStatus(doc.status)}
                        </span>
                    </div>
                    
                    <h4 className="font-bold mb-2">Application Document</h4>
                    <p className="text-xs text-slate-500 mb-4 flex-grow">Uploaded: {formatIST(doc.uploaded_at)}</p>

                    {doc.fee_total > 0 && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                            <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-2">
                                <span className="text-xs font-bold text-slate-800 uppercase">Fees: ₹{doc.fee_total}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${doc.fee_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{doc.fee_status}</span>
                            </div>
                            {doc.installments?.map((inst, i) => (
                                <div key={inst._id} className="flex justify-between items-center text-xs mt-2">
                                    <span className="text-slate-600 font-medium">Part {i+1}: ₹{inst.amount}</span>
                                    {inst.status === 'Paid' ? (
                                        <span className="text-green-600 font-bold">✅ Paid</span>
                                    ) : (
                                        <button onClick={() => handleCheckout(doc, inst)} className="bg-slate-900 text-white px-3 py-1 rounded hover:bg-slate-800 font-bold transition shadow-sm">Pay Now</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
                        <div className="flex justify-between items-center">
                            <button onClick={() => setInfoDoc(doc)} className="text-sm font-bold text-blue-600 hover:underline">View Status</button>
                        </div>
                        {doc.status === DOC_STATUS.COMPLETED && doc.dept_report && (
                            <div className="flex gap-2 mt-2">
                                <a href={getFileUrl(doc.dept_report)} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-[10px] bg-purple-50 text-purple-700 px-2 py-1.5 rounded border border-purple-200 font-bold hover:bg-purple-100 transition">View Report</a>
                                <button onClick={() => forceDownload(getFileUrl(doc.dept_report), `${doc.tracking_id}_report`)} className="flex-1 text-center text-[10px] bg-green-50 text-green-700 px-2 py-1.5 rounded border border-green-200 font-bold hover:bg-green-100 transition">Download</button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {filteredDocs.length === 0 && <div className="col-span-full text-center text-slate-400 italic py-10">No documents found.</div>}
        </div>
      </div>

      {previewUrl && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl animate-scale-in">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-lg font-bold">Document Preview</h3>
                      <button onClick={cancelUpload} className="text-xl font-bold text-slate-400 hover:text-red-500">&times;</button>
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-lg border border-slate-200 mb-4 overflow-hidden">
                      <iframe src={previewUrl} className="w-full h-full" title="Document Preview"></iframe>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                      <button onClick={cancelUpload} disabled={isUploading} className="px-6 py-2 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
                          Cancel
                      </button>
                      <button onClick={confirmUpload} disabled={isUploading} className="px-6 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition">
                          {isUploading ? 'Uploading...' : 'Confirm & Upload'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Info Modal */}
      {infoDoc && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl animate-scale-in">
                  <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold text-lg">Status & Remarks</h3><button onClick={() => setInfoDoc(null)} className="text-xl">&times;</button></div>
                  
                  {infoDoc.notes && infoDoc.notes.length > 0 && (
                      <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Admin Remarks</p>
                          {infoDoc.notes.map((n, i) => (
                              <div key={i} className="text-xs border-b border-slate-200 pb-2 mb-2 last:border-0">
                                  <span className="font-bold text-blue-700">Admin: </span>
                                  <span className="text-slate-700">{n.message}</span>
                                  <div className="text-[9px] text-slate-400 mt-0.5">{formatIST(n.timestamp)}</div>
                              </div>
                          ))}
                      </div>
                  )}

                  <div className="space-y-4 text-sm">
                      <div className="bg-blue-50 p-3 rounded-lg border text-center border-blue-100"><p className="text-xs font-bold uppercase text-blue-800">Tracking ID</p><p className="font-mono text-2xl font-extrabold text-blue-900">{infoDoc.tracking_id}</p></div>
                      
                      <div className="bg-slate-50 p-6 rounded-lg border space-y-6">
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">📤</div>
                              <div><p className="font-bold">Received</p><p className="text-xs text-slate-500">{formatIST(infoDoc.uploaded_at)}</p></div>
                          </div>
                          <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${infoDoc.status === DOC_STATUS.COMPLETED ? 'bg-green-100' : 'bg-yellow-100 animate-pulse'}`}>{infoDoc.status === DOC_STATUS.COMPLETED ? '✅' : '⚙️'}</div>
                              <div>
                                  <p className="font-bold">{getClientStatus(infoDoc.status) === 'Completed' ? 'Verification Complete' : 'Internal Processing'}</p>
                                  <p className="text-xs text-slate-500">{getClientStatus(infoDoc.status) === 'Completed' ? 'Final report ready.' : 'Currently under review by our team.'}</p>
                              </div>
                          </div>
                      </div>

                      {infoDoc.fee_total > 0 && (
                          <div className="bg-slate-50 p-3 rounded border">
                              <span className="text-xs font-bold uppercase block mb-1">Financial History</span>
                              {infoDoc.installments?.map((inst, idx) => (
                                  <div key={inst._id} className="flex justify-between text-xs mt-1 border-b pb-1 last:border-0">
                                      <span>Part {idx + 1} (₹{inst.amount})</span>
                                      <span className={inst.status==='Paid'?"text-green-600 font-bold":"text-red-500 font-bold"}>{inst.status === 'Paid' ? `Paid: ${formatIST(inst.paid_at)}` : 'Unpaid'}</span>
                                  </div>
                              ))}
                          </div>
                      )}
                      <button onClick={() => setInfoDoc(null)} className="w-full bg-slate-900 text-white py-2 rounded font-bold hover:bg-slate-800 transition">Close</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}