const axios = require('axios');

async function listAllAircraftIds() {
    const SHEET_ID = '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';
    const sheetNames = ['19', '20', '21', '3G', '38', 'M8', '39', 'M9', '52', '63/4', '72', '73', '88/X', '89'];
    const allAircraft = new Map(); // Use Map to avoid duplicates
    const narrowBodyTypes = ['19', '20', '21', '3G', '38', 'M8', '39', 'M9', '52', '53'];

    for (const sheet of sheetNames) {
        try {
            const encodedSheet = encodeURIComponent(sheet);
            // Get registration, aircraft IDs and their Next status from this sheet
            const query = encodeURIComponent('SELECT B, C, H ORDER BY C');
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodedSheet}&tq=${query}`;
            
            const response = await axios.get(url);
            const text = response.data;
            
            if (text.includes('Invalid sheet')) {
                console.error(`Sheet ${sheet} not accessible`);
                continue;
            }

            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}') + 1;
            const jsonString = text.slice(jsonStart, jsonEnd);
            const data = JSON.parse(jsonString);
            
            if (data.table && data.table.rows) {
                data.table.rows.forEach(row => {
                    if (row.c[1] && row.c[1].v) { // C is now at index 1
                        const registration = row.c[0] ? row.c[0].v : null; // B is at index 0
                        const aircraftId = row.c[1].v.toString(); // C is at index 1
                        const hasNext = row.c[2] ? row.c[2].v === 'Y' : false; // H is at index 2
                        
                        // Determine interior type
                        let interiorType;
                        if (sheet === '72' && parseInt(aircraftId) < 2511) {
                            interiorType = 'Old Domestic 777 Interior';
                        } else if (!narrowBodyTypes.includes(sheet) && !hasNext) {
                            interiorType = 'International Economy/Premium Plus/Polaris';
                        } else {
                            interiorType = hasNext ? 'United Next' : 'Standard';
                        }
                        
                        // Store in map with fleet type, registration, and interior status
                        allAircraft.set(aircraftId, {
                            registration,
                            fleetType: sheet,
                            hasNext,
                            interiorType
                        });
                    }
                });
            }
        } catch (error) {
            console.error(`Error with sheet ${sheet}:`, error.message);
            continue;
        }
    }

    return allAircraft;
}

// New checkInterior function
async function checkInterior(aircraftId) {
    const SHEET_ID = '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';
    const getSheetData = require('./getSheetData');
    const { results, timestamp } = await getSheetData(SHEET_ID, aircraftId);
    if (!results || results.length === 0) {
        return {
            message: `No information found for aircraft ID ${aircraftId}.`,
            results: [],
            hasNextInterior: null,
            timestamp
        };
    }
    // Use the first match for summary fields
    const match = results[0];
    // Include reg in the returned object
    return {
        message: match.hasNextInterior
            ? `Your ${match.fleetType} has the new interior.`
            : `Your ${match.fleetType} has the standard interior.`,
        results,
        hasNextInterior: match.hasNextInterior,
        fleetType: match.fleetType,
        reg: match.reg, // Pass the registration to the client
        timestamp
    };
}

// Export the functions for use in other files
module.exports = {
    listAllAircraftIds,
    checkInterior
};

// Run the script if called directly
if (require.main === module) {
    listAllAircraftIds().then(aircraft => {
        console.log('\n=== Summary ===');
        console.log(`Total unique aircraft: ${aircraft.size}`);
        
        // Count aircraft by interior type
        const interiorCounts = Array.from(aircraft.values()).reduce((acc, curr) => {
            acc[curr.interiorType] = (acc[curr.interiorType] || 0) + 1;
            return acc;
        }, {});

        Object.entries(interiorCounts).forEach(([type, count]) => {
            console.log(`${type}: ${count}`);
        });

        // Display Aircraft ID, Registration, and Fleet Type
        console.log('\nID         Registration   Aircraft Type');
        console.log('----------------------------------------');
        Array.from(aircraft.entries()).forEach(([id, data]) => {
            const reg = data.registration ? data.registration : 'N/A';
            console.log(`${id.padEnd(10)} ${reg.padEnd(14)} ${data.fleetType}`);
        });
    });
}