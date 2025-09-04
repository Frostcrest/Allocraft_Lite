/**
 * Schwab API Credential Validator
 * This script helps validate your API configuration
 */

// Simple logging function to replace console.log
const schwabValidatorLog = (...args: any[]) => {
  // Logging disabled for SchwabValidator
  // console.log('[SchwabValidator]', ...args);
  void args; // Suppress unused parameter warning
};

export function validateSchwabCredentials() {
  const config = {
    clientId: (import.meta as any).env?.VITE_SCHWAB_CLIENT_ID,
    clientSecret: (import.meta as any).env?.VITE_SCHWAB_CLIENT_SECRET,
    redirectUri: (import.meta as any).env?.VITE_SCHWAB_REDIRECT_URI,
  };

  const validation = {
    hasClientId: !!(config.clientId && config.clientId !== 'your_schwab_client_id_here'),
    hasClientSecret: !!(config.clientSecret && config.clientSecret !== 'your_schwab_client_secret_here'),
    hasRedirectUri: !!(config.redirectUri && config.redirectUri.includes('localhost:5173')),
    clientIdFormat: config.clientId?.length >= 10, // Schwab client IDs are typically longer
    secretFormat: config.clientSecret?.length >= 10, // Schwab secrets are typically longer
  };

  const isReady = validation.hasClientId && validation.hasClientSecret && validation.hasRedirectUri;

  return {
    config,
    validation,
    isReady,
    issues: getConfigurationIssues(validation, config)
  };
}

function getConfigurationIssues(validation: any, config: any): string[] {
  const issues: string[] = [];

  if (!validation.hasClientId) {
    issues.push('❌ Client ID is missing or still using placeholder value');
  }

  if (!validation.hasClientSecret) {
    issues.push('❌ Client Secret is missing or still using placeholder value');
  }

  if (!validation.hasRedirectUri) {
    issues.push('❌ Redirect URI is missing or invalid');
  }

  if (validation.hasClientId && !validation.clientIdFormat) {
    issues.push('⚠️ Client ID format looks suspicious (too short)');
  }

  if (validation.hasClientSecret && !validation.secretFormat) {
    issues.push('⚠️ Client Secret format looks suspicious (too short)');
  }

  if (config.clientId?.includes('placeholder') || config.clientId?.includes('your_')) {
    issues.push('❌ Client ID still contains placeholder text');
  }

  if (config.clientSecret?.includes('placeholder') || config.clientSecret?.includes('your_')) {
    issues.push('❌ Client Secret still contains placeholder text');
  }

  return issues;
}

export function testSchwabApiConnection() {
  const { isReady, issues, config } = validateSchwabCredentials();

  schwabValidatorLog('🔍 Schwab API Configuration Check');
  schwabValidatorLog('================================');

  if (isReady) {
    schwabValidatorLog('✅ Configuration looks good!');
    schwabValidatorLog('🚀 Ready to test OAuth flow');
  } else {
    schwabValidatorLog('❌ Configuration issues found:');
    issues.forEach(issue => schwabValidatorLog(`   ${issue}`));
    schwabValidatorLog('\n📝 Next steps:');
    schwabValidatorLog('   1. Update .env.local with your actual Schwab API credentials');
    schwabValidatorLog('   2. Restart the development server');
    schwabValidatorLog('   3. Run this test again');
  }

  schwabValidatorLog('\n🔧 Current Configuration:');
  schwabValidatorLog(`   Client ID: ${config.clientId ? (config.clientId.substring(0, 8) + '...') : 'Not set'}`);
  schwabValidatorLog(`   Client Secret: ${config.clientSecret ? '***SET***' : 'Not set'}`);
  schwabValidatorLog(`   Redirect URI: ${config.redirectUri || 'Not set'}`);

  return { isReady, issues };
}

// Auto-run validation when this module is imported (DISABLED - uncomment to re-enable)
// if (typeof window !== 'undefined') {
//   // Run in browser
//   setTimeout(() => {
//     testSchwabApiConnection();
//   }, 1000);
// }
