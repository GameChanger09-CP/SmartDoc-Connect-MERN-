import React, { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';

// --- 🔥 FIX: DYNAMICALLY LOAD RAZORPAY WITHOUT TOUCHING HTML 🔥 ---
const loadRazorpay = () => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export default function ClientDashboard() {
  const [file, setFile] = useState(null);
  const [docs, setDocs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All"); 
  const [infoDoc, setInfoDoc] = useState(null); 

  const fetchDocs = async () => {
    try {
        const res = await api.get('/api/documents/');
        setDocs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) { console.error("Fetch error", error); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const filteredDocs = docs.filter(doc => {
      if (filterStatus === "All") return true;
      if (filterStatus === "Active") return doc.status !== 'Completed' && doc.status !== 'Declined';
      if (filterStatus === "Completed") return doc.status === 'Completed';
      return true;
  });

  const handleUpload = async (e) => {
    e.preventDefault();
    if(!file) return alert("Please select a file");
    const formData = new FormData(); formData.append('file', file);
    try { await api.post('/api/documents/', formData); fetchDocs(); setFile(null); alert('Uploaded successfully!'); } 
    catch (error) { alert("Upload Failed."); }
  };

  // --- 🔥 UPDATED RAZORPAY CHECKOUT LOGIC 🔥 ---
  const handleCheckout = async (doc, installment) => {
      // Wait for the script to load automatically
      const isLoaded = await loadRazorpay();
      
      if (!isLoaded) {
          return alert("Razorpay SDK failed to load. Please verify your internet connection.");
      }

      try {
          // 1. Fetch Key securely from backend
          const res = await api.get('/api/documents/get-razorpay-key');
          const key = res.data.key;
          
          if (!key) throw new Error("Razorpay key missing from backend.");

          // 2. Configure Razorpay Options
          const options = {
              key: key,
              amount: Math.round(installment.amount * 100), // MUST be integer in paise
              currency: "INR",
              name: "SmartDoc Connect",
              description: `Verification Fee: ${doc.tracking_id}`,
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
                      alert("Payment Successful! ✅"); 
                      fetchDocs();
                  } catch (err) { 
                      console.error("Verification Error:", err);
                      alert("Payment verification failed on server. Contact support."); 
                  }
              },
              theme: { color: "#2563EB" }
          };

          // 3. Open Popup
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response){
              console.error("Payment Failed event:", response.error);
              alert(`Payment Failed: ${response.error.description}`);
          });
          rzp.open();
          
      } catch (err) { 
          console.error("Initiation Error:", err);
          alert(`Could not initiate payment: ${err.message || 'Server connection error.'}`); 
      }
  };

  const getFileUrl = (path) => path ? `http://127.0.0.1:8000/${path.replace(/\\/g, '/')}` : '#';

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 py-10">
        
        <div className="mb-10 flex justify-between items-end">
            <div><h1 className="text-3xl font-extrabold text-gray-900">My Documents</h1><p className="text-gray-500 mt-2">Track submissions and pay fees.</p></div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs border-gray-200 rounded-lg py-2 px-3 bg-white border shadow-sm"><option value="All">All Documents</option><option value="Active">Active / Pending</option><option value="Completed">Completed</option></select>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 mb-10 flex flex-col md:flex-row items-center gap-6">
            <div className="bg-blue-50 p-4 rounded-full text-blue-600 text-3xl">📄</div>
            <div className="flex-grow"><h3 className="text-lg font-bold">Submit New Application</h3><p className="text-sm text-gray-500">Upload PDF for verification.</p></div>
            <form onSubmit={handleUpload} className="flex gap-3"><input type="file" onChange={e => setFile(e.target.files[0])} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50" /><button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow">Upload</button></form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map(doc => (
                <div key={doc._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${doc.status === 'Completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <div className="flex justify-between items-start mb-4"><span className="font-mono text-xs font-bold uppercase">{doc.tracking_id}</span><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${doc.status === 'Completed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>{doc.status.replace(/_/g, ' ')}</span></div>
                    <h4 className="font-bold mb-2">Application Document</h4><p className="text-xs text-gray-500 mb-4 flex-grow">Uploaded: {doc.uploaded_at?.slice(0, 10)}</p>

                    {/* PAYMENT BUTTONS IN CARD */}
                    {doc.fee_total > 0 && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                            <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-2">
                                <span className="text-xs font-bold text-slate-800 uppercase">Fees: ₹{doc.fee_total}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${doc.fee_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{doc.fee_status}</span>
                            </div>
                            {doc.installments.map((inst, idx) => (
                                <div key={inst._id} className="flex justify-between items-center text-xs mt-2">
                                    <span className="text-slate-600 font-medium">Part {idx + 1}: ₹{inst.amount}</span>
                                    {inst.status === 'Paid' ? <span className="text-green-600 font-bold">✅ Paid</span> : <button onClick={() => handleCheckout(doc, inst)} className="bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-900 font-bold transition shadow-sm">Pay Now</button>}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center border-t border-gray-50 pt-4">
                        <button onClick={() => setInfoDoc(doc)} className="text-sm font-bold text-blue-600 hover:underline">View Status</button>
                        {doc.status === 'Completed' && doc.dept_report && (<a href={getFileUrl(doc.dept_report)} target="_blank" rel="noopener noreferrer" className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-bold">⬇ Report</a>)}
                    </div>
                </div>
            ))}
            {filteredDocs.length === 0 && <div className="col-span-full text-center text-gray-400 italic py-10">No documents match this filter.</div>}
        </div>
      </div>

      {/* SIMPLIFIED INFO MODAL */}
      {infoDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl animate-scale-in">
                <div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold">Document Status</h3><button onClick={() => setInfoDoc(null)} className="text-xl">&times;</button></div>
                <div className="space-y-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded-lg border text-center"><p className="text-xs font-bold uppercase">Tracking ID</p><p className="font-mono text-2xl font-extrabold text-blue-900">{infoDoc.tracking_id}</p></div>
                    <div className="bg-gray-50 p-6 rounded-lg border space-y-6">
                        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">📤</div><div><p className="font-bold">Received</p><p className="text-xs">{infoDoc.uploaded_at?.slice(0, 16).replace('T', ' ')}</p></div></div>
                        <div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${infoDoc.status === 'Completed' ? 'bg-green-100' : 'bg-yellow-100 animate-pulse'}`}>{infoDoc.status === 'Completed' ? '✅' : '⚙️'}</div><div><p className="font-bold">Processing</p><p className="text-xs">{infoDoc.status === 'Completed' ? 'Verification Complete' : 'Under review by team.'}</p></div></div>
                    </div>

                    {infoDoc.fee_total > 0 && (
                        <div className="bg-slate-50 p-3 rounded border">
                            <span className="text-xs font-bold uppercase block mb-1">Financial History</span>
                            {infoDoc.installments.map((inst, idx) => (<div key={inst._id} className="flex justify-between text-xs mt-1 border-b pb-1"><span>Part {idx + 1} (₹{inst.amount})</span><span className={inst.status==='Paid'?"text-green-600 font-bold":"text-red-500 font-bold"}>{inst.status === 'Paid' ? `Paid: ${inst.paid_at?.slice(0,10)}` : 'Unpaid'}</span></div>))}
                        </div>
                    )}
                    <button onClick={() => setInfoDoc(null)} className="w-full bg-gray-100 py-2 rounded font-bold">Close</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}