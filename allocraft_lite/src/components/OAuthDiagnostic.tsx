/**
 * Schwab OAuth Diagnostic Tool
 * Helps identify OAuth configuration issues
 */

export function diagnoseOAuthIssue() {
  console.log('🔍 SCHWAB OAUTH DIAGNOSTIC');
  console.log('=========================');
  
  const config = {
    clientId: 'z39NyhcZwoSlmpZNYstf38Fidd0V0HeTWGMfD9AhWGUj0uOG',
    clientSecret: 'Ls1QL7VER1GENslDeoN8Wd8GhkEw5qxboS2OEIsZ6ANtCqxTGBW2ZY6KEcVLCTUU',
    redirectUri: 'http://localhost:5173/auth/callback'
  };

  console.log('\n📋 Current Configuration:');
  console.log('Client ID:', config.clientId);
  console.log('Client Secret Length:', config.clientSecret.length, 'characters');
  console.log('Redirect URI:', config.redirectUri);
  
  console.log('\n🔗 OAuth URL Being Generated:');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'AccountsAndTrading readonly'
  });
  
  const authUrl = `https://api.schwabapi.com/v1/oauth/authorize?${params.toString()}`;
  console.log(authUrl);
  
  console.log('\n✅ Checklist for Schwab Developer Portal:');
  console.log('1. App Status: Must be "Production" (not Sandbox)');
  console.log('2. Redirect URI: Must be EXACTLY "http://localhost:5173/auth/callback"');
  console.log('3. App Permissions: Must include "Accounts and Trading"');
  console.log('4. Client ID matches:', config.clientId);
  
  console.log('\n🚨 Common Issues:');
  console.log('• Redirect URI mismatch (most common)');
  console.log('• App still in sandbox mode');
  console.log('• Missing required permissions');
  console.log('• Client ID/Secret incorrect');
  
  return {
    authUrl,
    config,
    recommendations: [
      'Verify redirect URI in Schwab portal matches exactly',
      'Ensure app is approved for production',
      'Check that client credentials are correct',
      'Try creating a new app if issues persist'
    ]
  };
}

export default function OAuthDiagnostic() {
  const handleDiagnose = () => {
    const result = diagnoseOAuthIssue();
    alert(`OAuth URL Generated:\n\n${result.authUrl}\n\nCheck console (F12) for detailed diagnostic info.`);
  };

  return (
    <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
      <h3 className="font-bold text-lg mb-2 text-red-800">🔍 OAuth Diagnostic</h3>
      <p className="text-red-700 text-sm mb-3">
        Use this to troubleshoot OAuth connection issues.
      </p>
      
      <button 
        onClick={handleDiagnose}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm mr-2"
      >
        Run OAuth Diagnostic
      </button>
      
      <button 
        onClick={() => window.open('https://developer.schwab.com/', '_blank')}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
      >
        Open Schwab Developer Portal
      </button>
      
      <div className="mt-3 p-3 bg-yellow-100 border border-yellow-400 rounded">
        <p className="text-yellow-800 text-sm">
          <strong>Most Common Fix:</strong> In your Schwab app settings, verify the Redirect URI is exactly:
          <code className="bg-white px-1 rounded">http://localhost:5173/auth/callback</code>
        </p>
      </div>
    </div>
  );
}
