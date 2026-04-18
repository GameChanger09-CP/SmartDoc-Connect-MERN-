import axios from 'axios';

// Initialize without a static baseURL
const api = axios.create();

// Request Interceptor: Attach Token & Handle Dynamic Routing
api.interceptors.request.use((config) => {
    // Dynamically adapt baseURL to Render's deployment environment or local dev
    config.baseURL = import.meta.env.VITE_API_URL || window.location.origin;
    
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Token ${token}`;
    
    return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Global Error Handling (e.g., Session Expiry)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.clear();
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                alert("Session expired. Please log in again.");
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;