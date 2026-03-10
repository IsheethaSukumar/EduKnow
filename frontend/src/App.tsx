import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import ContentPage from './pages/ContentPage';
import UploadPage from './pages/UploadPage';
import ChatbotPage from './pages/ChatbotPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import StudyTimerPage from './pages/StudyTimerPage';
import NotesPage from './pages/NotesPage';
import CollectionsPage from './pages/CollectionsPage';
import PersonalAnalyticsPage from './pages/PersonalAnalyticsPage';
import BookmarksPage from './pages/BookmarksPage';
import AnalyzerPage from './pages/AnalyzerPage';
import FlashcardsPage from './pages/FlashcardsPage';
import StudyRoomsPage from './pages/StudyRoomsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <div className="loading-screen">Loading...</div>;
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>(
        () => (localStorage.getItem('edukno_theme') as 'light' | 'dark') || 'dark'
    );

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('edukno_theme', next);
        document.documentElement.setAttribute('data-theme', next);
    };

    // Set initial theme
    document.documentElement.setAttribute('data-theme', theme);

    return (
        <div className="app-layout">
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                theme={theme}
                onThemeToggle={toggleTheme}
            />
            <main className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/content/:id" element={<ContentPage />} />
                    <Route path="/upload" element={<UploadPage />} />
                    <Route path="/chatbot" element={<ChatbotPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/my-analytics" element={<PersonalAnalyticsPage />} />
                    <Route path="/analyzer" element={<AnalyzerPage />} />
                    <Route path="/flashcards" element={<FlashcardsPage />} />
                    <Route path="/rooms" element={<StudyRoomsPage />} />
                    <Route path="/leaderboard" element={<LeaderboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/study-timer" element={<StudyTimerPage />} />
                    <Route path="/notes" element={<NotesPage />} />
                    <Route path="/collections" element={<CollectionsPage />} />
                    <Route path="/bookmarks" element={<BookmarksPage />} />
                </Routes>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                        path="/*"
                        element={
                            <ProtectedRoute>
                                <AppLayout />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
