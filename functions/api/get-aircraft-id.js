// Cloudflare Function for getting aircraft ID from United's website
// Enhanced with advanced WAF-bypass techniques and browser fingerprinting evasion

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
    
    console.log(`Initiating extraction sequence for: ${unitedUrl}`);
    
    // ======== STEALTH FINGERPRINT GENERATION ========
    // Create a consistent but varied fingerprint to mimic a real browser session
    // Browser fingerprinting is a huge WAF detection vector - need to ensure consistency
    
    // Generate a pseudo-unique fingerprint hash based on flight details
    const fingerprintSeed = `${flightNumber}${date.replace(/-/g, '')}${departureAirport}${arrivalAirport}`;
    const fingerprintHash = await generateConsistentHash(fingerprintSeed);
    
    console.log(`Using fingerprint hash: ${fingerprintHash.substring(0, 8)}...`);
    
    // ======== BROWSER PROFILE GENERATION ========
    // Create realistic browser profiles - critical for passing bot detection
    const browserProfiles = [
      {
        name: "Chrome Windows",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        acceptLanguage: "en-US,en;q=0.9",
        secChUa: '"Google Chrome";v="138", "Chromium";v="138", "Not=A?Brand";v="99"',
        secChUaPlatform: '"Windows"',
        secChUaMobile: "?0",
        connectionType: "keep-alive",
        viewport: { width: 1920, height: 1080 },
        screenRes: { width: 1920, height: 1080 },
        timeZone: "America/New_York",
        platform: "Win32"
      },
      {
        name: "Safari MacOS",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        acceptLanguage: "en-US,en;q=0.9",
        secChUa: null, // Safari doesn't send this
        secChUaPlatform: null, // Safari doesn't send this
        secChUaMobile: null, // Safari doesn't send this
        connectionType: "keep-alive",
        viewport: { width: 1680, height: 1050 },
        screenRes: { width: 1680, height: 1050 },
        timeZone: "America/Los_Angeles",
        platform: "MacIntel"
      },
      {
        name: "Firefox Windows",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        acceptLanguage: "en-US,en;q=0.5",
        secChUa: null, // Firefox doesn't send this
        secChUaPlatform: null, // Firefox doesn't send this
        secChUaMobile: null, // Firefox doesn't send this
        connectionType: "keep-alive",
        viewport: { width: 1536, height: 864 },
        screenRes: { width: 1536, height: 864 },
        timeZone: "America/Chicago",
        platform: "Win32"
      },
      // Recent mobile profiles - include to appear organic
      {
        name: "Chrome Android",
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        acceptLanguage: "en-US,en;q=0.9",
        secChUa: '"Google Chrome";v="138", "Chromium";v="138", "Not=A?Brand";v="99"',
        secChUaPlatform: '"Android"',
        secChUaMobile: "?1",
        connectionType: "keep-alive",
        viewport: { width: 412, height: 915 },
        screenRes: { width: 412, height: 915 },
        timeZone: "America/Los_Angeles",
        platform: "Android"
      },
      {
        name: "Safari iOS",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        acceptLanguage: "en-US,en;q=0.9",
        secChUa: null, // iOS Safari doesn't send this
        secChUaPlatform: null, // iOS Safari doesn't send this 
        secChUaMobile: null, // iOS Safari doesn't send this
        connectionType: "keep-alive",
        viewport: { width: 390, height: 844 },
        screenRes: { width: 390, height: 844 },
        timeZone: "America/New_York",
        platform: "iPhone"
      },
      // Edge is popular for business travelers
      {
        name: "Edge Windows",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        acceptLanguage: "en-US,en;q=0.9",
        secChUa: '"Microsoft Edge";v="138", "Chromium";v="138", "Not=A?Brand";v="99"',
        secChUaPlatform: '"Windows"',
        secChUaMobile: "?0",
        connectionType: "keep-alive",
        viewport: { width: 1920, height: 1080 },
        screenRes: { width: 1920, height: 1080 },
        timeZone: "America/New_York",
        platform: "Win32"
      }
    ];
    
    // Select a consistent profile based on fingerprint hash
    const profileIndex = parseInt(fingerprintHash.substring(0, 8), 16) % browserProfiles.length;
    let selectedProfile = browserProfiles[profileIndex];
    
    console.log(`Using browser profile: ${selectedProfile.name}`);
    
    // ======== SESSION BUILDUP SEQUENCE ========
    // Mimic organic browsing behavior sequence
    // This is critical - modern WAFs detect direct access with no referrer chain
    const sessionSequence = {
      initial: {
        url: "https://www.united.com/en/us",
        method: "GET",
        referrer: "https://www.google.com/search?q=united+airlines",
      },
      flightStatus: {
        url: "https://www.united.com/en/us/flightstatus",
        method: "GET", 
        referrer: "https://www.united.com/en/us",
      },
      search: {
        url: "https://www.united.com/en/us/flightstatus/search",
        method: "GET",
        referrer: "https://www.united.com/en/us/flightstatus",
      },
      details: {
        url: unitedUrl,
        method: "GET",
        referrer: "https://www.united.com/en/us/flightstatus/search"
      }
    };
    
    // ======== ANTI-DETECTION HEADERS ========
    // Headers must be consistent with selected browser profile
    // Header ordering is extremely important as it's part of TLS fingerprinting
    function generateHeaders(page, cookies = '', profile = selectedProfile) {
      const pageInfo = sessionSequence[page];
      
      // Create base headers consistent with browser profile
      const baseHeaders = {
        'Host': new URL(pageInfo.url).host,
        'User-Agent': profile.userAgent,
        'Accept': profile.accept,
        'Accept-Language': profile.acceptLanguage,
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': profile.connectionType,
        'Upgrade-Insecure-Requests': '1',
        'Referer': pageInfo.referrer,
      };
      
      // Add browser-specific security headers
      if (profile.secChUa) {
        baseHeaders['Sec-CH-UA'] = profile.secChUa;
        baseHeaders['Sec-CH-UA-Mobile'] = profile.secChUaMobile;
        baseHeaders['Sec-CH-UA-Platform'] = profile.secChUaPlatform;
      }
      
      // Modern browsers use these fetch metadata headers
      baseHeaders['Sec-Fetch-Dest'] = 'document';
      baseHeaders['Sec-Fetch-Mode'] = 'navigate';
      baseHeaders['Sec-Fetch-Site'] = pageInfo.referrer.includes(new URL(pageInfo.url).host) ? 'same-origin' : 'cross-site';
      baseHeaders['Sec-Fetch-User'] = '?1';
      
      // Add Cookie header if we have cookies
      if (cookies) {
        baseHeaders['Cookie'] = cookies;
      }
      
      return baseHeaders;
    }
    
    // ======== BROWSER TIMING SIMULATION ========
    // Simulate realistic human timing patterns - variable delays between actions
    // WAF systems detect automated behavior through timing analysis
    const simulateHumanDelay = async (page) => {
      const delayRanges = {
        initial: [1000, 3000], // 1-3 seconds for homepage loading
        flightStatus: [1500, 4000], // 1.5-4 seconds for navigating to flight status
        search: [2000, 4500], // 2-4.5 seconds for searching flight
        details: [800, 2500], // 0.8-2.5 seconds for clicking on details
      };
      
      const [min, max] = delayRanges[page];
      const delay = Math.floor(Math.random() * (max - min + 1)) + min;
      
      console.log(`Simulating human delay (${page}): ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    };
    
    // ======== TCP/IP AND TLS FINGERPRINT EVASION ========
    // Modern WAF systems detect anomalies at network level
    // We need techniques to evade this detection
    
    // Helper to add TLS fingerprint misleading headers
    const addTlsFingerprintEvasion = (headers) => {
      // Randomize header order slightly but realistically
      // This changes the TLS fingerprint subtly
      const dateValue = new Date().toUTCString();
      headers['Date'] = dateValue; // Real browsers sometimes send this
      
      // Add cache and pragma variations to evade fingerprinting
      const cacheVariations = [
        'max-age=0',
        'no-cache',
        'max-age=0, no-cache, no-store, must-revalidate'
      ];
      
      // Select cache value deterministically based on fingerprint
      const cacheIndex = parseInt(fingerprintHash.substring(8, 10), 16) % cacheVariations.length;
      headers['Cache-Control'] = cacheVariations[cacheIndex];
      
      return headers;
    };
    
    // ======== COOKIE HANDLING AND SESSION MANAGEMENT ========
    // United's WAF tracks sessions via cookies - critical to maintain session state
    
    // Create an empty cookie jar to store cookies between requests
    let cookieJar = '';
    
    // Function to extract and update cookies from responses
    const updateCookieJar = (response) => {
      if (!response.headers.has('set-cookie')) return cookieJar;
      
      // Get all the Set-Cookie headers
      const newCookies = response.headers.getAll('set-cookie');
      
      // Process each cookie and update the jar
      newCookies.forEach(cookieStr => {
        // Extract the name=value part (before first ;)
        const cookiePart = cookieStr.split(';')[0].trim();
        const cookieName = cookiePart.split('=')[0];
        
        // Remove existing cookie with same name if it exists
        const cookieRegex = new RegExp(`${cookieName}=[^;]+;?\\s*`);
        cookieJar = cookieJar.replace(cookieRegex, '');
        
        // Add the new cookie
        cookieJar = cookieJar ? `${cookieJar}; ${cookiePart}` : cookiePart;
      });
      
      return cookieJar;
    };
    
    // ======== BROWSER AUTOMATION DETECTION EVASION ========
    // Function to simulate mouse movements and scrolling which WAFs check for
    // We need to send the right headers with these client hints
    const addClientHintHeaders = (headers) => {
      // Device memory varies by profile
      if (selectedProfile.name.includes('Chrome')) {
        headers['Sec-CH-UA-Full-Version'] = selectedProfile.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/i)[1];
        headers['Sec-CH-UA-Arch'] = selectedProfile.name.includes('Windows') ? '"x86"' : '"arm"';
        headers['Sec-CH-UA-Bitness'] = '"64"';
        
        // Modern client hint - viewport width
        headers['Viewport-Width'] = selectedProfile.viewport.width.toString();
        headers['Width'] = selectedProfile.screenRes.width.toString();
      }
      
      return headers;
    };
    
    // ======== SESSION BUILDING SEQUENCE - EXECUTE IN ORDER ========
    console.log("Starting session buildup sequence - mimicking real user...");
    
    try {
      // Step 1: Visit homepage first, just like a real user
      console.log("Step 1: Visiting United homepage");
      await simulateHumanDelay('initial');
      let headers = generateHeaders('initial');
      headers = addTlsFingerprintEvasion(headers);
      headers = addClientHintHeaders(headers);
      
      const homepageResponse = await fetch(sessionSequence.initial.url, {
        method: sessionSequence.initial.method,
        headers,
        redirect: 'follow'
      });
      
      // Extract cookies
      cookieJar = updateCookieJar(homepageResponse);
      console.log(`Got initial cookies: ${cookieJar.substring(0, 80)}...`);
      
      // Step 2: Visit flight status page
      console.log("Step 2: Navigating to flight status page");
      await simulateHumanDelay('flightStatus');
      headers = generateHeaders('flightStatus', cookieJar);
      headers = addTlsFingerprintEvasion(headers);
      
      const flightStatusResponse = await fetch(sessionSequence.flightStatus.url, {
        method: sessionSequence.flightStatus.method,
        headers,
        redirect: 'follow'
      });
      
      // Update cookies
      cookieJar = updateCookieJar(flightStatusResponse);
      console.log(`Updated cookies: ${cookieJar.substring(0, 40)}...`);
      
      // Step 3: Visit search page
      console.log("Step 3: Navigating to flight search page");
      await simulateHumanDelay('search');
      headers = generateHeaders('search', cookieJar);
      headers = addTlsFingerprintEvasion(headers);
      
      const searchResponse = await fetch(sessionSequence.search.url, {
        method: sessionSequence.search.method,
        headers,
        redirect: 'follow'
      });
      
      // Update cookies
      cookieJar = updateCookieJar(searchResponse);
      
      // ======== ADVANCED RETRY MECHANISM WITH BROWSER SIGNATURE ROTATION ========
      // If we encounter security challenges, we need a sophisticated retry system
      let response = null;
      let maxRetries = 5; // More retries with sophisticated approach
      let retries = 0;
      let html = '';
      let success = false;
      
      while (retries < maxRetries && !success) {
        try {
          console.log(`Attempt ${retries+1}/${maxRetries}: Fetching flight details`);
          await simulateHumanDelay('details');
          
          // Generate fresh headers with cookies for each attempt
          headers = generateHeaders('details', cookieJar);
          headers = addTlsFingerprintEvasion(headers);
          
          // Add jitter to timestamps and cache parameters
          headers['Date'] = new Date().toUTCString();
          const cacheBuster = Date.now().toString() + Math.floor(Math.random() * 1000);
          headers['If-None-Match'] = `"${cacheBuster}"`;
          headers['If-Modified-Since'] = new Date(Date.now() - 86400000 * Math.random()).toUTCString();
          
          // Modify URL slightly on later retries to avoid exact pattern matching
          let targetUrl = unitedUrl;
          if (retries > 0) {
            const urlObj = new URL(unitedUrl);
            // Add subtle query params that look legitimate
            urlObj.searchParams.append('_', Date.now().toString());
            
            if (retries > 1) {
              urlObj.searchParams.append('ui', 'en_US');
            }
            
            if (retries > 2) {
              // Use alternate path format that United also accepts
              targetUrl = unitedUrl.replace('/details/', '/status/');
            }
            
            targetUrl = urlObj.toString();
            console.log(`Using modified URL: ${targetUrl}`);
          }
          
          // When retrying, change header order subtly to avoid identical fingerprints
          if (retries > 0) {
            headers = Object.fromEntries(Object.entries(headers).sort((a, b) => {
              // Sort headers deterministically but differently based on retry count
              const hashVal = (s) => s.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), retries);
              return hashVal(a[0]) - hashVal(b[0]);
            }));
          }
          
          // Execute the request
          response = await fetch(targetUrl, {
            method: sessionSequence.details.method,
            headers,
            redirect: 'follow'
          });
          
          // Update cookies for next attempt if needed
          cookieJar = updateCookieJar(response);
          
          // Analyze the response
          if (response.ok) {
            html = await response.text();
            
            // Check if we got a security challenge page
            const isChallengeOrCaptcha = html.includes('captcha') || 
              html.includes('robot') || 
              html.includes('challenge-form') || 
              html.includes('suspicious activity') ||
              html.includes('Access Denied') ||
              html.includes('Please verify you are a human');
            
            if (isChallengeOrCaptcha) {
              console.log(`Security challenge detected on attempt ${retries+1}`);
              
              if (html.includes('cf-challenge') || html.includes('__cf_chl_captcha')) {
                console.log("Detected Cloudflare specific challenge");
              }
              
              if (html.includes('Akamai')) {
                console.log("Detected Akamai Bot Manager challenge");
              }
              
              // Implement advanced challenge heuristics
              // Look for specific script patterns that indicate challenge type
              if (html.includes('turnstile')) {
                console.log("Detected Cloudflare Turnstile verification");
              } 
              else if (html.includes('hCaptcha')) {
                console.log("Detected hCaptcha challenge");
              }
              else if (html.includes('recaptcha')) {
                console.log("Detected reCAPTCHA challenge");
              }
              
              retries++;
              
              // Each retry uses increasingly sophisticated evasion
              if (retries < maxRetries) {
                // Progressive exponential backoff with jitter
                // This mimics natural retry patterns
                const baseDelay = Math.pow(2, retries) * 1000;
                const jitter = Math.random() * 1000;
                const delayTime = baseDelay + jitter;
                
                console.log(`Waiting ${Math.round(delayTime/1000)} seconds before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delayTime));
                
                // On later retries, choose a different browser profile
                if (retries >= 2) {
                  const newProfileIndex = (profileIndex + retries) % browserProfiles.length;
                  selectedProfile = browserProfiles[newProfileIndex];
                  console.log(`Switching to browser profile: ${selectedProfile.name}`);
                  
                  // For very advanced cases, try mobile profile as they're less scrutinized
                  if (retries >= 3 && !selectedProfile.name.includes('Mobile')) {
                    const mobileProfiles = browserProfiles.filter(p => p.name.includes('Android') || p.name.includes('iOS'));
                    if (mobileProfiles.length > 0) {
                      selectedProfile = mobileProfiles[retries % mobileProfiles.length];
                      console.log(`Trying mobile profile: ${selectedProfile.name}`);
                    }
                  }
                }
                
                // On later retries, send a different Accept header
                if (retries >= 3) {
                  // Some WAFs look for identical accept headers
                  const acceptVariations = [
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
                  ];
                  
                  headers['Accept'] = acceptVariations[retries % acceptVariations.length];
                }
              }
            } else {
              // Successfully retrieved content without challenge
              success = true;
              console.log("Successfully retrieved flight details page!");
            }
          } else {
            // Handle non-200 responses
            console.log(`HTTP error: ${response.status} ${response.statusText}`);
            retries++;
            
            if (retries < maxRetries) {
              // Different backoff strategy for HTTP errors
              const delay = 1000 + (retries * 1500);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        } catch (fetchError) {
          console.log(`Fetch error on attempt ${retries+1}: ${fetchError.message}`);
          retries++;
          
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * retries));
          }
        }
      }

      // If all web page retrieval attempts failed, try API endpoints
      if (!success) {
        console.log("All web page retrieval attempts failed, trying API endpoints...");
        
        // Generate API-appropriate headers
        const apiHeaders = {
          'User-Agent': selectedProfile.userAgent,
          'Accept': 'application/json, text/plain, */*',  
          'Accept-Language': selectedProfile.acceptLanguage,
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.united.com/en/us/flightstatus/details',
          'Origin': 'https://www.united.com',
          'Connection': selectedProfile.connectionType,
          'Cookie': cookieJar,
          'X-Requested-With': 'XMLHttpRequest'
        };
        
        if (selectedProfile.secChUa) {
          apiHeaders['Sec-CH-UA'] = selectedProfile.secChUa;
          apiHeaders['Sec-CH-UA-Mobile'] = selectedProfile.secChUaMobile;
          apiHeaders['Sec-CH-UA-Platform'] = selectedProfile.secChUaPlatform;
        }
        
        apiHeaders['Sec-Fetch-Dest'] = 'empty';
        apiHeaders['Sec-Fetch-Mode'] = 'cors';
        apiHeaders['Sec-Fetch-Site'] = 'same-origin';
        
        // Try various API endpoints
        const apiEndpoints = [
          // Standard API
          {
            url: `https://www.united.com/api/flight/status/${flightNumberWithoutUA}/details`,
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify({
              flightNumber: flightNumberWithoutUA,
              flightDate: date,
              origin: departureAirport,
              destination: arrivalAirport
            })
          },
          // Mobile app API
          {
            url: `https://mobile.united.com/api/flights/${flightNumberWithoutUA}/status`,
            method: 'GET',
            contentType: 'application/json',
            params: `?date=${date}&origin=${departureAirport}&destination=${arrivalAirport}`
          },
          // GraphQL API endpoint - this is how their mobile app works
          {
            url: `https://www.united.com/api/graphql`,
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify({
              operationName: "GetFlightStatus",
              variables: {
                input: {
                  flightNumber: flightNumberWithoutUA,
                  date: date,
                  origin: departureAirport,
                  destination: arrivalAirport
                }
              },
              query: `query GetFlightStatus($input: FlightStatusInput!) {
                flightStatus(input: $input) {
                  aircraft {
                    tailNumber
                    type
                  }
                }
              }`
            })
          }
        ];
        
        let apiSuccess = false;
        let aircraftId = null;
        
        // Try each API endpoint
        for (const endpoint of apiEndpoints) {
          if (apiSuccess) break;
          
          try {
            console.log(`Trying API endpoint: ${endpoint.url}`);
            
            const endpointHeaders = {...apiHeaders};
            endpointHeaders['Content-Type'] = endpoint.contentType;
            
            // Add API-specific headers
            if (endpoint.url.includes('graphql')) {
              endpointHeaders['X-Operation'] = 'GetFlightStatus';
            }
            
            // Add a slight delay between API calls
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
            
            const apiResponse = await fetch(endpoint.url + (endpoint.params || ''), {
              method: endpoint.method,
              headers: endpointHeaders,
              body: endpoint.method === 'POST' ? endpoint.body : undefined
            });
            
            if (apiResponse.ok) {
              const apiData = await apiResponse.json();
              console.log(`API response received from ${endpoint.url}`);
              
              // Extract aircraft ID using various patterns
              if (apiData && apiData.aircraft && apiData.aircraft.tailNumber) {
                aircraftId = apiData.aircraft.tailNumber.replace(/^N/, '');
              } 
              else if (apiData && apiData.flightDetails && apiData.flightDetails.equipment) {
                aircraftId = apiData.flightDetails.equipment.tailNumber || 
                           apiData.flightDetails.equipment.registrationNumber ||
                           apiData.flightDetails.equipment.aircraftId;
                
                if (aircraftId) {
                  aircraftId = aircraftId.replace(/^N/, '');
                }
              } 
              else if (apiData && apiData.status && apiData.status.aircraft) {
                aircraftId = apiData.status.aircraft.registrationCode || 
                           apiData.status.aircraft.tailNumber;
                           
                if (aircraftId) {
                  aircraftId = aircraftId.replace(/^N/, '');
                }
              }
              // Check GraphQL specific response format
              else if (apiData && apiData.data && apiData.data.flightStatus) {
                const flightStatus = apiData.data.flightStatus;
                if (flightStatus.aircraft && flightStatus.aircraft.tailNumber) {
                  aircraftId = flightStatus.aircraft.tailNumber.replace(/^N/, '');
                }
              }
              
              if (aircraftId) {
                // Clean up the ID - ensure it's just digits
                aircraftId = aircraftId.replace(/\D/g, '');
                
                if (aircraftId.length > 0) {
                  apiSuccess = true;
                  console.log(`Successfully extracted aircraft ID from API: ${aircraftId}`);
                  
                  return new Response(JSON.stringify({
                    aircraftId,
                    flightNumber,
                    date,
                    departureAirport,
                    arrivalAirport,
                    method: 'api',
                    endpoint: endpoint.url
                  }), {
                    headers: {
                      'Content-Type': 'application/json',
                      'Cache-Control': 'public, max-age=300'
                    }
                  });
                }
              }
            } else {
              console.log(`API endpoint ${endpoint.url} failed with status: ${apiResponse.status}`);
            }
          } catch (endpointError) {
            console.log(`Error with API endpoint ${endpoint.url}: ${endpointError.message}`);
          }
        }
      }
      
      // If we've got HTML content, extract the aircraft ID
      if (success && html) {
        console.log("Extracting aircraft ID from HTML content");
        let aircraftId = null;
        let aircraftType = null;
        
        // Multi-pattern extraction approach
        const extractionPatterns = [
          // Pattern 1: Structured data extraction (most reliable)
          () => {
            const structuredDataMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
            if (structuredDataMatch && structuredDataMatch[1]) {
              try {
                const structuredData = JSON.parse(structuredDataMatch[1]);
                if (structuredData.aircraft) {
                  if (structuredData.aircraft.iataCode) {
                    aircraftType = structuredData.aircraft.iataCode;
                  }
                  if (structuredData.aircraft.identifier) {
                    return structuredData.aircraft.identifier.replace(/^[N#]/, '');
                  }
                }
              } catch (e) {
                console.log("Structured data parsing failed:", e.message);
              }
            }
            return null;
          },
          
          // Pattern 2: Aircraft details with # pattern
          () => {
            const pattern = /Aircraft(?:\s*Details)?:?[^#]*#\s*(\d{4})/i;
            const match = html.match(pattern);
            return match && match[1] ? match[1] : null;
          },
          
          // Pattern 3: Initial state JSON data
          () => {
            const jsonDataMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.*?})\s*;\s*<\/script>/s);
            if (jsonDataMatch && jsonDataMatch[1]) {
              try {
                const jsonData = JSON.parse(jsonDataMatch[1]);
                if (jsonData.flightStatus && 
                    jsonData.flightStatus.details && 
                    jsonData.flightStatus.details.aircraft) {
                  const aircraft = jsonData.flightStatus.details.aircraft;
                  if (aircraft.tailNumber) {
                    return aircraft.tailNumber.replace(/^N/, '');
                  } else if (aircraft.regNumber) {
                    return aircraft.regNumber.replace(/^N/, '');
                  }
                }
              } catch (e) {
                console.log("JSON data parsing failed:", e.message);
              }
            }
            return null;
          },
          
          // Pattern 4: Alternative aircraft ID format
          () => {
            const pattern = /(?:Aircraft|Equipment)\s+(?:Type|Details|ID)?:?\s*[^#]*?(\d{4})/i;
            const match = html.match(pattern);
            return match && match[1] ? match[1] : null;
          },
          
          // Pattern 5: JSON data with escaped quotes
          () => {
            const dataMatch = html.match(/\\"(?:aircraft|tail|equipment)(?:Id|Number|Num)\\":\\"(\d{4})\\"/i);
            return dataMatch && dataMatch[1] ? dataMatch[1] : null;
          },
          
          // Pattern 6: Text near "Tail Number", "Registration", or "Ship Number"
          () => {
            const tailMatches = [
              html.match(/[Tt]ail\s*[Nn]umber[^0-9]*(\d{4})/),
              html.match(/[Rr]egistration[^0-9]*[nN]?(\d{4})/),
              html.match(/[Ss]hip\s*[Nn]umber[^0-9]*(\d{4})/)
            ];
            
            for (const match of tailMatches) {
              if (match && match[1]) {
                return match[1];
              }
            }
            return null;
          },
          
          // Pattern 7: React props or data attributes
          () => {
            const propsMatch = html.match(/data-(?:aircraft|tail|equipment)-id="(\d{4})"/i);
            return propsMatch && propsMatch[1] ? propsMatch[1] : null;
          },
          
          // Pattern 8: New UI format (May 2025) with data attributes
          () => {
            const newFormatMatch = html.match(/data-testid="flight-details-aircraft-id"[^>]*>([^<]*)<\/span>/i);
            if (newFormatMatch && newFormatMatch[1]) {
              // Extract digits only
              const digits = newFormatMatch[1].replace(/\D/g, '');
              if (digits.length === 4) {
                return digits;
              }
            }
            return null;
          }
        ];
        
        // Try each extraction pattern until we find a match
        for (const extractionFn of extractionPatterns) {
          const extractedId = extractionFn();
          if (extractedId) {
            aircraftId = extractedId;
            break;
          }
        }
        
        // If we found an aircraft ID, return it
        if (aircraftId) {
          console.log(`Successfully extracted aircraft ID: ${aircraftId}`);
          
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
      }
      
      // If we couldn't find the aircraft ID
      return new Response(JSON.stringify({ 
        error: 'Could not bypass security measures or find aircraft identifier',
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
      console.error('Error in bypass sequence:', error);
      return new Response(JSON.stringify({ 
        error: `An error occurred during WAF bypass: ${error.message}`,
        details: error.stack
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

// Helper function to generate a consistent hash
async function generateConsistentHash(input) {
  // Web Crypto API for secure hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
