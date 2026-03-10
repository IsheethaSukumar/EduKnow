import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap } from 'lucide-react';

const ROLES = [
    { value: 'student', label: 'Student', emoji: '🎓' },
    { value: 'faculty', label: 'Faculty', emoji: '👨‍🏫' },
    { value: 'staff', label: 'Staff', emoji: '👤' },
    { value: 'alumni', label: 'Alumni', emoji: '🎯' },
    { value: 'parent', label: 'Parent', emoji: '👪' },
];

const DEPARTMENTS = [
    'Computer Science', 'Mathematics', 'Physics', 'Biology', 'Chemistry',
    'Engineering', 'English', 'History', 'Business', 'Art', 'General'
];

export default function LoginPage() {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        username: '',
        password: '',
        email: '',
        full_name: '',
        role: 'student',
        department: 'Computer Science',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isRegister) {
                await register(form);
            } else {
                await login(form.username, form.password);
            }
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async (username: string) => {
        setError('');
        setLoading(true);
        try {
            await login(username, 'password123');
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Demo login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card animate-scale-in">
                <div className="logo">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #818cf8, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <GraduationCap size={28} color="white" />
                        </div>
                    </div>
                    <h1>EduKno</h1>
                    <p>Unified Knowledge Management Portal</p>
                </div>

                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Username</label>
                        <input
                            className="input"
                            type="text"
                            placeholder="Enter username"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            required
                        />
                    </div>

                    {isRegister && (
                        <>
                            <div className="input-group">
                                <label>Full Name</label>
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="Your full name"
                                    value={form.full_name}
                                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Email</label>
                                <input
                                    className="input"
                                    type="email"
                                    placeholder="email@edukno.edu"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Role</label>
                                <select
                                    className="input"
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                >
                                    {ROLES.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.emoji} {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Department</label>
                                <select
                                    className="input"
                                    value={form.department}
                                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                                >
                                    {DEPARTMENTS.map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    <div className="input-group">
                        <label>Password</label>
                        <input
                            className="input"
                            type="password"
                            placeholder={isRegister ? 'Create password' : 'Enter password'}
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    </div>

                    <button className="btn btn-primary" type="submit" disabled={loading}>
                        {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className="toggle-text">
                    {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                    <button onClick={() => { setIsRegister(!isRegister); setError(''); }}>
                        {isRegister ? 'Sign In' : 'Register'}
                    </button>
                </div>

                {!isRegister && (
                    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(99, 102, 241, 0.15)' }}>
                        <p style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center', marginBottom: 12 }}>
                            Quick Demo Login
                        </p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {[
                                { user: 'student1', label: '🎓 Student', color: '#6366f1' },
                                { user: 'faculty1', label: '👨‍🏫 Faculty', color: '#0ea5e9' },
                                { user: 'admin1', label: '🔑 Admin', color: '#f43f5e' },
                            ].map((demo) => (
                                <button
                                    key={demo.user}
                                    onClick={() => handleDemoLogin(demo.user)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 20,
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        color: '#a5b4fc',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {demo.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
