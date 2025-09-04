/**
 * Test Position-Aware Wheel Creation Feature
 * Tests the complete workflow from position parsing to wheel creation
 */

import { PositionParsingService } from './services/PositionParsingService.ts';

// Test data representing a covered call position (like the GOOG example)
const testPosition = {
  symbol: 'GOOG250117C00170000',
  quantity: -1,
  averagePrice: 25.50,
  currentPrice: 22.30,
  marketValue: -2230,
  dayChange: -150,
  dayChangePercent: -6.3,
  positionType: 'option',
  underlyingSymbol: 'GOOG',
  description: 'GOOGLE INC CLASS A CALL 01/17/25 $170'
};

// Test portfolio data
const testPortfolio = {
  positions: [
    testPosition,
    {
      symbol: 'GOOG',
      quantity: 100,
      averagePrice: 165.00,
      currentPrice: 167.25,
      marketValue: 16725,
      dayChange: 225,
      dayChangePercent: 1.4,
      positionType: 'stock',
      description: 'GOOGLE INC CLASS A'
    }
  ]
};

/**
 * Test the position parsing service
 */
function testPositionParsing() {
  console.log('🧪 Testing Position Parsing Service...');
  
  const parser = new PositionParsingService();
  
  // Test option symbol parsing
  const parsed = parser.parseOptionSymbol(testPosition.symbol);
  console.log('Parsed Option Symbol:', parsed);
  
  // Test wheel opportunity identification
  const opportunities = parser.identifyWheelOpportunities(testPortfolio.positions);
  console.log('Identified Opportunities:', opportunities);
  
  // Test specific ticker analysis
  const tickerOpportunities = parser.analyzeTickerForOpportunities('GOOG', testPortfolio.positions);
  console.log('GOOG Opportunities:', tickerOpportunities);
  
  return { parsed, opportunities, tickerOpportunities };
}

/**
 * Simulate the wheel creation workflow
 */
function simulateWheelCreation() {
  console.log('🔄 Simulating Wheel Creation Workflow...');
  
  const results = testPositionParsing();
  
  if (results.opportunities.length > 0) {
    const selectedOpportunity = results.opportunities[0];
    console.log('Selected Opportunity:', selectedOpportunity);
    
    // Simulate form data that would be generated
    const wheelFormData = {
      fromPosition: true,
      selectedOpportunity: selectedOpportunity,
      ticker: selectedOpportunity.ticker,
      strategyType: selectedOpportunity.suggestedStrategy,
      strikePrice: selectedOpportunity.suggestedStrike,
      expirationDate: selectedOpportunity.suggestedExpiration,
      contractCount: 1,
      premium: selectedOpportunity.estimatedPremium || 0
    };
    
    console.log('Generated Wheel Form Data:', wheelFormData);
    return wheelFormData;
  }
  
  return null;
}

/**
 * Run the test suite
 */
function runTests() {
  console.log('🚀 Starting Position-Aware Wheel Creation Tests...');
  
  try {
    const formData = simulateWheelCreation();
    
    if (formData) {
      console.log('✅ Position-aware wheel creation workflow completed successfully!');
      console.log('📊 Final Form Data:', formData);
    } else {
      console.log('❌ No opportunities identified for wheel creation');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for use in browser console or test environments
if (typeof window !== 'undefined') {
  window.testPositionAwareWheel = runTests;
  console.log('🧪 Position-aware wheel tests loaded. Run window.testPositionAwareWheel() to test.');
}

export { runTests, testPositionParsing, simulateWheelCreation };
