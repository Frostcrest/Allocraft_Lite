import { useState } from 'react';
import { useSignup } from '@/api/enhancedClient';
import { Link, useNavigate } from 'react-router-dom';

export default function Signup() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const signupMutation = useSignup();

    async function onSubmit(e) {
        e.preventDefault();
        signupMutation.mutate(
            { username, email, password },
            {
                onSuccess: () => {
                    navigate('/');
                },
                // Error handling is managed by the hook
            }
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <form onSubmit={onSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm space-y-4">
                <h1 className="text-2xl font-bold">Sign up</h1>
                {signupMutation.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-600 text-sm">
                            {signupMutation.error.message || 'Signup failed'}
                        </p>
                    </div>
                )}
                <div>
                    <label className="block text-sm mb-1">Username</label>
                    <input
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        disabled={signupMutation.isLoading}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm mb-1">Email</label>
                    <input
                        type="email"
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={signupMutation.isLoading}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm mb-1">Password</label>
                    <input
                        type="password"
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={signupMutation.isLoading}
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={signupMutation.isLoading}
                    className="w-full bg-slate-900 text-white rounded py-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {signupMutation.isLoading ? 'Creating account...' : 'Create account'}
                </button>
                <div className="text-sm text-slate-600">
                    Have an account? <Link className="text-slate-900 underline hover:text-slate-700" to="/login">Sign in</Link>
                </div>
            </form>
        </div>
    );
}
