/**
 * Wheel Detection Integration Test Utilities
 * Tests the integration between position data and wheel detection
 */

/**
 * Test cases for wheel detection with different position scenarios
 */
export const createTestPositionScenarios = () => {
  return {
    // Scenario 1: Perfect covered call setup
    coveredCallReady: {
      allPositions: [
        {
          symbol: "AAPL",
          instrument_type: "stock",
          quantity: 100,
          market_value: 17000,
          average_price: 170,
          current_price: 170
        }
      ],
      stockPositions: [
        {
          ticker: "AAPL",
          shares_owned: 100,
          current_price: 170,
          market_value: 17000,
          cost_basis: 170
        }
      ],
      optionPositions: [],
      expectedStrategies: ["covered_call"]
    },

    // Scenario 2: Cash secured put opportunity
    cashSecuredPutReady: {
      allPositions: [
        {
          symbol: "CASH",
          instrument_type: "cash",
          quantity: 25000,
          market_value: 25000
        }
      ],
      stockPositions: [],
      optionPositions: [],
      cashBalance: 25000,
      expectedStrategies: ["cash_secured_put"]
    },

    // Scenario 3: Full wheel in progress
    fullWheelActive: {
      allPositions: [
        {
          symbol: "TSLA",
          instrument_type: "stock",
          quantity: 100,
          market_value: 24000,
          average_price: 240,
          current_price: 240
        },
        {
          symbol: "TSLA",
          instrument_type: "option",
          quantity: -1,
          option_type: "call",
          strike_price: 250,
          expiration_date: "2025-09-19"
        }
      ],
      stockPositions: [
        {
          ticker: "TSLA",
          shares_owned: 100,
          current_price: 240,
          market_value: 24000,
          cost_basis: 240
        }
      ],
      optionPositions: [
        {
          ticker: "TSLA",
          option_type: "call",
          strike_price: 250,
          expiration_date: "2025-09-19",
          contracts: 1,
          side: "short"
        }
      ],
      expectedStrategies: ["full_wheel", "covered_call"]
    },

    // Scenario 4: No wheel opportunities
    noOpportunities: {
      allPositions: [
        {
          symbol: "AAPL",
          instrument_type: "stock",
          quantity: 50, // Less than 100 shares
          market_value: 8500,
          average_price: 170,
          current_price: 170
        }
      ],
      stockPositions: [
        {
          ticker: "AAPL",
          shares_owned: 50,
          current_price: 170,
          market_value: 8500,
          cost_basis: 170
        }
      ],
      optionPositions: [],
      expectedStrategies: []
    },

    // Scenario 5: Mixed portfolio with multiple opportunities
    mixedPortfolio: {
      allPositions: [
        {
          symbol: "AAPL",
          instrument_type: "stock",
          quantity: 200,
          market_value: 34000,
          average_price: 170,
          current_price: 170
        },
        {
          symbol: "MSFT",
          instrument_type: "stock",
          quantity: 100,
          market_value: 41000,
          average_price: 410,
          current_price: 410
        },
        {
          symbol: "CASH",
          instrument_type: "cash",
          quantity: 15000,
          market_value: 15000
        }
      ],
      stockPositions: [
        {
          ticker: "AAPL",
          shares_owned: 200,
          current_price: 170,
          market_value: 34000,
          cost_basis: 170
        },
        {
          ticker: "MSFT",
          shares_owned: 100,
          current_price: 410,
          market_value: 41000,
          cost_basis: 410
        }
      ],
      optionPositions: [],
      cashBalance: 15000,
      expectedStrategies: ["covered_call", "cash_secured_put"]
    }
  };
};

/**
 * Test detection accuracy with known scenarios
 */
export const testWheelDetectionAccuracy = async (detectionFunction, scenarios = null) => {
  const testScenarios = scenarios || createTestPositionScenarios();
  const results = {};

  console.log('🧪 Starting wheel detection accuracy tests...');

  for (const [scenarioName, scenario] of Object.entries(testScenarios)) {
    console.log(`\n🎯 Testing scenario: ${scenarioName}`);
    
    try {
      const detectionResult = await detectionFunction({
        positions: scenario.allPositions,
        stocks: scenario.stockPositions,
        options: scenario.optionPositions,
        cashBalance: scenario.cashBalance || 0,
        include_confidence_details: true,
        min_confidence_score: 0
      });

      const detectedStrategies = detectionResult.opportunities?.map(op => op.strategy) || [];
      const expectedStrategies = scenario.expectedStrategies;

      const accuracy = {
        scenario: scenarioName,
        expected: expectedStrategies,
        detected: detectedStrategies,
        correct: expectedStrategies.every(strategy => detectedStrategies.includes(strategy)),
        extraDetections: detectedStrategies.filter(strategy => !expectedStrategies.includes(strategy)),
        missedDetections: expectedStrategies.filter(strategy => !detectedStrategies.includes(strategy))
      };

      results[scenarioName] = accuracy;
      
      console.log(`✅ Expected: [${expectedStrategies.join(', ')}]`);
      console.log(`🎯 Detected: [${detectedStrategies.join(', ')}]`);
      console.log(`${accuracy.correct ? '✅' : '❌'} Test ${accuracy.correct ? 'PASSED' : 'FAILED'}`);
      
      if (accuracy.extraDetections.length > 0) {
        console.log(`⚠️ Extra detections: [${accuracy.extraDetections.join(', ')}]`);
      }
      if (accuracy.missedDetections.length > 0) {
        console.log(`❌ Missed detections: [${accuracy.missedDetections.join(', ')}]`);
      }

    } catch (error) {
      console.error(`❌ Test scenario ${scenarioName} failed:`, error);
      results[scenarioName] = {
        scenario: scenarioName,
        error: error.message,
        correct: false
      };
    }
  }

  // Summary
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r.correct).length;
  const accuracy = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`\n📊 Detection Accuracy Summary:`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Accuracy: ${accuracy}%`);

  return {
    results,
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      accuracy: parseFloat(accuracy)
    }
  };
};

/**
 * Test edge cases and error scenarios
 */
export const testEdgeCases = async (detectionFunction) => {
  const edgeCases = {
    emptyPositions: {
      positions: [],
      stocks: [],
      options: []
    },
    invalidPositions: {
      positions: [{ invalid: "data" }],
      stocks: [null],
      options: [undefined]
    },
    malformedData: {
      positions: "not an array",
      stocks: { invalid: "structure" },
      options: null
    }
  };

  console.log('🧪 Testing edge cases and error handling...');

  for (const [caseName, caseData] of Object.entries(edgeCases)) {
    console.log(`\n🎯 Testing edge case: ${caseName}`);
    
    try {
      const result = await detectionFunction(caseData);
      console.log(`✅ Edge case handled gracefully:`, result);
    } catch (error) {
      console.log(`⚠️ Edge case threw error (expected):`, error.message);
    }
  }
};
