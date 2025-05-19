document.addEventListener('DOMContentLoaded', () => {
    const flightNumberInput = document.getElementById('flightNumber');
    const departureAirportInput = document.getElementById('departureAirport');
    const arrivalAirportInput = document.getElementById('arrivalAirport');
    const dateInput = document.getElementById('date');
    const aircraftIdInput = document.getElementById('aircraftId');
    const findFlightButton = document.getElementById('findFlightButton');
    const checkInteriorButton = document.getElementById('checkInteriorButton');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    
    // Cache for API responses to minimize server requests
    const apiCache = {
        get: (key) => {
            try {
                const cachedItem = localStorage.getItem(`api_cache_${key}`);
                if (!cachedItem) return null;
                
                const { data, expiry } = JSON.parse(cachedItem);
                if (Date.now() > expiry) {
                    localStorage.removeItem(`api_cache_${key}`);
                    return null;
                }
                return data;
            } catch (e) {
                console.warn('Cache retrieval error:', e);
                return null;
            }
        },
        set: (key, data, ttlMinutes = 30) => {
            try {
                const expiry = Date.now() + (ttlMinutes * 60 * 1000);
                localStorage.setItem(`api_cache_${key}`, JSON.stringify({ data, expiry }));
            } catch (e) {
                console.warn('Cache storage error:', e);
            }
        }
    };

    // Set minimum date to today and maximum to 2 days in the future
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 2);
    
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
    dateInput.value = today.toISOString().split('T')[0];

    // Flight number input formatting
    flightNumberInput.addEventListener('input', (e) => {
        let value = e.target.value.toUpperCase();
        if (!value.startsWith('UA')) {
            value = 'UA' + value.replace(/[^0-9]/g, '');
        } else {
            value = 'UA' + value.substring(2).replace(/[^0-9]/g, '');
        }
        if (value.length > 6) {
            value = value.slice(0, 6);
        }
        e.target.value = value;
    });

    // Airport code formatting
    [departureAirportInput, arrivalAirportInput].forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
        });
    });

    // Aircraft ID formatting - allow 1-4 digits, preserve leading zeros
    aircraftIdInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length > 4) value = value.slice(0, 4);
        e.target.value = value;
    });

    findFlightButton.addEventListener('click', findFlight);
    checkInteriorButton.addEventListener('click', checkInterior);

    // Show error message with possible solutions
    function showError(message, suggestions = []) {
        let errorHtml = `<div class="error-message">${message}</div>`;
        
        if (suggestions.length > 0) {
            errorHtml += '<div class="error-suggestions"><h4>Suggestions:</h4><ul>';
            suggestions.forEach(suggestion => {
                errorHtml += `<li>${suggestion}</li>`;
            });
            errorHtml += '</ul></div>';
        }
        
        resultsDiv.innerHTML = errorHtml;
        loadingDiv.classList.add('hidden');
    }

    // Show loading state with custom message
    function showLoading(message = 'Processing...') {
        loadingDiv.querySelector('p').textContent = message;
        loadingDiv.classList.remove('hidden');
        resultsDiv.innerHTML = '';
    }

    // Retry mechanism for API calls
    async function fetchWithRetry(url, options, maxRetries = 2) {
        let retries = 0;
        
        while (retries <= maxRetries) {
            try {
                const response = await fetch(url, options);
                
                // If we get a 429 (Too Many Requests) or 503 (Service Unavailable), retry
                if (response.status === 429 || response.status === 503) {
                    retries++;
                    if (retries > maxRetries) break;
                    
                    // Exponential backoff with jitter
                    const delay = Math.min(Math.pow(2, retries) * 500 + Math.random() * 300, 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                return response;
            } catch (error) {
                retries++;
                if (retries > maxRetries) throw error;
                
                // Exponential backoff for connection errors
                const delay = Math.min(Math.pow(2, retries) * 500, 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new Error('Maximum retries reached');
    }

    async function findFlight() {
        const flightNumber = flightNumberInput.value.trim();
        const departureAirport = departureAirportInput.value.trim();
        const arrivalAirport = arrivalAirportInput.value.trim();
        const date = dateInput.value;

        if (!departureAirport || !arrivalAirport || !date) {
            showError('Please fill in departure airport, arrival airport, and date');
            return;
        }

        if (departureAirport.length !== 3 || arrivalAirport.length !== 3) {
            showError('Please enter valid 3-letter airport codes');
            return;
        }

        if (!flightNumber || flightNumber.length <= 2) {
            showError('Please enter a valid flight number');
            return;
        }

        // Show loading state
        showLoading('Fetching aircraft identifier...');
        
        // Generate cache key
        const cacheKey = `flight_${flightNumber}_${date}_${departureAirport}_${arrivalAirport}`;
        
        // Check cache first
        const cachedData = apiCache.get(cacheKey);
        if (cachedData) {
            console.log('Using cached aircraft data');
            
            // Auto-fill the aircraft ID input
            aircraftIdInput.value = cachedData.aircraftId;
            
            // Automatically check the interior
            checkInterior();
            
            // Show success message
            resultsDiv.innerHTML = `
                <div class="success-message">
                    <div>Found aircraft ID: ${cachedData.aircraftId}</div>
                    <div class="cached-info">(Cached data)</div>
                </div>`;
            
            loadingDiv.classList.add('hidden');
            return;
        }

        try {
            // Call our API endpoint to get the aircraft ID
            const response = await fetchWithRetry('/api/get-aircraft-id', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    flightNumber, 
                    date, 
                    departureAirport, 
                    arrivalAirport 
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                // Handle specific error cases
                if (response.status === 429) {
                    throw new Error('United.com is temporarily blocking our requests. Please try checking manually or enter the aircraft ID directly.');
                } else if (response.status === 403) {
                    throw new Error('United.com has detected our automated system. Please try checking manually.');
                } else {
                    throw new Error(data.error || 'Failed to retrieve aircraft identifier');
                }
            }

            if (data.aircraftId) {
                // Save to cache for future use (valid for 30 minutes)
                apiCache.set(cacheKey, data, 30);
                
                // Auto-fill the aircraft ID input
                aircraftIdInput.value = data.aircraftId;
                
                // Automatically check the interior
                checkInterior();
                
                // Show success message
                resultsDiv.innerHTML = `<div class="success-message">Found aircraft ID: ${data.aircraftId}</div>`;
                
                // After successful search, save it to recent searches
                saveRecentSearch('flights', { 
                    flightNumber, 
                    fromAirport: departureAirport, 
                    toAirport: arrivalAirport, 
                    date 
                });
            } else {
                throw new Error('Aircraft identifier not found');
            }
        } catch (error) {
            console.error('Error fetching aircraft ID:', error);
            
            // Construct URL for manual checking
            const flightNumberWithoutUA = flightNumber.replace(/^UA/i, '');
            const unitedUrl = `https://www.united.com/en/us/flightstatus/details/${flightNumberWithoutUA}/${date}/${departureAirport}/${arrivalAirport}/UA`;
            
            // Provide helpful instructions for manual checking
            const manualInstructions = `
                <div class="manual-instructions">
                    <h3>How to manually find your aircraft ID:</h3>
                    <ol>
                        <li>Click on "Check on United's website" below</li>
                        <li>Look for "Aircraft Details" on the flight status page</li>
                        <li>Find the number after the # symbol (e.g., #1234)</li>
                        <li>Enter that number in the "Aircraft ID" field above</li>
                        <li>Click "Check Interior" button</li>
                    </ol>
                </div>
            `;
            
            // Show error with suggestions and manual instructions
            showError(`${error.message}`, [
                `<a href="${unitedUrl}" target="_blank" class="manual-link">Check on United's website</a>`,
                'Enter the aircraft ID manually when you find it'
            ]);
            
            // Add the manual instructions after the error message
            resultsDiv.innerHTML += manualInstructions;
        } finally {
            loadingDiv.classList.add('hidden');
        }
    }

    async function checkInterior() {
        const aircraftId = aircraftIdInput.value.trim();

        if (!aircraftId) {
            showError('Please enter the aircraft identifier');
            return;
        }

        // Accept any digit sequence between 1-4 digits (preserve leading zeros)
        if (!/^\d{1,4}$/.test(aircraftId)) {
            showError('Please enter a valid aircraft identifier (1-4 digits)');
            return;
        }
        
        // Generate cache key for interior data
        const interiorCacheKey = `interior_${aircraftId}`;
        
        // Check cache first - aircraft interior data can be cached longer (2 hours)
        const cachedInteriorData = apiCache.get(interiorCacheKey);
        if (cachedInteriorData) {
            console.log('Using cached interior data');
            displayInteriorResults(cachedInteriorData, true);
            return;
        }

        showLoading('Checking aircraft interior...');

        try {
            const response = await fetchWithRetry('/api/check-interior', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ aircraftId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to check interior');
            }

            const data = await response.json();
            console.log("Response data:", data); // Debug log
            
            // Cache the interior data (valid for 2 hours)
            apiCache.set(interiorCacheKey, data, 120);
            
            // Display the results
            displayInteriorResults(data);
            
            // After successful search, save it to recent searches
            saveRecentSearch('interiors', { aircraftId });
            
        } catch (error) {
            showError(error.message || 'Error checking aircraft interior', [
                'Try refreshing the page',
                'Make sure you entered the correct aircraft ID'
            ]);
        } finally {
            loadingDiv.classList.add('hidden');
        }
    }
    
    // Helper function to display interior results
    function displayInteriorResults(data, isCached = false) {
        // Aircraft type mapping
        const fleetMap = {
            '19': 'Airbus A319',
            '20': 'Airbus A320',
            '21': 'Airbus A321neo',
            '3G': 'Boeing 737-700',
            '38': 'Boeing 737-800',
            'M8': 'Boeing 737 MAX 8',
            '39': 'Boeing 737-900',
            'M9': 'Boeing 737 MAX 9',
            '52': 'Boeing 757-200',
            '53': 'Boeing 757-300',
            '63/4': 'Boeing 767',
            '72': 'Boeing 777-200',
            '73': 'Boeing 777-300',
            '88/X': 'Boeing 787 Dreamliner',
            '89': 'Boeing 787-9 Dreamliner'
        };
        
        let html = '';
        
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            // Only use the first result
            const result = data.results[0];
            const type = fleetMap[result.fleetType] || result.fleetType;
            const id = result.tail || aircraftIdInput.value.trim();
            const reg = result.reg || '';
            const regLink = reg ? `<a href="https://www.flightradar24.com/data/aircraft/${reg}#" target="_blank">${reg}</a>` : '';
            
            const cachedLabel = isCached ? '<span class="cached-label">(Cached)</span>' : '';
            
            if (result.hasNextInterior) {
                html = `<div class="interior-result green-border">
                    <div class="interior-main">✨ Your aircraft has the new interior ✨ ${cachedLabel}</div>
                    <div class="interior-details">${type} &middot; ID: ${id} &middot; Registration: ${regLink}</div>
                </div>`;
            } else {
                html = `<div class="interior-result standard-border">
                    <div class="interior-main">Your aircraft has the standard interior ${cachedLabel}</div>
                    <div class="interior-details">${type} &middot; ID: ${id} &middot; Registration: ${regLink}</div>
                </div>`;
            }
        } else if (data.hasNextInterior !== undefined) {
            const type = data.fleetType ? (fleetMap[data.fleetType] || data.fleetType) : '';
            const id = data.tail || aircraftIdInput.value.trim();
            const reg = data.reg || ''; 
            const regLink = reg ? `<a href="https://www.flightradar24.com/data/aircraft/${reg}" target="_blank">${reg}</a>` : '';
            
            const cachedLabel = isCached ? '<span class="cached-label">(Cached)</span>' : '';
            
            if (data.hasNextInterior) {
                html = `<div class="interior-result green-border">
                    <div class="interior-main">✨ Your aircraft has the new interior ✨ ${cachedLabel}</div>
                    <div class="interior-details">${type} &middot; ID: ${id} &middot; Registration: ${regLink}</div>
                </div>`;
            } else {
                html = `<div class="interior-result standard-border">
                    <div class="interior-main">Your aircraft has the standard interior ${cachedLabel}</div>
                    <div class="interior-details">${type} &middot; ID: ${id} &middot; Registration: ${regLink}</div>
                </div>`;
            }
        } else {
            html = `<div class="interior-result">${data.message || 'No data available for this aircraft'}</div>`;
        }
        
        resultsDiv.innerHTML = `<div class="search-results">${html}</div>`;
        loadingDiv.classList.add('hidden');
    }

    // Function to save recent searches
    function saveRecentSearch(type, data) {
        try {
            // Get existing searches from localStorage
            const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '{}');
            
            // Initialize type array if it doesn't exist
            if (!recentSearches[type]) {
                recentSearches[type] = [];
            }
            
            // Add new search to beginning of array, remove duplicates
            const existingIndex = recentSearches[type].findIndex(item => 
                JSON.stringify(item) === JSON.stringify(data)
            );
            
            if (existingIndex > -1) {
                recentSearches[type].splice(existingIndex, 1);
            }
            
            recentSearches[type].unshift(data);
            
            // Keep only the latest 5 searches
            recentSearches[type] = recentSearches[type].slice(0, 5);
            
            // Save back to localStorage
            localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
            
            // Update the UI to show recent searches
            updateRecentSearchesUI();
        } catch (error) {
            console.error('Error saving recent search:', error);
        }
    }

    // Function to update the recent searches UI
    function updateRecentSearchesUI() {
        try {
            const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '{}');
            const recentFlightSearchesDiv = document.getElementById('recentFlightSearches');
            const recentInteriorSearchesDiv = document.getElementById('recentInteriorSearches');
            
            if (recentFlightSearchesDiv && recentSearches.flights) {
                let flightHTML = '<h4>Recent Flight Searches</h4><ul>';
                recentSearches.flights.forEach(flight => {
                    flightHTML += `<li><a href="#" class="recent-flight" data-flight="${flight.flightNumber}" data-from="${flight.fromAirport}" data-to="${flight.toAirport}" data-date="${flight.date}">${flight.flightNumber}: ${flight.fromAirport} → ${flight.toAirport} (${flight.date})</a></li>`;
                });
                flightHTML += '</ul>';
                recentFlightSearchesDiv.innerHTML = flightHTML;
                
                // Add event listeners to recent flight searches
                document.querySelectorAll('.recent-flight').forEach(el => {
                    el.addEventListener('click', function(e) {
                        e.preventDefault();
                        const { flight, from, to, date } = this.dataset;
                        document.getElementById('flightNumber').value = flight;
                        document.getElementById('departureAirport').value = from;
                        document.getElementById('arrivalAirport').value = to;
                        document.getElementById('date').value = date;
                    });
                });
            }
            
            if (recentInteriorSearchesDiv && recentSearches.interiors) {
                let interiorHTML = '<h4>Recent Interior Checks</h4><ul>';
                recentSearches.interiors.forEach(aircraft => {
                    interiorHTML += `<li><a href="#" class="recent-interior" data-aircraft="${aircraft.aircraftId}">${aircraft.aircraftId}</a></li>`;
                });
                interiorHTML += '</ul>';
                recentInteriorSearchesDiv.innerHTML = interiorHTML;
                
                // Add event listeners to recent interior checks
                document.querySelectorAll('.recent-interior').forEach(el => {
                    el.addEventListener('click', function(e) {
                        e.preventDefault();
                        const { aircraft } = this.dataset;
                        document.getElementById('aircraftId').value = aircraft;
                        // Call the checkInterior function directly instead of trying to submit a non-existent form
                        checkInterior();
                    });
                });
            }
        } catch (error) {
            console.error('Error updating recent searches UI:', error);
        }
    }
    
    // Initialize the UI by showing recent searches
    updateRecentSearchesUI();
});