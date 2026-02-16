import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

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

    const handlePay = () => {
        if (!window.Razorpay) return alert("Payment Gateway Error");

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
                } catch (err) { alert("Verification Failed"); }
            },
            theme: { color: "#2563EB" }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (success) return <div className="min-h-screen flex items-center justify-center bg-green-50"><div className="text-center"><h1 className="text-4xl">✅</h1><h2 className="text-2xl font-bold text-green-700 mt-4">Payment Successful!</h2><p className="text-gray-600 mt-2">You can close this window.</p></div></div>;
    if (error) return <div className="min-h-screen flex items-center justify-center bg-red-50"><div className="text-center"><h2 className="text-2xl font-bold text-red-700">Error</h2><p className="text-red-600 mt-2">{error}</p></div></div>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-slate-200">
                <div className="mb-6">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">💳</div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Secure Payment</h1>
                    <p className="text-slate-500 text-sm mt-1">SmartDoc Connect</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8 text-left">
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-500 text-sm">Document ID</span>
                        <span className="font-mono font-bold text-slate-800">{data.tracking_id}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-500 text-sm">Amount Due</span>
                        <span className="font-bold text-xl text-blue-600">₹{data.amount}</span>
                    </div>
                </div>

                <button onClick={handlePay} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:-translate-y-1">
                    Pay Now
                </button>
            </div>
        </div>
    );
}