const getSheetData = require('./getSheetData.js');

// Array of test aircraft IDs including both 3400s and 3800s series
const testIds = ['3401', '3477', '3801', '3835'];

async function testAircraftIds() {
    console.log('===== TESTING 39 FLEET AIRCRAFT IDS =====');
    
    for (const id of testIds) {
        console.log(`\n----- Testing Aircraft ID: ${id} -----`);
        try {
            const result = await getSheetData('1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo', id);
            
            if (result.results && result.results.length > 0) {
                console.log(`✅ SUCCESS: Found aircraft ${id} in fleet ${result.results[0].fleetType}`);
                console.log(`Registration: ${result.results[0].reg}`);
                console.log(`Has Next Interior: ${result.results[0].hasNextInterior ? 'Yes' : 'No'}`);
            } else {
                console.log(`❌ FAIL: Aircraft ${id} not found`);
            }
        } catch (error) {
            console.error(`Error testing aircraft ${id}:`, error.message);
        }
    }
    
    console.log('\n===== TESTING COMPLETE =====');
}

testAircraftIds();
