import { useState, useEffect } from 'react';
import { useLogin } from '@/api/enhancedClient';
import { clearApiUrlCache } from '@/utils/apiConfig';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('admin123');
    const navigate = useNavigate();
    const loginMutation = useLogin();

    // Force API URL cache clear on component mount
    useEffect(() => {
        console.log('🔄 Login component: Clearing API URL cache...');
        clearApiUrlCache();
    }, []);

    async function onSubmit(e) {
        e.preventDefault();
        loginMutation.mutate(
            { username, password },
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
                <h1 className="text-2xl font-bold">Login</h1>
                {loginMutation.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-600 text-sm">
                            {loginMutation.error.message || 'Login failed'}
                        </p>
                    </div>
                )}
                <div>
                    <label className="block text-sm mb-1">Username</label>
                    <input
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        disabled={loginMutation.isLoading}
                    />
                </div>
                <div>
                    <label className="block text-sm mb-1">Password</label>
                    <input
                        type="password"
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={loginMutation.isLoading}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loginMutation.isLoading}
                    className="w-full bg-slate-900 text-white rounded py-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loginMutation.isLoading ? 'Signing in...' : 'Sign in'}
                </button>
                <div className="text-sm text-slate-600">
                    No account? <Link className="text-slate-900 underline hover:text-slate-700" to="/signup">Sign up</Link>
                </div>
            </form>
        </div>
    );
}
