import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
      err.friendlyMessage = '❌ Cannot connect to backend.\n\nMake sure Django is running:\n  cd backend\n  python manage.py runserver';
    } else if (err.code === 'ECONNABORTED') {
      err.friendlyMessage = '⏱️ Request timed out. The server is taking too long — try again.';
    } else if (err.response?.data?.message) {
      err.friendlyMessage = err.response.data.message;
    } else if (err.response?.status === 500) {
      err.friendlyMessage = '🔥 Server error 500. Check the Django terminal for the full traceback.';
    } else {
      err.friendlyMessage = err.message;
    }
    return Promise.reject(err);
  }
);

export const fetchBooks = (params = {}) =>
  api.get('/books/', { params }).then(r => r.data);

export const fetchBookDetail = (id) =>
  api.get(`/books/${id}/`).then(r => r.data);

export const fetchRecommendations = (id) =>
  api.get(`/books/${id}/recommend/`).then(r => r.data);

export const fetchGenres = () =>
  api.get('/genres/').then(r => r.data);

export const fetchStats = () =>
  api.get('/stats/').then(r => r.data);

export const uploadBook = (data) =>
  api.post('/books/upload/', data).then(r => r.data);

export const scrapeBooks = (data = {}) =>
  api.post('/scrape/', data).then(r => r.data);

export const indexBooks = (data = {}) =>
  api.post('/books/index/', data).then(r => r.data);

export const deleteBook = (id) =>
  api.delete(`/books/${id}/delete/`).then(r => r.data);

export const queryRAG = (data) =>
  api.post('/query/', data).then(r => r.data);

export const getInsight = (id, type) =>
  api.post(`/books/${id}/insights/`, { type }).then(r => r.data);

export const fetchQueryHistory = () =>
  api.get('/query/history/').then(r => r.data);

export const fetchDebug = () =>
  api.get('/debug/').then(r => r.data);

export default api;
