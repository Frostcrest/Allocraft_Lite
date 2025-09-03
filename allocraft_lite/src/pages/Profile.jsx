import { useUser, useLogout } from '@/api/enhancedClient';

export default function Profile() {
    const { data: user, isLoading, error } = useUser();
    const logoutMutation = useLogout();

    const handleLogout = () => {
        logoutMutation.mutate();
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">My Profile</h1>
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                    <div className="h-4 bg-slate-200 rounded w-48"></div>
                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">My Profile</h1>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Profile</h2>
                    <p className="text-red-600">{error.message || 'Failed to load profile data'}</p>
                    {error.status === 401 && (
                        <p className="text-red-600 mt-2">Please log in to view your profile.</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">My Profile</h1>
            {user && (
                <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h2 className="text-lg font-semibold text-slate-900">Account Information</h2>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Username:</span>
                            <span className="text-slate-900">{user.username}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Email:</span>
                            <span className="text-slate-900">{user.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Roles:</span>
                            <span className="text-slate-900">{user.roles}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <button
                            onClick={handleLogout}
                            disabled={logoutMutation.isLoading}
                            className="px-6 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {logoutMutation.isLoading ? 'Logging out...' : 'Logout'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
