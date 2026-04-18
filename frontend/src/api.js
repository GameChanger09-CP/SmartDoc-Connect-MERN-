import axios from 'axios';
import { API_BASE_URL } from '../constants';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Request Interceptor: Attach Token
api.interceptors.request.use((config) => {
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