const getSheetData = require('./getSheetData.js');

// Test function for aircraft ID 3401
async function testAircraft3401() {
  console.log("====== Testing aircraft ID 3401 ======");
  
  try {
    // Google Sheet ID
    const SHEET_ID = '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';
    
    console.log("1. Calling getSheetData with aircraft ID 3401...");
    const result = await getSheetData(SHEET_ID, '3401');
    
    console.log("2. Results summary:");
    console.log(`   - Found ${result.results ? result.results.length : 0} matching aircraft`);
    console.log(`   - Timestamp: ${result.timestamp}`);
    console.log(`   - Registration: ${result.reg || 'None found'}`);
    
    if (result.results && result.results.length > 0) {
      console.log("\n3. Aircraft details:");
      result.results.forEach((aircraft, index) => {
        console.log(`\n   Aircraft #${index + 1}:`);
        console.log(`   - Aircraft ID: ${aircraft.aircraftId}`);
        console.log(`   - Registration: ${aircraft.reg}`);
        console.log(`   - Fleet type: ${aircraft.fleetType}`);
        console.log(`   - Has next interior: ${aircraft.hasNextInterior ? 'Yes' : 'No'}`);
        console.log(`   - Next status: ${aircraft.nextStatus}`);
      });
      console.log("\n✅ SUCCESS: Aircraft 3401 was found!");
    } else {
      console.log("\n❌ ERROR: No matches found for aircraft ID 3401");
    }
  } catch (error) {
    console.error("\n❌ ERROR during test:", error.message);
  }
}

// Run the test
testAircraft3401();
