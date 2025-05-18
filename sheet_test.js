const axios = require('axios');

async function testSheetAccess() {
    const SHEET_ID = '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';
    const sheets = ['19', '39'];
    
    for (const sheetName of sheets) {
        try {
            console.log(`\n===== Testing Sheet ${sheetName} =====`);
            const baseUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?`;
            const sheetParam = encodeURIComponent(`'${sheetName}'`);
            const querySimple = encodeURIComponent('SELECT B, C, H LIMIT 5');
            const url = `${baseUrl}&sheet=${sheetParam}&tq=${querySimple}`;
            
            console.log(`Fetching: ${url}`);
            const response = await axios.get(url);
            const text = response.data;
            
            if (text.includes('Invalid sheet')) {
                console.log(`Sheet ${sheetName} is INVALID`);
                continue;
            }
            
            console.log(`Sheet ${sheetName} EXISTS`);
            
            // Extract JSON from response
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}') + 1;
            
            if (jsonStart === -1 || jsonEnd <= jsonStart) {
                console.log(`Invalid JSON response for sheet ${sheetName}`);
                continue;
            }
            
            const jsonString = text.slice(jsonStart, jsonEnd);
            const data = JSON.parse(jsonString);
            
            console.log(`Data structure for sheet ${sheetName}:`, 
                data.table && data.table.rows ? `${data.table.rows.length} rows found` : 'No rows found');
            
            if (data.table && data.table.rows && data.table.rows.length > 0) {
                console.log(`Sample data from sheet ${sheetName}:`);
                data.table.rows.slice(0, 3).forEach((row, index) => {
                    if (row.c) {
                        const reg = row.c[0] && row.c[0].v !== null ? 
                            (row.c[0].v.toString ? row.c[0].v.toString() : `${row.c[0].v}`) : 'N/A';
                        const aircraftId = row.c[1] && row.c[1].v !== null ? 
                            (row.c[1].v.toString ? row.c[1].v.toString() : `${row.c[1].v}`) : 'N/A';
                        const nextStatus = row.c[2] && row.c[2].v !== null ? 
                            (row.c[2].v.toString ? row.c[2].v.toString() : `${row.c[2].v}`) : 'N/A';
                        
                        console.log(`  Row ${index+1}: Reg=${reg}, ID=${aircraftId}, Next Status=${nextStatus}`);
                    }
                });
            }
        } catch (error) {
            console.error(`Error testing sheet ${sheetName}:`, error.message);
        }
    }
}

testSheetAccess();
