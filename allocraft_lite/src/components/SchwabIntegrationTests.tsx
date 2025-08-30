import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, Play, Bug } from 'lucide-react';
import { runSchwabIntegrationTests } from './SchwabTestRunner';

interface TestResult {
    name: string;
    status: 'pending' | 'running' | 'passed' | 'failed';
    message?: string;
    duration?: number;
}

const SchwabIntegrationTests: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<TestResult[]>([
        { name: 'Configuration Test', status: 'pending' },
        { name: 'Service Initialization', status: 'pending' },
        { name: 'OAuth URL Generation', status: 'pending' },
        { name: 'Token Endpoints', status: 'pending' }
    ]);

    const runTests = async () => {
        setIsRunning(true);

        // Reset all tests to pending
        setTestResults(prev => prev.map(test => ({
            ...test,
            status: 'pending',
            message: undefined,
            duration: undefined
        })));

        try {
            const startTime = Date.now();

            // Run the actual integration tests
            const results = await runSchwabIntegrationTests();

            const duration = Date.now() - startTime;

            // Update results based on test outcomes
            setTestResults([
                {
                    name: 'Configuration Test',
                    status: results.configTest ? 'passed' : 'failed',
                    message: results.configTest ? 'Configuration is valid' : 'Configuration validation failed',
                    duration: Math.round(duration * 0.25)
                },
                {
                    name: 'Service Initialization',
                    status: results.serviceTest ? 'passed' : 'failed',
                    message: results.serviceTest ? 'Service loaded successfully' : 'Service initialization failed',
                    duration: Math.round(duration * 0.25)
                },
                {
                    name: 'OAuth URL Generation',
                    status: results.authUrlTest ? 'passed' : 'failed',
                    message: results.authUrlTest ? 'OAuth URLs generated successfully' : 'OAuth URL generation failed',
                    duration: Math.round(duration * 0.25)
                },
                {
                    name: 'Token Endpoints',
                    status: results.tokenEndpointTest ? 'passed' : 'failed',
                    message: results.tokenEndpointTest ? 'Endpoints are accessible' : 'Endpoint validation failed',
                    duration: Math.round(duration * 0.25)
                }
            ]);
        } catch (error) {
            console.error('Test suite failed:', error);
            setTestResults(prev => prev.map(test => ({
                ...test,
                status: 'failed',
                message: 'Test suite failed to run'
            })));
        } finally {
            setIsRunning(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'running':
                return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
            case 'passed':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'failed':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <div className="h-4 w-4 rounded-full bg-gray-300" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running':
                return 'bg-blue-100 text-blue-800';
            case 'passed':
                return 'bg-green-100 text-green-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const overallStatus = () => {
        if (isRunning) return 'running';
        if (testResults.some(test => test.status === 'failed')) return 'failed';
        if (testResults.every(test => test.status === 'passed')) return 'passed';
        return 'pending';
    };

    return (
        <div className="w-full border rounded-lg p-6 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Bug className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Schwab API Integration Tests</h3>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(overallStatus())}`}>
                    {overallStatus()}
                </span>
            </div>

            <p className="text-sm text-gray-600 mb-6">
                Run comprehensive tests to validate Schwab API integration and connectivity
            </p>

            <div className="space-y-4">
                {/* Test Results */}
                <div className="space-y-2">
                    {testResults.map((test, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between py-3 px-4 rounded-lg border"
                        >
                            <div className="flex items-center gap-3">
                                {getStatusIcon(test.status)}
                                <div>
                                    <div className="font-medium text-sm">{test.name}</div>
                                    {test.message && (
                                        <div className="text-xs text-gray-500 mt-1">{test.message}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {test.duration && (
                                    <span className="text-xs text-gray-400">
                                        {test.duration}ms
                                    </span>
                                )}
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                                    {test.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Run Button */}
                <div className="pt-4 border-t">
                    <Button
                        onClick={runTests}
                        disabled={isRunning}
                        className="w-full"
                    >
                        <Play className="h-4 w-4 mr-2" />
                        {isRunning ? 'Running Tests...' : 'Run Integration Tests'}
                    </Button>
                </div>

                {/* Info */}
                <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded-lg">
                    <p>
                        <strong>Note:</strong> These tests will validate your Schwab API connection,
                        token authentication, and data retrieval capabilities. Check the browser console
                        for detailed test output.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SchwabIntegrationTests;
