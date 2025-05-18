const getSheetData = require('./getSheetData');

async function testGetSheetData() {
  // Test 1: Check if '39' is recognized as a fleet type
  console.log('\n=== TEST 1: Looking up sheet 39 as fleet type ===');
  try {
    const result1 = await getSheetData('1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo', '39');
    console.log('Fleet type 39 results:', result1.results ? result1.results.length : 0);
    if (result1.results && result1.results.length > 0) {
      console.log('First few aircraft in fleet 39:');
      result1.results.slice(0, 3).forEach(aircraft => {
        console.log(`- ID: ${aircraft.aircraftId}, Reg: ${aircraft.reg}, Next Interior: ${aircraft.hasNextInterior ? 'Yes' : 'No'}`);
      });
    }
  } catch (err) {
    console.error('Error in Test 1:', err.message);
  }
  
  // Test 2: Look up a specific aircraft ID (that might be in fleet 39)
  console.log('\n=== TEST 2: Looking up specific aircraft ID 3901 ===');
  try {
    const result2 = await getSheetData('1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo', '3901');
    console.log('Aircraft 3901 results:', result2.results ? result2.results.length : 0);
    if (result2.results && result2.results.length > 0) {
      result2.results.forEach(aircraft => {
        console.log(`- Found in fleet: ${aircraft.fleetType}, Reg: ${aircraft.reg}, Next Interior: ${aircraft.hasNextInterior ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('Aircraft 3901 not found in any fleet');
    }
  } catch (err) {
    console.error('Error in Test 2:', err.message);
  }
}

testGetSheetData();
