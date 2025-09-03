// Quick API test script
console.log('🧪 Testing Allocraft API Endpoints...');

const BASE_URL = 'http://127.0.0.1:8001';

async function testEndpoints() {
  console.log('\n📊 Testing /portfolio/positions/stocks...');
  try {
    const response = await fetch(`${BASE_URL}/portfolio/positions/stocks`);
    const data = await response.json();
    console.log('✅ Stocks Response Structure:', {
      hasValueProperty: !!data.value,
      hasCountProperty: !!data.Count,
      isArray: Array.isArray(data),
      arrayLength: Array.isArray(data) ? data.length : 'N/A',
      valueArrayLength: data.value ? data.value.length : 'N/A'
    });
    
    if (data.value && data.value.length > 0) {
      console.log('📝 First stock position:', data.value[0]);
    }
  } catch (error) {
    console.error('❌ Stocks endpoint failed:', error);
  }

  console.log('\n📊 Testing /portfolio/positions/options...');
  try {
    const response = await fetch(`${BASE_URL}/portfolio/positions/options`);
    const data = await response.json();
    console.log('✅ Options Response Structure:', {
      hasValueProperty: !!data.value,
      hasCountProperty: !!data.Count,
      isArray: Array.isArray(data),
      arrayLength: Array.isArray(data) ? data.length : 'N/A',
      valueArrayLength: data.value ? data.value.length : 'N/A'
    });
    
    if (data.value && data.value.length > 0) {
      console.log('📝 First option position:', data.value[0]);
    }
  } catch (error) {
    console.error('❌ Options endpoint failed:', error);
  }

  console.log('\n📊 Testing /portfolio/positions...');
  try {
    const response = await fetch(`${BASE_URL}/portfolio/positions`);
    const data = await response.json();
    console.log('✅ All Positions Response Structure:', {
      hasTotalPositions: !!data.total_positions,
      hasPositionsArray: !!data.positions,
      totalCount: data.total_positions,
      positionsArrayLength: data.positions ? data.positions.length : 'N/A'
    });
  } catch (error) {
    console.error('❌ All positions endpoint failed:', error);
  }
}

testEndpoints();
