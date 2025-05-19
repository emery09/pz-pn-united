// Cloudflare Function for getting aircraft ID from United's website
// Enhanced with advanced anti-detection techniques

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
    
    // Construct the flight status URL
    const unitedUrl = `https://www.united.com/en/us/flightstatus/details/${flightNumberWithoutUA}/${date}/${departureAirport}/${arrivalAirport}/UA`;
    
    console.log(`Fetching data from: ${unitedUrl}`);
    
    // Rotate between multiple realistic user agents
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
    ];
    
    // Generate a consistent yet varying index based on date and flight
    const seedValue = (date.charCodeAt(0) + parseInt(flightNumberWithoutUA)) % userAgents.length;
    const selectedUserAgent = userAgents[seedValue];
    
    // Realistic browser headers with variations
    const headers = {
      'User-Agent': selectedUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.united.com/en/us/flightstatus',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Connection': 'keep-alive'
    };
    
    // Cookie handling to mimic browser behavior
    const cookieJar = {};
    
    // Try to fetch the initial page to get cookies first
    try {
      const initialResponse = await fetch('https://www.united.com/en/us/flightstatus', {
        headers: {
          'User-Agent': selectedUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Dest': 'document'
        },
        redirect: 'follow'
      });
      
      // Extract and store cookies
      if (initialResponse.headers.has('set-cookie')) {
        const cookies = initialResponse.headers.get('set-cookie');
        headers['Cookie'] = cookies;
      }
      
      // Add a small delay to mimic human behavior (varies between 1-3 seconds)
      const humanDelay = Math.floor(Math.random() * 2000) + 1000;
      await new Promise(resolve => setTimeout(resolve, humanDelay));
      
    } catch (error) {
      console.log('Initial cookie fetch failed, continuing anyway:', error.message);
    }
    
    // Advanced retry logic with exponential backoff
    let response = null;
    let retries = 4; // Increased retries
    let success = false;
    let html = '';
    
    while (retries > 0 && !success) {
      try {
        // Adjust request slightly on retries to appear more human-like
        if (retries < 4) {
          // Add a slightly different cache buster on each retry
          const cacheBuster = new Date().getTime() + Math.floor(Math.random() * 1000);
          headers['Cache-Control'] = 'max-age=0, no-cache';
          headers['Pragma'] = 'no-cache';
        }
        
        // Make the request with current headers
        response = await fetch(unitedUrl, { 
          headers,
          redirect: 'follow'
        });
        
        // Check if we got a successful response
        if (response.ok) {
          html = await response.text();
          
          // Check if we got a captcha/challenge page or login redirect
          if (html.includes('captcha') || html.includes('robot') || 
              html.includes('challenge-form') || html.includes('suspicious activity') ||
              html.includes('Access Denied') || html.includes('Please verify you are a human')) {
            console.log(`Got a security challenge on attempt ${5-retries}`);
            retries--;
            
            // Exponential backoff (0.8s, 1.7s, 3.5s, 7s)
            const backoffDelay = Math.pow(2, 4-retries) * 500 + Math.random() * 300;
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          } else {
            // We got real content
            success = true;
          }
        } else {
          console.log(`Retry attempt ${5-retries}: Failed with status ${response.status}`);
          retries--;
          
          // Exponential backoff with jitter
          const backoffDelay = Math.pow(2, 4-retries) * 500 + Math.random() * 300;
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      } catch (fetchError) {
        console.log(`Fetch error on attempt ${5-retries}: ${fetchError.message}`);
        retries--;
        
        // Exponential backoff
        const backoffDelay = Math.pow(2, 4-retries) * 500;
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
    
    // If all retries failed or we got a challenge on every attempt
    if (!success) {
      // Try an alternative approach - API request method
      try {
        console.log("Trying alternative API method");
        
        // Some sites offer JSON APIs that are less likely to be protected
        const apiUrl = `https://www.united.com/api/flight/status/${flightNumberWithoutUA}/details`;
        const apiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'User-Agent': selectedUserAgent,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            flightNumber: flightNumberWithoutUA,
            flightDate: date,
            origin: departureAirport,
            destination: arrivalAirport
          })
        });
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          // Process API data if successful
          if (apiData && apiData.aircraft && apiData.aircraft.tailNumber) {
            return new Response(JSON.stringify({
              aircraftId: apiData.aircraft.tailNumber.replace(/^N/, ''),
              flightNumber,
              date,
              departureAirport,
              arrivalAirport,
              url: unitedUrl,
              method: 'api'
            }), {
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300'
              }
            });
          }
        }
      } catch (apiError) {
        console.log(`API method failed: ${apiError.message}`);
      }
      
      return new Response(JSON.stringify({ 
        error: `Unable to access flight data after multiple attempts. United.com may be blocking requests.`,
        url: unitedUrl
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Multi-stage aircraft identifier extraction with fallbacks
    let aircraftId = null;
    let aircraftType = null;
    
    // Try extracting from structured data first (most reliable)
    const structuredDataMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    if (structuredDataMatch && structuredDataMatch[1]) {
      try {
        const structuredData = JSON.parse(structuredDataMatch[1]);
        if (structuredData.aircraft && structuredData.aircraft.iataCode) {
          aircraftType = structuredData.aircraft.iataCode;
        }
      } catch (e) {
        console.log("Structured data parsing failed:", e.message);
      }
    }
    
    // Pattern 1: Look for aircraft details section with # followed by digits
    if (!aircraftId) {
      const pattern1 = /Aircraft(?:\s*Details)?:?[^#]*#\s*(\d{4})/i;
      const match1 = html.match(pattern1);
      
      if (match1 && match1[1]) {
        aircraftId = match1[1];
      }
    }
    
    // Pattern 2: Look for aircraft ID in JSON data
    if (!aircraftId) {
      const jsonDataMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.*?})\s*;\s*<\/script>/s);
      if (jsonDataMatch && jsonDataMatch[1]) {
        try {
          const jsonData = JSON.parse(jsonDataMatch[1]);
          // Navigate the JSON tree to find aircraft info
          if (jsonData.flightStatus && 
              jsonData.flightStatus.details && 
              jsonData.flightStatus.details.aircraft) {
            const aircraft = jsonData.flightStatus.details.aircraft;
            if (aircraft.tailNumber) {
              aircraftId = aircraft.tailNumber.replace(/^N/, '');
            } else if (aircraft.regNumber) {
              aircraftId = aircraft.regNumber.replace(/^N/, '');
            }
          }
        } catch (e) {
          console.log("JSON data parsing failed:", e.message);
        }
      }
    }
    
    // Pattern 3: Alternative pattern looking for a 4-digit ID after "Aircraft"
    if (!aircraftId) {
      const pattern2 = /(?:Aircraft|Equipment)\s+(?:Type|Details|ID)?:?\s*[^#]*?(\d{4})/i;
      const match2 = html.match(pattern2);
      if (match2 && match2[1]) {
        aircraftId = match2[1];
      }
    }
    
    // Pattern 4: Look for aircraft ID in page metadata or JSON data with escaped quotes
    if (!aircraftId) {
      const dataMatch = html.match(/\\"(?:aircraft|tail|equipment)(?:Id|Number|Num)\\":\\"(\d{4})\\"/i);
      if (dataMatch && dataMatch[1]) {
        aircraftId = dataMatch[1];
      }
    }
    
    // Pattern 5: Look for text near "Tail Number", "Registration", or "Ship Number" which might contain the ID
    if (!aircraftId) {
      const tailMatches = [
        html.match(/[Tt]ail\s*[Nn]umber[^0-9]*(\d{4})/),
        html.match(/[Rr]egistration[^0-9]*[nN]?(\d{4})/),
        html.match(/[Ss]hip\s*[Nn]umber[^0-9]*(\d{4})/)
      ];
      
      for (const match of tailMatches) {
        if (match && match[1]) {
          aircraftId = match[1];
          break;
        }
      }
    }
    
    // If we found an aircraft ID, return it with enriched data
    if (aircraftId) {
      return new Response(JSON.stringify({ 
        aircraftId,
        flightNumber,
        date,
        departureAirport,
        arrivalAirport,
        aircraftType: aircraftType || "Unknown",
        url: unitedUrl,
        timestamp: new Date().toISOString()
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // Cache successful responses for 5 minutes
          'Vary': 'Accept-Encoding'
        }
      });
    }
    
    // If we couldn't find the aircraft ID but got a page
    return new Response(JSON.stringify({ 
      error: 'Could not find aircraft identifier on the page',
      flightNumber,
      date,
      departureAirport,
      arrivalAirport,
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
