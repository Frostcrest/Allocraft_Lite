import { useState } from 'react';
import { fetchFromAPI } from '@/api/fastapiClient';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '@/api/fastapiClient';

export default function Signup() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    async function onSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            if (!res.ok) throw new Error(await res.text());
            // Auto-login after signup
            const form = new URLSearchParams();
            form.append('username', username);
            form.append('password', password);
            const loginRes = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: form,
            });
            if (!loginRes.ok) throw new Error(await loginRes.text());
            const data = await loginRes.json();
            sessionStorage.setItem('allocraft_token', data.access_token);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Signup failed');
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <form onSubmit={onSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm space-y-4">
                <h1 className="text-2xl font-bold">Sign up</h1>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <div>
                    <label className="block text-sm mb-1">Username</label>
                    <input className="w-full border rounded px-3 py-2" value={username} onChange={e => setUsername(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm mb-1">Email</label>
                    <input className="w-full border rounded px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm mb-1">Password</label>
                    <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <button className="w-full bg-slate-900 text-white rounded py-2">Create account</button>
                <div className="text-sm text-slate-600">Have an account? <Link className="text-slate-900 underline" to="/login">Sign in</Link></div>
            </form>
        </div>
    );
}
