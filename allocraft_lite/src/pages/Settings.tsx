import React from 'react';
import { Settings as SettingsIcon, Link, TestTube } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SchwabIntegration from '@/components/SchwabIntegration';
import SchwabConfigTest from '@/components/SchwabConfigTest';
import SchwabIntegrationTests from '@/components/SchwabIntegrationTests';
import APISwitcher from '@/components/APISwitcher';

const Settings: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center gap-3">
                    <SettingsIcon className="w-8 h-8 text-slate-700" />
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Settings</h1>
                        <p className="text-slate-600 mt-2">Configure your application preferences and integrations</p>
                    </div>
                </div>

                {/* API Configuration Section */}
                <Card className="border-0 shadow bg-white/80">
                    <CardHeader className="py-4">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <TestTube className="w-5 h-5" />
                            API Configuration
                        </CardTitle>
                        <p className="text-sm text-slate-600">Choose your market data source for real-time pricing</p>
                    </CardHeader>
                    <CardContent>
                        <APISwitcher />
                    </CardContent>
                </Card>

                {/* Schwab API Configuration Section */}
                <Card className="border-0 shadow bg-white/80">
                    <CardHeader className="py-4">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Link className="w-5 h-5" />
                            Schwab API Configuration
                        </CardTitle>
                        <p className="text-sm text-slate-600">
                            Connect and configure your Charles Schwab account integration
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Schwab Account Connection */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">Account Connection</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Link your Charles Schwab account to automatically import your positions and keep your portfolio in sync.
                            </p>
                            <SchwabIntegration onConnectionSuccess={() => {
                                // Trigger a refresh event for the Stocks page
                                window.dispatchEvent(new CustomEvent('schwab-connected'));
                                // Show a success message with link to Stocks page
                                setTimeout(() => {
                                    const toast = document.createElement('div');
                                    toast.className = 'fixed top-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                                    toast.innerHTML = `
                    <div class="flex items-center gap-3">
                      <span>✅ Schwab connected successfully!</span>
                      <a href="/Stocks" class="underline hover:no-underline">View Positions →</a>
                    </div>
                  `;
                                    document.body.appendChild(toast);
                                    setTimeout(() => toast.remove(), 5000);
                                }, 1000);
                            }} />
                        </div>

                        {/* Configuration Validation */}
                        <div className="border-t border-slate-200 pt-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">Configuration Validation</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Verify your Schwab API credentials are configured correctly. Check the browser console (F12) for detailed validation.
                            </p>
                            <SchwabConfigTest />
                        </div>

                        {/* Integration Testing */}
                        <div className="border-t border-slate-200 pt-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">Integration Testing</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Run comprehensive tests to validate Schwab API integration and connectivity. These tests will validate your Schwab API connection, token authentication, and data retrieval capabilities.
                            </p>
                            <SchwabIntegrationTests />
                        </div>
                    </CardContent>
                </Card>

                {/* Additional Settings Placeholder */}
                <Card className="border-0 shadow bg-white/80">
                    <CardHeader className="py-4">
                        <CardTitle className="text-xl">Other Settings</CardTitle>
                        <p className="text-sm text-slate-600">Additional application preferences</p>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8 text-slate-500">
                            <SettingsIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p>More settings coming soon...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Settings;
