const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(__dirname));

// Serve index.html at the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

const SHEET_ID = '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';

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

    async function findFlight() {
        const flightNumber = flightNumberInput.value.trim();
        const departureAirport = departureAirportInput.value.trim();
        const arrivalAirport = arrivalAirportInput.value.trim();
        const date = dateInput.value;

        if (!departureAirport || !arrivalAirport || !date) {
            showError('Please fill in all required flight details');
            return;
        }

        if (departureAirport.length !== 3 || arrivalAirport.length !== 3) {
            showError('Please enter valid 3-letter airport codes');
            return;
        }

        if (!flightNumber) {
            // No flight number specified, use route-based URL
            const unitedUrl = `https://www.united.com/en/us/flightstatus/results/route/${departureAirport}/${arrivalAirport}/UA`;
            window.open(unitedUrl, '_blank');
            return;
        }

        const flightNumberWithoutUA = flightNumber.substring(2);
        const formattedDate = date;
        // Open United flight status URL in a new window
        const unitedUrl = `https://www.united.com/en/us/flightstatus/details/${flightNumberWithoutUA}/${formattedDate}/${departureAirport}/${arrivalAirport}/UA`;
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

        // Add your aircraft interior checking logic here
        // For now, just show a placeholder message
        resultsDiv.innerHTML = `<p>Checking interior configuration for aircraft ${aircraftId}...</p>`;
    }

    function showError(message) {
        resultsDiv.innerHTML = `<p class="error-message">${message}</p>`;
    }
});