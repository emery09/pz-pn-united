const axios = require('axios');

async function checkAircraft(aircraftId, sheetName) {
    const SHEET_ID = '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';
    console.log(`\nSearching for aircraft ${aircraftId} in fleet type ${sheetName}...`);
    try {
        const encodedSheet = encodeURIComponent(sheetName);
        // Try both string and number queries
        const queries = [
            `SELECT C, H WHERE C = '${aircraftId}'`,
            `SELECT C, H WHERE C = ${aircraftId}`
        ];
        let found = false;
        for (const queryRaw of queries) {
            const query = encodeURIComponent(queryRaw);
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodedSheet}&tq=${query}`;
            const response = await axios.get(url);
            const text = response.data;
            if (text.includes('Invalid sheet')) {
                continue;
            }
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}') + 1;
            const jsonString = text.slice(jsonStart, jsonEnd);
            const data = JSON.parse(jsonString);
            if (data.table && data.table.rows && data.table.rows.length > 0) {
                found = true;
                data.table.rows.forEach(row => {
                    if (row.c[0] && row.c[0].v) {
                        const hasNext = row.c[1] && row.c[1].v === 'Y';
                        console.log(`Found in Fleet Type: ${sheetName}`);
                        console.log(`Aircraft ID: ${row.c[0].v}`);
                        console.log(`Next Interior: ${hasNext ? 'Yes' : 'No'}`);
                    }
                });
            }
        }
        if (!found) {
            console.log(`Aircraft ${aircraftId} not found in fleet type ${sheetName}`);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function checkSheet(sheetName) {
    const SHEET_ID = '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';
    
    console.log(`\nChecking data format in fleet type ${sheetName}...`);
    
    try {
        const encodedSheet = encodeURIComponent(sheetName);
        // Get first 5 rows to see the data format
        const query = encodeURIComponent('SELECT C, H LIMIT 5');
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodedSheet}&tq=${query}`;
        
        const response = await axios.get(url);
        const text = response.data;
        
        if (text.includes('Invalid sheet')) {
            console.log('Sheet not accessible');
            return;
        }

        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        const jsonString = text.slice(jsonStart, jsonEnd);
        const data = JSON.parse(jsonString);
        
        if (data.table && data.table.rows) {
            console.log('\nFirst few aircraft IDs in this fleet type:');
            data.table.rows.forEach(row => {
                if (row.c[0]) {
                    console.log(`Aircraft ID: ${row.c[0].v}, Next Interior: ${row.c[1] ? row.c[1].v : 'N/A'}`);
                }
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function searchSheet(sheetName) {
    const SHEET_ID = '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';
    
    console.log(`\nSearching all entries in fleet type ${sheetName}...`);
    
    try {
        const encodedSheet = encodeURIComponent(sheetName);
        // Get all entries (remove WHERE clause to show all aircraft)
        const query = encodeURIComponent('SELECT C, H ORDER BY C');
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodedSheet}&tq=${query}`;
        
        const response = await axios.get(url);
        const text = response.data;
        
        if (text.includes('Invalid sheet')) {
            console.log('Sheet not accessible');
            return;
        }

        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        const jsonString = text.slice(jsonStart, jsonEnd);
        const data = JSON.parse(jsonString);
        
        if (data.table && data.table.rows) {
            console.log('\nAll aircraft IDs:');
            data.table.rows.forEach(row => {
                if (row.c[0]) {
                    console.log(`Aircraft ID: ${row.c[0].v}, Next Interior: ${row.c[1] ? row.c[1].v : 'N/A'}`);
                }
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Test aircraft 4524 in sheet 21
checkAircraft('4524', '21');

// Test aircraft 4001 in sheet 21
checkAircraft('4001', '21');

// Check data format in sheet 21
checkSheet('21');

// Search all entries in sheet 21
searchSheet('21');

// Test aircraft 4001 in all sheets
const sheetNames = ['19', '20', '21', '3G', '38', 'M8', '39', 'M9', '52', '63/4', '72', '73', '88/X', '89'];
async function checkAllSheets(aircraftId) {
    for (const sheet of sheetNames) {
        await checkAircraft(aircraftId, sheet);
    }
}

// Run the test for 4001 in all sheets
checkAllSheets('4001');