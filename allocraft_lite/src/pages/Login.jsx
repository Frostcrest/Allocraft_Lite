import { useState } from 'react';
import { fetchFromAPI } from '@/api/fastapiClient';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('admin123');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    async function onSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            const form = new URLSearchParams();
            form.append('username', username);
            form.append('password', password);
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: form,
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            sessionStorage.setItem('allocraft_token', data.access_token);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Login failed');
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <form onSubmit={onSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm space-y-4">
                <h1 className="text-2xl font-bold">Login</h1>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <div>
                    <label className="block text-sm mb-1">Username</label>
                    <input className="w-full border rounded px-3 py-2" value={username} onChange={e => setUsername(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm mb-1">Password</label>
                    <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <button className="w-full bg-slate-900 text-white rounded py-2">Sign in</button>
                <div className="text-sm text-slate-600">No account? <Link className="text-slate-900 underline" to="/signup">Sign up</Link></div>
            </form>
        </div>
    );
}
