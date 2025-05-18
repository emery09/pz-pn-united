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

    function findFlight() {
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

        // Construct URL based on whether flight number is provided
        let unitedUrl;
        if (flightNumber) {
            const flightNumberWithoutUA = flightNumber.substring(2);
            unitedUrl = `https://www.united.com/en/us/flightstatus/details/${flightNumberWithoutUA}/${date}/${departureAirport}/${arrivalAirport}/UA`;
        } else {
            unitedUrl = `https://www.united.com/en/us/flightstatus/results/route/${date}/${departureAirport}/${arrivalAirport}/UA`;
        }
        
        window.open(unitedUrl, '_blank');
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

        loadingDiv.classList.remove('hidden');
        resultsDiv.innerHTML = '';

        try {
            const response = await fetch('/api/check-interior', {
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
            
            // Show the returned message with styling
            let html = '';
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
            
            if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                // Only use the first result instead of mapping through all results
                const result = data.results[0]; // Only use the first result
                const type = fleetMap[result.fleetType] || result.fleetType;
                const id = result.tail || aircraftId;
                const reg = result.reg || '';
                const regLink = reg ? `<a href="https://www.flightradar24.com/data/aircraft/${reg}#" target="_blank">${reg}</a>` : '';
                if (result.hasNextInterior) {
                    html = `<div class="interior-result green-border">
                        <div class="interior-main">✨ Your aircraft has the new interior ✨</div>
                        <div class="interior-details">${type} &middot; ID: ${id} &middot; Registration: ${regLink}</div>
                    </div>`;
                } else {
                    html = `<div class="interior-result green-border">
                        <div class="interior-main">Your aircraft has the standard interior</div>
                        <div class="interior-details">${type} &middot; ID: ${id} &middot; Registration: ${regLink}</div>
                    </div>`;
                }
            } else if (data.hasNextInterior !== undefined) {
                const type = data.fleetType ? (fleetMap[data.fleetType] || data.fleetType) : '';
                const id = data.tail || aircraftId;
                const reg = data.reg || ''; 
                const regLink = reg ? `<a href="https://www.flightradar24.com/data/aircraft/${reg}" target="_blank">${reg}</a>` : '';
                if (data.hasNextInterior) {
                    html = `<div class="interior-result green-border">
                        <div class="interior-main">✨ Your aircraft has the new interior ✨</div>
                        <div class="interior-details">${type} &middot; ID: ${id} &middot; Registration: ${regLink}</div>
                    </div>`;
                } else {
                    html = `<div class="interior-result green-border">
                        <div class="interior-main">Your aircraft has the standard interior</div>
                        <div class="interior-details">${type} &middot; ID: ${id} &middot; Registration: ${regLink}</div>
                    </div>`;
                }
            } else {
                html = `<div class="interior-result green-border">${data.message}</div>`;
            }
            resultsDiv.innerHTML = `<div class="search-results">${html}</div>`;
            
            // After successful search, save it to recent searches
            saveRecentSearch('interiors', { aircraftId });
            
        } catch (error) {
            showError(error.message || 'Error checking aircraft interior');
        } finally {
            loadingDiv.classList.add('hidden');
        }
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

    function showError(message) {
        resultsDiv.innerHTML = `<p class="error-message">${message}</p>`;
    }
});