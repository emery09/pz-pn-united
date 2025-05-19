// Cloudflare Function for getting aircraft ID from United's website

export async function onRequestPost({ request }) {
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
    
    // Construct the flight status URL
    const unitedUrl = `https://www.united.com/en/us/flightstatus/details/${flightNumberWithoutUA}/${date}/${departureAirport}/${arrivalAirport}/UA`;
    
    console.log(`Fetching data from: ${unitedUrl}`);
    
    // Fetch the page HTML
    const response = await fetch(unitedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.united.com/en/us/flightstatus'
      }
    });
    
    if (!response.ok) {
      return new Response(JSON.stringify({ 
        error: `Failed to fetch flight data: ${response.status} ${response.statusText}` 
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    const html = await response.text();
    
    // Extract the aircraft identifier
    // Look for patterns like "Aircraft: Boeing 737-900 #3939" or "Aircraft Details: ... #1234"
    // Using two regex patterns to increase chances of finding the ID
    let aircraftId = null;
    
    // Pattern 1: Look for aircraft details section with # followed by digits
    const pattern1 = /Aircraft(?:\s*Details)?:?[^#]*#\s*(\d{4})/i;
    const match1 = html.match(pattern1);
    
    if (match1 && match1[1]) {
      aircraftId = match1[1];
    }
    
    // Pattern 2: Alternative pattern looking for a 4-digit ID after "Aircraft"
    if (!aircraftId) {
      const pattern2 = /(?:Aircraft|Equipment)\s+(?:Type|Details|ID)?:?\s*[^#]*?(\d{4})/i;
      const match2 = html.match(pattern2);
      if (match2 && match2[1]) {
        aircraftId = match2[1];
      }
    }
    
    // If we found an aircraft ID, return it
    if (aircraftId) {
      return new Response(JSON.stringify({ 
        aircraftId,
        flightNumber,
        date,
        departureAirport,
        arrivalAirport,
        url: unitedUrl
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // If we couldn't find the aircraft ID
    return new Response(JSON.stringify({ 
      error: 'Could not find aircraft identifier on the page',
      url: unitedUrl
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
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
