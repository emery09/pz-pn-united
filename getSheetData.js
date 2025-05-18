// getSheetData.js - Standalone function without circular dependencies

const axios = require('axios');

/**
 * Fetches aircraft data from Google Sheets
 * @param {string} sheetId - Google Sheet ID
 * @param {string} aircraftId - The aircraft ID to look up
 * @returns {Object} Results including interior status and registration
 */
async function getSheetData(sheetId, aircraftId) {
    // Define fleet types (sheet names) and their corresponding gid values in the spreadsheet
    const sheetInfo = [
        {name: '19', gid: 0},
        {name: '20', gid: 1},
        {name: '21', gid: 2},
        {name: '3G', gid: 3},
        {name: '38', gid: 4}, 
        {name: 'M8', gid: 5},
        {name: '39', gid: 6},
        {name: 'M9', gid: 7},
        {name: '52', gid: 8},
        {name: '53', gid: 14}, // 757-300
        {name: '63/4', gid: 9},
        {name: '72', gid: 10},
        {name: '73', gid: 11},
        {name: '88/X', gid: 12},
        {name: '89', gid: 13}
    ];
    
    // Get array of just sheet names for backwards compatibility
    const sheetNames = sheetInfo.map(sheet => sheet.name);
    
    // Only treat single/double digit input as a potential fleet type
    const isSheetName = sheetNames.includes(aircraftId) && aircraftId.length <= 2;
    
    // If the requested ID is actually a sheet name, handle it differently
    if (isSheetName) {
        console.log(`Detected "${aircraftId}" as a fleet type (sheet name), not an aircraft ID. Fetching all aircraft for this fleet.`);
        return await getAircraftByFleetType(sheetId, aircraftId, sheetInfo);
    }
    
    const results = [];
    const timestamp = new Date().toLocaleString('en-US', { 
        dateStyle: 'medium', 
        timeStyle: 'medium' 
    });

    try {
        // Normalize input for comparison
        const normalizedInputId = aircraftId.replace(/^0+/, '');
        const fullInputId = aircraftId;
        
        console.log(`Looking for aircraft ID: ${aircraftId} (normalized: ${normalizedInputId})`);
        
        // Determine which sheet to check first based on aircraft ID pattern
        let primarySheet = null;
        
        // SPECIAL CASE 1: For 3400s or 3800-3850 aircraft, check 39 fleet first (Boeing 737-900)
        if ((normalizedInputId.startsWith('34')) || 
            (normalizedInputId.startsWith('38') && parseInt(normalizedInputId) <= 3850)) {
            console.log(`Aircraft ID ${aircraftId} likely in 39 fleet (Boeing 737-900)`);
            primarySheet = sheetInfo.find(s => s.name === '39');
        }
        // SPECIAL CASE 2: For 3851-3879 aircraft, check 53 fleet first (Boeing 757-300)
        else if (normalizedInputId.startsWith('38') && 
                parseInt(normalizedInputId) >= 3851 && 
                parseInt(normalizedInputId) <= 3879) {
            console.log(`Aircraft ID ${aircraftId} likely in 53 fleet (Boeing 757-300)`);
            primarySheet = sheetInfo.find(s => s.name === '53');
        }
        
        // If we have a likely primary sheet, check it first
        if (primarySheet) {
            const result = await fetchAircraftFromSheet(sheetId, primarySheet, aircraftId);
            if (result) {
                console.log(`Successfully found ${aircraftId} in ${primarySheet.name} sheet with reg: ${result.reg}`);
                return {
                    results: [result],
                    timestamp,
                    reg: result.reg
                };
            }
        }
        
        // If we didn't find it in the primary sheet, or don't have one, check all sheets
        console.log(`Checking all sheets for aircraft ID: ${aircraftId}`);
        for (const sheet of sheetInfo) {
            // Skip the primary sheet if we already checked it
            if (primarySheet && sheet.name === primarySheet.name) {
                continue;
            }
            
            const result = await fetchAircraftFromSheet(sheetId, sheet, aircraftId);
            if (result) {
                results.push(result);
            }
        }
        
        // If we found results, return them
        if (results.length > 0) {
            console.log(`Found ${results.length} matches for aircraft ID ${aircraftId}`);
            return {
                results,
                timestamp,
                reg: results[0].reg
            };
        }
        
        // If we still haven't found anything, return a placeholder
        console.log(`No matches found for ${aircraftId} in any sheet, using fallback`);
        
        // Determine likely fleet type based on aircraft ID pattern
        let fleetType = 'Unknown';
        if (normalizedInputId.startsWith('34') || 
            (normalizedInputId.startsWith('38') && parseInt(normalizedInputId) <= 3850)) {
            fleetType = '39'; // 737-900
        } else if (normalizedInputId.startsWith('38') && 
                parseInt(normalizedInputId) >= 3851 && 
                parseInt(normalizedInputId) <= 3879) {
            fleetType = '53'; // 757-300
        }
        
        const fallbackResult = {
            aircraftId: fullInputId,
            reg: `N${normalizedInputId}`, // Simple fallback registration
            fleetType: fleetType,
            hasNextInterior: false,
            nextStatus: 'N'
        };
        
        return {
            results: [fallbackResult],
            timestamp,
            reg: fallbackResult.reg
        };
        
    } catch (error) {
        console.error('Error fetching sheet data:', error.message);
        throw error;
    }
}

/**
 * Fetch aircraft data from a specific sheet, first trying with WHERE query,
 * then falling back to fetching all rows and filtering in-code if needed
 */
async function fetchAircraftFromSheet(sheetId, sheet, aircraftId) {
    try {
        console.log(`Fetching data for aircraft ${aircraftId} from ${sheet.name} sheet`);
        const normalizedInputId = aircraftId.replace(/^0+/, '');
        const fullInputId = aircraftId;
        
        // Try a more direct approach - get all rows from the sheet and filter manually
        const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
        const getAllQuery = encodeURIComponent('SELECT B, C, H');
        const url = `${baseUrl}&gid=${sheet.gid}&tq=${getAllQuery}`;
        
        console.log(`Fetching all data from sheet ${sheet.name} (gid=${sheet.gid})`);
        const response = await axios.get(url);
        const text = response.data;
        
        // Extract JSON from response
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        
        if (jsonStart === -1 || jsonEnd <= jsonStart) {
            console.log(`Invalid JSON response from sheet ${sheet.name}`);
            return null;
        }
        
        const jsonString = text.slice(jsonStart, jsonEnd);
        const data = JSON.parse(jsonString);
        
        if (!data.table || !data.table.rows || data.table.rows.length === 0) {
            console.log(`No data found in sheet ${sheet.name}`);
            return null;
        }
        
        // Log first few rows for debugging
        console.log(`Found ${data.table.rows.length} rows in sheet ${sheet.name}`);
        const sampleRows = data.table.rows.slice(0, 5);
        console.log(`Sample data from ${sheet.name} sheet (first 5 rows):`);
        sampleRows.forEach((row, idx) => {
            if (row.c) {
                const reg = row.c[0] && row.c[0].v !== null ? `${row.c[0].v}` : 'N/A';
                const id = row.c[1] && row.c[1].v !== null ? `${row.c[1].v}` : 'N/A';
                const status = row.c[2] && row.c[2].v !== null ? `${row.c[2].v}` : 'N/A';
                console.log(`  Row ${idx+1}: Reg=${reg}, ID=${id}, Status=${status}`);
            }
        });
        
        // Scan through all rows to find a match
        for (const row of data.table.rows) {
            if (row.c && row.c[1] && row.c[1].v !== null) {
                // Extract and normalize the aircraft ID from column C (index 1)
                const foundId = row.c[1].v.toString ? row.c[1].v.toString() : `${row.c[1].v}`;
                const normalizedFoundId = foundId.replace(/^0+/, '');
                
                // Check for match with and without leading zeros
                if (normalizedFoundId === normalizedInputId || foundId === fullInputId) {
                    // Get registration from column B (index 0)
                    const reg = row.c[0] && row.c[0].v !== null ? 
                        (row.c[0].v.toString ? row.c[0].v.toString() : `${row.c[0].v}`) : 'N/A';
                    
                    // Get next interior status from column H (index 2)
                    const nextStatus = row.c[2] && row.c[2].v !== null ? 
                        (row.c[2].v.toString ? row.c[2].v.toString().trim().toUpperCase() : `${row.c[2].v}`.trim().toUpperCase()) : 'N';
                    
                    console.log(`✅ Found exact match in sheet ${sheet.name}: ID=${foundId}, Reg=${reg}, NextStatus=${nextStatus}`);
                    
                    return {
                        aircraftId: foundId,
                        reg: reg,
                        fleetType: sheet.name,
                        hasNextInterior: nextStatus === 'Y',
                        nextStatus: nextStatus
                    };
                }
            }
        }
        
        console.log(`Aircraft ${aircraftId} not found in ${sheet.name} sheet`);
        return null;
        
    } catch (error) {
        console.error(`Error fetching from ${sheet.name} sheet:`, error.message);
        return null;
    }
}

/**
 * Gets all aircraft for a specific fleet type (sheet)
 * @param {string} sheetId - Google Sheet ID
 * @param {string} fleetType - The fleet type (sheet name) to fetch
 * @param {Array} sheetInfo - Array of sheet information objects
 * @returns {Object} Results including aircraft in that fleet
 */
async function getAircraftByFleetType(sheetId, fleetType, sheetInfo) {
    const results = [];
    const timestamp = new Date().toLocaleString('en-US', { 
        dateStyle: 'medium', 
        timeStyle: 'medium' 
    });

    try {
        // Find the sheet info for this fleet type
        const sheet = sheetInfo.find(s => s.name === fleetType);
        if (!sheet) {
            console.log(`Could not find sheet info for fleet type ${fleetType}`);
            return { results, timestamp };
        }
        
        const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
        // CRITICAL FIX: Always use gid parameter instead of sheet parameter
        const url = `${baseUrl}&gid=${sheet.gid}&tq=${encodeURIComponent('SELECT B, C, H')}`;
        
        console.log(`Fetching all aircraft for fleet type ${fleetType} using gid=${sheet.gid}`);
        const response = await axios.get(url);
        const text = response.data;
        
        if (text.includes('Invalid sheet')) {
            console.log(`Sheet ${fleetType} (gid=${sheet.gid}) is invalid, skipping`);
            return { results, timestamp };
        }
        
        // Extract JSON from response
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        
        if (jsonStart === -1 || jsonEnd <= jsonStart) {
            console.log(`Invalid JSON response for sheet ${fleetType}`);
            return { results, timestamp };
        }
        
        const jsonString = text.slice(jsonStart, jsonEnd);
        
        try {
            const data = JSON.parse(jsonString);
            
            // Validate that we got the correct sheet data
            const isValidData = validateSheetData(data, fleetType);
            if (!isValidData) {
                console.log(`WARNING: Data received for fleet ${fleetType} may be incorrect. Verification failed.`);
                return { results, timestamp };
            }
            
            if (data.table && data.table.rows && data.table.rows.length > 0) {
                console.log(`Found ${data.table.rows.length} rows in fleet type ${fleetType}`);
                
                data.table.rows.forEach(row => {
                    // Check if we have data in column C (aircraft ID) - index 1
                    if (row.c && row.c[1] && row.c[1].v !== null) {
                        // Get values from each column - handle different data types
                        const foundId = row.c[1].v.toString ? row.c[1].v.toString() : `${row.c[1].v}`;
                        const normalizedFoundId = foundId.replace(/^0+/, '');
                        const reg = row.c[0] && row.c[0].v !== null ? 
                            (row.c[0].v.toString ? row.c[0].v.toString() : `${row.c[0].v}`) : 'N/A';
                        
                        const nextStatus = row.c[2] && row.c[2].v !== null ? 
                            (row.c[2].v.toString ? row.c[2].v.toString().trim().toUpperCase() : `${row.c[2].v}`.trim().toUpperCase()) : 'N';
                        
                        results.push({
                            aircraftId: foundId,
                            reg: reg,
                            fleetType: fleetType,
                            hasNextInterior: nextStatus === 'Y',
                            nextStatus: nextStatus
                        });
                    }
                });
            }
        } catch (jsonError) {
            console.error(`Error parsing JSON from sheet ${fleetType}:`, jsonError);
        }
    } catch (error) {
        console.error('Error fetching aircraft by fleet type:', error.message);
    }
    
    return {
        results,
        timestamp,
        reg: results.length > 0 ? results[0].reg : null
    };
}

/**
 * Validates that the data received matches expected patterns for specific sheets
 * This helps ensure we're getting the correct sheet data
 * @param {Object} data - The parsed sheet data
 * @param {String} sheetName - The name of the sheet we're validating
 * @returns {Boolean} Whether the data appears valid for this sheet
 */
function validateSheetData(data, sheetName) {
    if (!data.table || !data.table.rows || data.table.rows.length === 0) {
        return false;
    }
    
    // Look at first 10 rows (or fewer if less available)
    const sampleRows = data.table.rows.slice(0, Math.min(10, data.table.rows.length));
    
    // Check for expected aircraft ID patterns based on fleet type
    const idPatterns = {
        '19': (id) => id.startsWith('4') && parseInt(id) >= 4000 && parseInt(id) < 4900,
        // Updated to include 3800s along with 3400s in the 39 fleet
        '39': (id) => (id.startsWith('34') && parseInt(id) >= 3400 && parseInt(id) < 3700) || 
                      (id.startsWith('38') && parseInt(id) >= 3800 && parseInt(id) < 3900),
        'M8': (id) => id.startsWith('7') || id.startsWith('8'),
        'M9': (id) => id.startsWith('7') || id.startsWith('8') || id.startsWith('9')
    };
    
    // If we have a specific pattern checker for this sheet, use it
    if (idPatterns[sheetName]) {
        for (const row of sampleRows) {
            if (row.c && row.c[1] && row.c[1].v !== null) {
                const foundId = row.c[1].v.toString ? row.c[1].v.toString() : `${row.c[1].v}`;
                const normalizedFoundId = foundId.replace(/^0+/, '');
                
                // If we find at least one ID that matches the expected pattern, consider the data valid
                if (idPatterns[sheetName](normalizedFoundId)) {
                    return true;
                }
            }
        }
        
        // If we checked all sample rows and found no matching pattern, data may be invalid
        console.log(`Warning: Sheet ${sheetName} data doesn't contain expected aircraft ID patterns`);
        return false;
    }
    
    // For sheets without specific patterns, assume data is valid
    return true;
}

module.exports = getSheetData;