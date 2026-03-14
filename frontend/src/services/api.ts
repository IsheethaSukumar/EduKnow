import axios from 'axios';

export let API_BASE = import.meta.env.VITE_API_URL ||
    (window.location.hostname === 'localhost' ? 'http://localhost:8000/api' : '/api');

if (API_BASE.startsWith('http') && !API_BASE.endsWith('/api')) {
    API_BASE = API_BASE.endsWith('/') ? `${API_BASE}api` : `${API_BASE}/api`;
}

export const getWSUrl = (path: string) => {
    let base = API_BASE;
    if (base.startsWith('/api')) {
        base = `${window.location.protocol === 'https:' ? 'https:' : 'http:'}//${window.location.host}${base}`;
    }
    const wsBase = base.replace('http:', 'ws:').replace('https:', 'wss:');
    return `${wsBase}${path}`;
};

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// JWT interceptor
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('edukno_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('edukno_token');
            localStorage.removeItem('edukno_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ── Auth ──
export const authAPI = {
    register: (data: any) => api.post('/auth/register', data),
    login: (data: any) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
    updateMe: (data: any) => api.put('/auth/me', data),
    getPermissions: () => api.get('/auth/permissions'),
    listUsers: () => api.get('/auth/users'),
    updateUserRole: (userId: string, role: string) => api.put(`/auth/users/${userId}/role?role=${role}`),
    deactivateUser: (userId: string) => api.delete(`/auth/users/${userId}`),
};

// ── Content ──
export const contentAPI = {
    list: (params?: any) => api.get('/content/', { params }),
    get: (id: string) => api.get(`/content/${id}`),
    create: (data: any) => api.post('/content/', data),
    update: (id: string, data: any) => api.put(`/content/${id}`, data),
    delete: (id: string) => api.delete(`/content/${id}`),
    upvote: (id: string) => api.post(`/content/${id}/upvote`),
    recordView: (id: string) => api.post(`/content/${id}/view`),
    categories: () => api.get('/content/categories'),
    download: (id: string) => api.post(`/content/${id}/download`),
    bookmark: (id: string) => api.post(`/content/${id}/bookmark`),
    unbookmark: (id: string) => api.delete(`/content/${id}/bookmark`),
    bookmarkStatus: (id: string) => api.get(`/content/${id}/bookmark/status`),
    getBookmarks: () => api.get('/content/bookmarks'),
    checkPlagiarism: (data: { text: string }) => api.post('/interaction/plagiarism-check', data),
    rate: (id: string, rating: number, comment?: string) => api.post(`/interaction/content/${id}/rate`, { rating, comment }),
    getRatings: (id: string) => api.get(`/interaction/content/${id}/ratings`),
};

// ── Search ──
export const searchAPI = {
    search: (q: string, params?: any) => api.get('/search/', { params: { q, ...params } }),
    autocomplete: (q: string) => api.get('/search/autocomplete', { params: { q } }),
};

// ── Recommendations ──
export const recommendAPI = {
    getPersonalized: (limit?: number) => api.get('/recommendations/', { params: { limit } }),
    getTrending: (limit?: number) => api.get('/recommendations/trending', { params: { limit } }),
};

// ── Chatbot ──
export const chatbotAPI = {
    chat: (message: string, context?: any, history?: any[]) =>
        api.post('/chatbot/chat', { message, context, history }),
    suggestions: () => api.get('/chatbot/suggestions'),
    getHistory: () => api.get('/chatbot/history'),
    getHistoryItem: (id: string) => api.get(`/chatbot/history/${id}`),
    deleteHistoryItem: (id: string) => api.delete(`/chatbot/history/${id}`),
    transcribe: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/chatbot/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
};

// ── Study Timer ──
export const studyAPI = {
    createSession: (data: any) => api.post('/study/sessions', data),
    listSessions: (days?: number) => api.get('/study/sessions', { params: { days } }),
    getStats: (days?: number) => api.get('/study/stats', { params: { days } }),
};

// ── Notes ──
export const notesAPI = {
    create: (data: any) => api.post('/notes/', data),
    list: (params?: any) => api.get('/notes/', { params }),
    get: (id: string) => api.get(`/notes/${id}`),
    update: (id: string, data: any) => api.put(`/notes/${id}`, data),
    delete: (id: string) => api.delete(`/notes/${id}`),
};

// ── Interaction / Notifications ──
export const interactionAPI = {
    getNotifications: () => api.get('/interaction/notifications'),
    readNotification: (id: string) => api.post(`/interaction/notifications/${id}/read`),
    // Complaints
    getComplaints: () => api.get('/interaction/complaints'),
    createComplaint: (data: any) => api.post('/interaction/complaints', data),
    updateComplaintStatus: (id: string, status: string, admin_response?: string) =>
        api.put(`/interaction/complaints/${id}`, { status, admin_response }),
    // Chat Reports
    reportChatMessage: (data: any) => api.post('/interaction/chat-report', data),
    getChatReports: () => api.get('/interaction/chat-reports'),
    warnChatReport: (id: string) => api.put(`/interaction/chat-reports/${id}/warn`),
};

// ── Collections ──
export const collectionsAPI = {
    create: (data: any) => api.post('/collections/', data),
    list: () => api.get('/collections/'),
    get: (id: string) => api.get(`/collections/${id}`),
    addItem: (id: string, contentId: string) => api.post(`/collections/${id}/items`, { content_id: contentId }),
    removeItem: (id: string, contentId: string) => api.delete(`/collections/${id}/items/${contentId}`),
    delete: (id: string) => api.delete(`/collections/${id}`),
};

// ── Gamification ──
export const gamificationAPI = {
    badges: () => api.get('/gamification/badges'),
    leaderboard: (timeframe?: string, limit?: number) =>
        api.get('/gamification/leaderboard', { params: { timeframe, limit } }),
    stats: () => api.get('/gamification/stats'),
    checkBadges: () => api.post('/gamification/check-badges'),
};

// ── Analytics ──
export const analyticsAPI = {
    personal: () => api.get('/analytics/personal'),
    overview: () => api.get('/analytics/overview'),
    content: () => api.get('/analytics/content'),
    users: () => api.get('/analytics/users'),
    search: () => api.get('/analytics/search'),
    studyTools: () => api.get('/analytics/study-tools'),
};

export const analyzerAPI = {
    analyzeDocument: (formData: FormData) => api.post('/analyze/document', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
    getHistory: () => api.get('/analyze/history'),
    getHistoryItem: (id: string) => api.get(`/analyze/history/${id}`),
    deleteHistoryItem: (id: string) => api.delete(`/analyze/history/${id}`),
};

export const flashcardsAPI = {
    list: (deck?: string) => api.get('/flashcards/', { params: { deck } }),
    getDue: () => api.get('/flashcards/due'),
    create: (data: any) => api.post('/flashcards/', data),
    review: (id: string, quality: number) => api.post(`/flashcards/${id}/review`, { quality }),
    delete: (id: string) => api.delete(`/flashcards/${id}`),
};

// ── Assignments ──
export const assignmentsAPI = {
    list: () => api.get('/assignments/'),
    get: (id: string) => api.get(`/assignments/${id}`),
    create: (data: any) => api.post('/assignments/', data),
    submit: (id: string, data: any) => api.post(`/assignments/${id}/submit`, data),
    getSubmissions: (id: string) => api.get(`/assignments/${id}/submissions`),
    getMySubmission: (id: string) => api.get(`/assignments/${id}/my-submission`),
    grade: (submissionId: string, data: any) => api.post(`/assignments/submissions/${submissionId}/grade`, data),
};

export default api;
