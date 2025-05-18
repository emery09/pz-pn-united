const fs = require('fs');
const getSheetData = require('./getSheetData.js');

// Test function for aircraft ID 3401
async function testAircraft3401() {
  const logFile = fs.createWriteStream('test_results.log', {flags: 'w'});
  const log = (msg) => {
    logFile.write(msg + '\n');
    console.log(msg);
  };

  log("====== Testing aircraft ID 3401 ======");
  
  try {
    // Google Sheet ID
    const SHEET_ID = '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';
    
    log("1. Calling getSheetData with aircraft ID 3401...");
    const result = await getSheetData(SHEET_ID, '3401');
    
    log("2. Results summary:");
    log(`   - Found ${result.results ? result.results.length : 0} matching aircraft`);
    log(`   - Timestamp: ${result.timestamp}`);
    log(`   - Registration: ${result.reg || 'None found'}`);
    
    if (result.results && result.results.length > 0) {
      log("\n3. Aircraft details:");
      result.results.forEach((aircraft, index) => {
        log(`\n   Aircraft #${index + 1}:`);
        log(`   - Aircraft ID: ${aircraft.aircraftId}`);
        log(`   - Registration: ${aircraft.reg}`);
        log(`   - Fleet type: ${aircraft.fleetType}`);
        log(`   - Has next interior: ${aircraft.hasNextInterior ? 'Yes' : 'No'}`);
        log(`   - Next status: ${aircraft.nextStatus}`);
      });
      log("\n✅ SUCCESS: Aircraft 3401 was found!");
    } else {
      log("\n❌ ERROR: No matches found for aircraft ID 3401");
    }
  } catch (error) {
    log("\n❌ ERROR during test: " + error.message);
  }
  
  logFile.end();
}

// Run the test
testAircraft3401();
