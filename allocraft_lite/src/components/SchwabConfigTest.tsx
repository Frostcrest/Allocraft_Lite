/**
 * Schwab API Configuration Test
 * Run this to verify your environment variables are loaded correctly
 */

import { validateSchwabCredentials } from '@/utils/schwabValidator';

// Test environment variable loading
// console.log('🔧 Schwab API Configuration Check:');
console.log('=====================================');

const { config, isReady, issues } = validateSchwabCredentials();

console.log('Client ID:', config.clientId ? '✅ Set' : '❌ Missing');
console.log('Client Secret:', config.clientSecret ? '✅ Set' : '❌ Missing');
console.log('Redirect URI:', config.redirectUri || '❌ Missing');

if (!isReady) {
  console.log('\n🚨 Configuration Issues:');
  issues.forEach(issue => console.log(`   ${issue}`));
  console.log('\n📝 See ADD_CREDENTIALS_GUIDE.md for setup instructions.');
}

// Test Schwab API service initialization
async function testSchwabApiService() {
  try {
    const { schwabApi } = await import('@/services/schwabApi');
    // console.log('\n📡 Schwab API Service:', schwabApi ? '✅ Loaded' : '❌ Failed to load');
  } catch (error) {
    // console.log('\n📡 Schwab API Service: ❌ Error loading service');
    console.error('Error:', error);
  }
}

// Call the async function
testSchwabApiService();

export default function SchwabConfigTest() {
  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold text-lg mb-2">🔑 Schwab API Configuration</h3>
      <p className="text-sm text-gray-600 mb-4">
        Verify your Schwab API credentials are configured correctly.
        Check the browser console (F12) for detailed validation.
      </p>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={config.clientId && !config.clientId.includes('your_') ? 'text-green-600' : 'text-red-600'}>
            {config.clientId && !config.clientId.includes('your_') ? '✅' : '❌'}
          </span>
          <span className="text-sm">
            <strong>Client ID:</strong> {config.clientId && !config.clientId.includes('your_') ? 'Configured' : 'Missing or placeholder'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={config.clientSecret && !config.clientSecret.includes('your_') ? 'text-green-600' : 'text-red-600'}>
            {config.clientSecret && !config.clientSecret.includes('your_') ? '✅' : '❌'}
          </span>
          <span className="text-sm">
            <strong>Client Secret:</strong> {config.clientSecret && !config.clientSecret.includes('your_') ? 'Configured' : 'Missing or placeholder'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={config.redirectUri?.includes('localhost:5173') ? 'text-green-600' : 'text-red-600'}>
            {config.redirectUri?.includes('localhost:5173') ? '✅' : '❌'}
          </span>
          <span className="text-sm">
            <strong>Redirect URI:</strong> {config.redirectUri || 'Missing'}
          </span>
        </div>

        {isReady && (
          <div className="mt-4 p-3 bg-green-100 border border-green-400 rounded">
            <p className="text-green-800 text-sm">
              <strong>🎉 Ready!</strong> Your Schwab API credentials are configured.
              You can now test the OAuth flow by clicking "Connect to Schwab" below.
            </p>
          </div>
        )}

        {!isReady && (
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-red-100 border border-red-400 rounded">
              <p className="text-red-800 text-sm font-medium mb-2">
                <strong>⚠️ Configuration Issues:</strong>
              </p>
              <ul className="text-red-700 text-sm space-y-1 ml-4">
                {issues.map((issue, index) => (
                  <li key={index}>• {issue.replace(/❌|⚠️/, '').trim()}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-blue-100 border border-blue-400 rounded">
              <p className="text-blue-800 text-sm">
                <strong>📝 Next Steps:</strong>
              </p>
              <ol className="text-blue-700 text-sm mt-2 ml-4 space-y-1">
                <li>1. Get your credentials from <a href="https://developer.schwab.com/" className="underline" target="_blank" rel="noopener noreferrer">https://developer.schwab.com/</a></li>
                <li>2. Update <code>.env.local</code> with your App Key and Secret</li>
                <li>3. Restart the development server</li>
                <li>4. See <code>ADD_CREDENTIALS_GUIDE.md</code> for detailed instructions</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
