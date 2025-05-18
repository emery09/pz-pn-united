const getSheetData = require('./getSheetData');

async function runTest() {
  console.log('============================');
  console.log('TESTING SHEET 39 FIX');
  console.log('============================\n');
  
  try {
    console.log('TEST 1: Looking up fleet type 39');
    console.log('-----------------------------');
    const fleetResult = await getSheetData('1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo', '39');
    console.log(`Results found: ${fleetResult.results ? fleetResult.results.length : 0}`);
    
    if (fleetResult.results && fleetResult.results.length > 0) {
      console.log('\nSample aircraft from fleet 39:');
      fleetResult.results.slice(0, 3).forEach(aircraft => {
        console.log(`- Aircraft ID: ${aircraft.aircraftId}, Registration: ${aircraft.reg}`);
        console.log(`  Has new interior: ${aircraft.hasNextInterior ? 'YES' : 'NO'}`);
      });
    }
  } catch (error) {
    console.error('Error in TEST 1:', error);
  }

  try {
    console.log('\n\nTEST 2: Looking up an aircraft ID from fleet 39');
    console.log('-----------------------------');
    
    // Try with a few different aircraft IDs that might be in fleet 39
    const testIds = ['3901', '3902', '3903'];
    
    for (const testId of testIds) {
      console.log(`\nChecking aircraft ID: ${testId}`);
      const aircraftResult = await getSheetData('1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo', testId);
      console.log(`Results found: ${aircraftResult.results ? aircraftResult.results.length : 0}`);
      
      if (aircraftResult.results && aircraftResult.results.length > 0) {
        aircraftResult.results.forEach(aircraft => {
          console.log(`- Found in fleet: ${aircraft.fleetType}`);
          console.log(`  Registration: ${aircraft.reg}`);
          console.log(`  Has new interior: ${aircraft.hasNextInterior ? 'YES' : 'NO'}`);
        });
        break; // Found one, no need to check the others
      }
    }
  } catch (error) {
    console.error('Error in TEST 2:', error);
  }
  
  console.log('\n============================');
  console.log('TEST COMPLETE');
  console.log('============================');
}

runTest();
