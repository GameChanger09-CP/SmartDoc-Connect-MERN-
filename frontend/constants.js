// Environment and API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
export const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

// Application Details
export const APP_NAME = 'SmartDoc Connect';
export const SUPPORT_EMAIL = 'support@smartdoc.com';

// User Roles
export const ROLES = {
  MAIN_ADMIN: 'Main_Admin',
  DEPT_ADMIN: 'Dept_Admin',
  FACULTY: 'Faculty',
  CLIENT: 'Client'
};

// Document Statuses
export const DOC_STATUS = {
  REVIEW_REQUIRED: 'Review_Required',
  IN_PROGRESS: 'In_Progress',
  WITH_FACULTY: 'With_Faculty',
  FACULTY_REPORTED: 'Faculty_Reported',
  DEPT_REPORTED: 'Dept_Reported',
  COMPLETED: 'Completed',
  DECLINED: 'Declined',
  FROZEN: 'Frozen',
  RETURNED_TO_MAIN: 'Returned_To_Main'
};

// --- GLOBAL UTILITIES ---

// Safe Date Formatter
export const formatIST = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-'; // Prevent Invalid Date crash
    return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

// Centralized File URL Generator
export const getFileUrl = (path) => {
    if (!path) return '#';
    const cleanPath = path.replace(/\\/g, '/');
    const separator = cleanPath.startsWith('/') ? '' : '/';
    return `${API_BASE_URL}${separator}${cleanPath}`;
};

// Global Razorpay Loader
export const loadRazorpay = () => {
    return new Promise((resolve) => {
        if (window.Razorpay) { resolve(true); return; }
        const script = document.createElement('script');
        script.src = RAZORPAY_SCRIPT_URL;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

// Secure Force Download
export const forceDownload = (url, baseFilename) => {
    if (!url || url === '#') return alert("File not available for download.");
    const extension = url.split('.').pop().split(/\#|\?/)[0] || 'pdf';
    const filename = `${baseFilename}.${extension}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.blob();
        })
        .then(blob => {
            const link = document.createElement("a");
            const objectUrl = URL.createObjectURL(blob);
            link.href = objectUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl); // Clean up memory
        })
        .catch((err) => {
            console.error("Download failed, opening in new tab:", err);
            window.open(url, '_blank');
        });
};