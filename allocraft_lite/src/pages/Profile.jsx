import { useEffect, useState } from 'react';
import { getMe, logout } from '@/api/fastapiClient';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    useEffect(() => {
        getMe()
            .then(setUser)
            .catch((e) => setError(String(e)));
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">My Profile</h1>
            {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
            {!user ? (
                <div className="text-slate-600">Loading...</div>
            ) : (
                <div className="space-y-2">
                    <div><span className="text-slate-500">Username:</span> {user.username}</div>
                    <div><span className="text-slate-500">Email:</span> {user.email}</div>
                    <div><span className="text-slate-500">Roles:</span> {user.roles}</div>
                    <button onClick={logout} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded">Logout</button>
                </div>
            )}
        </div>
    );
}
