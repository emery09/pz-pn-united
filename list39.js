// list39.js - Script to fetch aircraft IDs from sheet 39

const axios = require('axios');

async function listAircraftIn39Sheet() {
    // Google Sheet ID 
    const SHEET_ID = '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';
    const sheetName = '39';
    
    try {
        const baseUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?`;
        // Query that selects registration (B) and aircraft ID (C) columns
        const queryRaw = `SELECT B, C, H`;
        const query = encodeURIComponent(queryRaw);
        
        // Encode sheet name correctly for API
        const sheetParam = encodeURIComponent(`'${sheetName}'`);
        const url = `${baseUrl}&sheet=${sheetParam}&tq=${query}`;
        
        console.log(`Querying sheet ${sheetName} for all aircraft...`);
        const response = await axios.get(url);
        const text = response.data;
        
        // Extract JSON from response
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        
        if (jsonStart === -1 || jsonEnd <= jsonStart) {
            console.log(`Invalid JSON response for sheet ${sheetName}`);
            return;
        }
        
        const jsonString = text.slice(jsonStart, jsonEnd);
        const data = JSON.parse(jsonString);
        
        if (data.table && data.table.rows && data.table.rows.length > 0) {
            console.log(`Found ${data.table.rows.length} rows in sheet ${sheetName}`);
            
            // Print column headers first
            console.log("Registration | Aircraft ID | Next Interior Status");
            console.log("-------------|------------|--------------------");
            
            data.table.rows.forEach(row => {
                if (row.c && row.c[1] && row.c[1].v !== null) {
                    const reg = row.c[0] && row.c[0].v !== null ? 
                        (row.c[0].v.toString ? row.c[0].v.toString() : `${row.c[0].v}`) : 'N/A';
                    
                    const aircraftId = row.c[1] && row.c[1].v !== null ? 
                        (row.c[1].v.toString ? row.c[1].v.toString() : `${row.c[1].v}`) : 'N/A';
                    
                    const nextStatus = row.c[2] && row.c[2].v !== null ? 
                        (row.c[2].v.toString ? row.c[2].v.toString().trim() : `${row.c[2].v}`.trim()) : 'N';
                    
                    console.log(`${reg.padEnd(13)} | ${aircraftId.padEnd(12)} | ${nextStatus}`);
                }
            });
        } else {
            console.log(`No data found in sheet ${sheetName}`);
        }
    } catch (error) {
        console.error('Error fetching sheet data:', error.message);
    }
}

listAircraftIn39Sheet();