import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
    id: string;
    username: string;
    email: string;
    full_name: string;
    role: string;
    department: string;
    avatar_url: string;
    interests: string[];
    reputation_score: number;
    streak_days: number;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => void;
    updateUser: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem('edukno_token');
        const savedUser = localStorage.getItem('edukno_user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username: string, password: string) => {
        const res = await authAPI.login({ username, password });
        const { access_token, user: userData } = res.data;
        setToken(access_token);
        setUser(userData);
        localStorage.setItem('edukno_token', access_token);
        localStorage.setItem('edukno_user', JSON.stringify(userData));
    };

    const register = async (data: any) => {
        const res = await authAPI.register(data);
        const { access_token, user: userData } = res.data;
        setToken(access_token);
        setUser(userData);
        localStorage.setItem('edukno_token', access_token);
        localStorage.setItem('edukno_user', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('edukno_token');
        localStorage.removeItem('edukno_user');
    };

    const updateUser = async (data: any) => {
        const res = await authAPI.updateMe(data);
        setUser(res.data);
        localStorage.setItem('edukno_user', JSON.stringify(res.data));
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!token,
                loading,
                login,
                register,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
