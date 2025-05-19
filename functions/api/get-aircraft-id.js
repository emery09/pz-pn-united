// Cloudflare Function for getting aircraft ID using FlightAware Aero API
// This replaces the previous web scraping solution with a direct API call

export async function onRequestPost({ request, env }) {
  try {
    // Parse the request body
    const requestData = await request.json();
    const { flightNumber, date, departureAirport, arrivalAirport } = requestData;
    
    if (!flightNumber || !date || !departureAirport || !arrivalAirport) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: flightNumber, date, departureAirport, arrivalAirport' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Extract flight number without the UA prefix
    const flightNumberWithoutUA = flightNumber.replace(/^UA/i, '');
    // Format date as YYYY-MM-DD
    const formattedDate = date;
    
    console.log(`Getting flight data for UA${flightNumberWithoutUA} on ${formattedDate} from ${departureAirport} to ${arrivalAirport}`);
    
    // Use the FlightAware Aero API to get flight details
    // API key provided: 9hfWkPkSPM2pTELiDoMVv1dwjENOC2Np
    const FLIGHTAWARE_API_KEY = '9hfWkPkSPM2pTELiDoMVv1dwjENOC2Np';
    
    try {
      // Format the flight identifier according to FlightAware's API requirements
      // For example, UA123 on May 19, 2025 would be "UAL123@1621382400"
      const carrierCode = "UAL"; // United Airlines ICAO code is UAL
      
      // Convert date to timestamp (seconds since Unix epoch)
      const dateParts = formattedDate.split('-');
      const flightDateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
      const timestamp = Math.floor(flightDateObj.getTime() / 1000);
      
      // Flight designator in FlightAware format
      const flightDesignator = `${carrierCode}${flightNumberWithoutUA}@${timestamp}`;
      
      console.log(`FlightAware designator: ${flightDesignator}`);
      
      // API endpoint for flight info
      const apiUrl = `https://aeroapi.flightaware.com/aeroapi/flights/${flightDesignator}`;
      
      // Make the API request
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'x-apikey': FLIGHTAWARE_API_KEY,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        // Handle API errors
        const errorData = await response.json();
        console.error(`FlightAware API error: ${response.status}`, errorData);
        
        return new Response(JSON.stringify({ 
          error: `FlightAware API error: ${response.status} - ${errorData.message || 'Unknown error'}`,
          details: errorData
        }), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Parse the API response
      const flightData = await response.json();
      console.log(`Received flight data for ${flightNumber}`);
      
      // Extract registration from API response (e.g., N12345)
      // The 'registration' is the tail number of the aircraft
      if (flightData && flightData.flights && flightData.flights.length > 0) {
        const flight = flightData.flights[0]; // Get the first flight matching our criteria
        const registration = flight.registration;
        
        if (!registration) {
          return new Response(JSON.stringify({ 
            error: 'Aircraft registration not found in flight data',
            flightDetails: {
              flightNumber,
              date: formattedDate,
              departureAirport,
              arrivalAirport
            }
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
        
        console.log(`Found registration: ${registration}`);
        
        // Now we need to look up this registration in the Google Sheet to find the aircraft ID
        // This reverses our previous approach - we now go from registration to ID,
        // instead of ID to registration
        
        const aircraftData = await getAircraftDataByRegistration(registration);
        
        if (aircraftData) {
          return new Response(JSON.stringify({
            aircraftId: aircraftData.aircraftId,
            registration: registration,
            flightNumber,
            date: formattedDate,
            departureAirport,
            arrivalAirport,
            hasNextInterior: aircraftData.hasNextInterior,
            fleetType: aircraftData.fleetType,
            method: 'flightaware_api',
            timestamp: new Date().toISOString()
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
            }
          });
        } else {
          return new Response(JSON.stringify({ 
            error: `Aircraft with registration ${registration} not found in database`,
            registration: registration,
            flightNumber,
            date: formattedDate
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
      } else {
        return new Response(JSON.stringify({ 
          error: 'Flight not found in FlightAware data',
          flightNumber,
          date: formattedDate,
          departureAirport,
          arrivalAirport
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
    } catch (apiError) {
      console.error('FlightAware API error:', apiError);
      
      return new Response(JSON.stringify({ 
        error: `Error accessing FlightAware API: ${apiError.message}`,
        details: apiError.stack
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
  } catch (error) {
    console.error('Error in get-aircraft-id function:', error);
    
    return new Response(JSON.stringify({ 
      error: `An error occurred: ${error.message}` 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// Function to query the Google Sheet for aircraft data by registration
async function getAircraftDataByRegistration(registration) {
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
  
  const SHEET_ID = '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';
  
  // Clean the registration - some FlightAware registrations have extra spaces or characters
  const cleanedRegistration = registration.trim().toUpperCase();
  
  // Check for N-number format and handle both with and without the 'N' prefix
  const registrationVariants = [
    cleanedRegistration,                               // Original (e.g., "N12345")
    cleanedRegistration.replace(/^N/, ''),             // Without N prefix (e.g., "12345")
    cleanedRegistration.startsWith('N') ? cleanedRegistration : `N${cleanedRegistration}` // With N prefix
  ];
  
  console.log(`Trying registration variants: ${registrationVariants.join(', ')}`);
  
  // Search for the registration in all sheets, trying all variants
  for (const sheet of sheetInfo) {
    for (const regVariant of registrationVariants) {
      try {
        console.log(`Looking for registration ${regVariant} in fleet ${sheet.name}`);
        
        // Query the sheet for the registration (column B)
        const baseUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?`;
        
        // Try with exact match first
        const exactQuery = encodeURIComponent(`SELECT B, C, H WHERE B = '${regVariant}'`);
        const url = `${baseUrl}&gid=${sheet.gid}&tq=${exactQuery}`;
        
        const response = await fetch(url);
        const text = await response.text();
        
        // Extract JSON from response
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        
        if (jsonStart === -1 || jsonEnd <= jsonStart) {
          console.log(`No valid JSON response from fleet ${sheet.name} for ${regVariant}`);
          continue;
        }
        
        const jsonString = text.slice(jsonStart, jsonEnd);
        const data = JSON.parse(jsonString);
        
        if (data.table && data.table.rows && data.table.rows.length > 0) {
          // Found matching registration
          const row = data.table.rows[0];
          
          if (row.c && row.c[1] && row.c[1].v !== null) { // Column C (aircraft ID)
            const aircraftId = row.c[1].v.toString ? row.c[1].v.toString() : `${row.c[1].v}`;
            
            // Get next interior status from column H (index 2)
            const nextStatus = row.c[2] && row.c[2].v !== null ? 
              (row.c[2].v.toString ? row.c[2].v.toString().trim().toUpperCase() : `${row.c[2].v}`.trim().toUpperCase()) : 'N';
            
            console.log(`Found registration ${regVariant} in fleet ${sheet.name}, Aircraft ID: ${aircraftId}, Next Status: ${nextStatus}`);
            
            return {
              aircraftId: aircraftId,
              registration: regVariant,
              fleetType: sheet.name,
              hasNextInterior: nextStatus === 'Y',
              nextStatus: nextStatus
            };
          }
        }
      } catch (error) {
        console.error(`Error checking fleet ${sheet.name} for ${regVariant}:`, error.message);
        // Continue checking other variants and sheets
      }
    }
    
    // If exact match failed for all variants, try a CONTAINS search as last resort
    try {
      console.log(`Trying CONTAINS search for registration in fleet ${sheet.name}`);
      
      const baseUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?`;
      // Clean up registration to just the digits for a fuzzy search (e.g., N12345 -> 12345)
      const regDigits = cleanedRegistration.replace(/\D/g, '');
      
      if (regDigits.length >= 3) { // Only search if we have at least 3 digits to avoid false matches
        const containsQuery = encodeURIComponent(`SELECT B, C, H WHERE B CONTAINS '${regDigits}'`);
        const url = `${baseUrl}&gid=${sheet.gid}&tq=${containsQuery}`;
        
        const response = await fetch(url);
        const text = await response.text();
        
        // Extract JSON from response
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          const jsonString = text.slice(jsonStart, jsonEnd);
          const data = JSON.parse(jsonString);
          
          if (data.table && data.table.rows && data.table.rows.length > 0) {
            const row = data.table.rows[0]; // Use first match from contains query
            
            if (row.c && row.c[1] && row.c[1].v !== null) {
              const aircraftId = row.c[1].v.toString ? row.c[1].v.toString() : `${row.c[1].v}`;
              const foundRegistration = row.c[0] && row.c[0].v ? row.c[0].v.toString() : '';
              const nextStatus = row.c[2] && row.c[2].v !== null ? 
                (row.c[2].v.toString ? row.c[2].v.toString().trim().toUpperCase() : `${row.c[2].v}`.trim().toUpperCase()) : 'N';
              
              console.log(`Found fuzzy match: ${foundRegistration} in fleet ${sheet.name}, Aircraft ID: ${aircraftId}`);
              
              return {
                aircraftId: aircraftId,
                registration: foundRegistration,
                fleetType: sheet.name,
                hasNextInterior: nextStatus === 'Y',
                nextStatus: nextStatus,
                matchType: 'fuzzy' // Indicate this was a fuzzy match
              };
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error in fuzzy search for fleet ${sheet.name}:`, error.message);
    }
  }
  
  // If we've checked all sheets and found nothing, try to extract aircraft ID from registration
  console.log(`Registration ${registration} not found in any fleet sheet, trying extraction fallback`);
  
  // Many airline tail numbers have the aircraft ID embedded in them (e.g., N12345 -> 12345)
  const extractedId = cleanedRegistration.replace(/^N/i, '').replace(/\D/g, '');
  if (extractedId && extractedId.length > 0) {
    console.log(`Using extracted aircraft ID as fallback: ${extractedId}`);
    
    // Try to guess fleet type from aircraft ID pattern
    let fleetType = 'Unknown';
    if (extractedId.startsWith('19') || extractedId.startsWith('32')) {
      fleetType = '19'; // A319
    } else if (extractedId.startsWith('20') || extractedId.startsWith('33')) {
      fleetType = '20'; // A320
    } else if (extractedId.startsWith('21')) {
      fleetType = '21'; // A321
    } else if (extractedId.startsWith('34') || 
        (extractedId.startsWith('38') && parseInt(extractedId) <= 3850)) {
      fleetType = '39'; // 737-900
    } else if (extractedId.startsWith('38') && 
            parseInt(extractedId) >= 3851 && 
            parseInt(extractedId) <= 3879) {
      fleetType = '53'; // 757-300
    } else if (extractedId.startsWith('38')) {
      fleetType = '38'; // 737-800
    } else if (extractedId.startsWith('8') || extractedId.startsWith('9')) {
      fleetType = '88/X'; // 787 or 787-8
    }
    
    return {
      aircraftId: extractedId,
      registration: cleanedRegistration,
      fleetType: fleetType,
      hasNextInterior: false, // Default to false when using fallback
      nextStatus: 'N',
      matchType: 'extracted' // Indicate this was extracted from registration
    };
  }
  
  return null;
}
