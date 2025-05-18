// Cloudflare Function for /api/check-interior endpoint

export async function onRequestPost({ request }) {
  try {
    // Parse the request body
    const requestData = await request.json();
    const { aircraftId } = requestData;
    
    if (!aircraftId) {
      return new Response(JSON.stringify({ error: 'Missing aircraftId' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Google Sheet ID - hardcoded for simplicity
    const SHEET_ID = '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';
    
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
    
    // Normalize input for comparison
    const normalizedInputId = aircraftId.replace(/^0+/, '');
    const fullInputId = aircraftId;
    const results = [];
    const timestamp = new Date().toLocaleString('en-US', { 
      dateStyle: 'medium', 
      timeStyle: 'medium' 
    });
    
    // Determine which sheet to check first based on aircraft ID pattern
    let primarySheet = null;
    
    // SPECIAL CASE 1: For 3400s or 3800-3850 aircraft, check 39 fleet first (Boeing 737-900)
    if ((normalizedInputId.startsWith('34')) || 
        (normalizedInputId.startsWith('38') && parseInt(normalizedInputId) <= 3850)) {
      primarySheet = sheetInfo.find(s => s.name === '39');
    }
    // SPECIAL CASE 2: For 3851-3879 aircraft, check 53 fleet first (Boeing 757-300)
    else if (normalizedInputId.startsWith('38') && 
            parseInt(normalizedInputId) >= 3851 && 
            parseInt(normalizedInputId) <= 3879) {
      primarySheet = sheetInfo.find(s => s.name === '53');
    }
    
    // If we have a likely primary sheet, check it first
    if (primarySheet) {
      const result = await fetchAircraftFromSheet(SHEET_ID, primarySheet, aircraftId);
      if (result) {
        return new Response(JSON.stringify({
          results: [result],
          timestamp,
          reg: result.reg
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    }
    
    // If we didn't find it in the primary sheet, or don't have one, check all sheets
    for (const sheet of sheetInfo) {
      // Skip the primary sheet if we already checked it
      if (primarySheet && sheet.name === primarySheet.name) {
        continue;
      }
      
      const result = await fetchAircraftFromSheet(SHEET_ID, sheet, aircraftId);
      if (result) {
        results.push(result);
      }
    }
    
    // If we found results, return them
    if (results.length > 0) {
      return new Response(JSON.stringify({
        results,
        timestamp,
        reg: results[0].reg
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // If we still haven't found anything, return a placeholder
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
    
    return new Response(JSON.stringify({
      results: [fallbackResult],
      timestamp,
      reg: fallbackResult.reg
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: `Error checking aircraft interior: ${error.message}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * Fetch aircraft data from a specific sheet
 */
async function fetchAircraftFromSheet(sheetId, sheet, aircraftId) {
  try {
    const normalizedInputId = aircraftId.replace(/^0+/, '');
    const fullInputId = aircraftId;
    
    // Use fetch to get the sheet data
    const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
    const getAllQuery = encodeURIComponent('SELECT B, C, H');
    const url = `${baseUrl}&gid=${sheet.gid}&tq=${getAllQuery}`;
    
    const response = await fetch(url);
    const text = await response.text();
    
    // Extract JSON from response
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      return null;
    }
    
    const jsonString = text.slice(jsonStart, jsonEnd);
    const data = JSON.parse(jsonString);
    
    if (!data.table || !data.table.rows || data.table.rows.length === 0) {
      return null;
    }
    
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
    
    return null;
    
  } catch (error) {
    return null;
  }
}
