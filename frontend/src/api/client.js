import axios from 'axios';

// Vite proxy sayesinde baseURL boş bırakılınca "/api/..." istekleri backend'e gider.
// İsterseniz frontend/.env içinde VITE_API_BASE_URL tanımlayabilirsiniz.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
});

// Her istekte localStorage'daki token'ı Authorization başlığına ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('taskflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 gelirse token'ı temizle ve login'e yönlendir
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('taskflow_token');
      localStorage.removeItem('taskflow_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
