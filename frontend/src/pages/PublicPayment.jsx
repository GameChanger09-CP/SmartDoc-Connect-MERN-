import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

// Helper to load Razorpay Script dynamically
const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export default function PublicPayment() {
    const { docId, installmentId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                // Fetch public info (no auth required)
                const res = await api.get(`/api/documents/public-payment-info/${docId}/${installmentId}`);
                setData(res.data);
            } catch (e) {
                setError(e.response?.data?.error || "Invalid Link or Already Paid");
            } finally {
                setLoading(false);
            }
        };
        fetchInfo();
    }, [docId, installmentId]);

    const handlePay = async () => {
        // 🔥 CRITICAL FIX: Ensure script loads before using it
        const isLoaded = await loadRazorpay();
        if (!isLoaded) return alert("Failed to load Payment Gateway. Check internet connection.");

        const options = {
            key: data.key,
            amount: Math.round(data.amount * 100),
            currency: "INR",
            name: "SmartDoc Connect",
            description: `Fee Payment for ${data.tracking_id}`,
            order_id: data.razorpay_order_id,
            handler: async function (response) {
                try {
                    await api.post('/api/documents/verify-public-payment', {
                        doc_id: docId,
                        installment_id: installmentId,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    });
                    setSuccess(true);
                } catch (err) { alert("Verification Failed. Please contact admin."); }
            },
            theme: { color: "#2563EB" }
        };
        
        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-sans text-slate-500">Loading Payment Details...</div>;
    
    if (success) return (
        <div className="min-h-screen flex items-center justify-center bg-green-50 font-sans">
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
                <h1 className="text-5xl mb-4">✅</h1>
                <h2 className="text-2xl font-bold text-green-700">Payment Successful!</h2>
                <p className="text-gray-500 mt-2">The document status has been updated.</p>
                <p className="text-xs text-gray-400 mt-4">You can safely close this window.</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 font-sans">
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl">
                <h1 className="text-5xl mb-4">⚠️</h1>
                <h2 className="text-2xl font-bold text-red-700">Payment Link Invalid</h2>
                <p className="text-red-500 mt-2">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-center border border-white/50">
                <div className="mb-8">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-sm">💳</div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Secure Payment</h1>
                    <p className="text-slate-500 text-sm mt-1">SmartDoc Connect</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 text-left space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Document ID</span>
                        <span className="font-mono font-bold text-slate-800 bg-white px-2 py-1 rounded border">{data.tracking_id}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 pt-4">
                        <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Amount Due</span>
                        <span className="font-extrabold text-3xl text-blue-600">₹{data.amount}</span>
                    </div>
                </div>

                <button onClick={handlePay} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 transition transform hover:-translate-y-1 active:scale-95">
                    Pay Now securely
                </button>
                
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <span>🔒 Secured by Razorpay</span>
                </div>
            </div>
        </div>
    );
}