// server.js - Main server file with improved error handling

const express = require('express');
const path = require('path');
const cors = require('cors');
const getSheetData = require('./getSheetData');

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve index.html at the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint to check aircraft interior
app.post('/api/check-interior', async (req, res) => {
    console.log('Received check-interior request:', req.body);
    
    const { aircraftId } = req.body;
    if (!aircraftId) {
        console.log('Missing aircraftId in request');
        return res.status(400).json({ error: 'Missing aircraftId' });
    }
    
    try {
        // Google Sheet ID - hardcoded for simplicity
        const SHEET_ID = '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';
        
        // Get data directly from the sheets using getSheetData
        const sheetData = await getSheetData(SHEET_ID, aircraftId);
        console.log('Sheet data retrieved:', sheetData);
        
        // Process the results
        if (!sheetData.results || sheetData.results.length === 0) {
            return res.json({
                message: `No information found for aircraft ID ${aircraftId}.`,
                results: [],
                hasNextInterior: null,
                timestamp: sheetData.timestamp
            });
        }
        
        // Use the first match for summary fields
        const match = sheetData.results[0];
        const response = {
            message: match.hasNextInterior
                ? `Your ${match.fleetType} has the new interior.`
                : `Your ${match.fleetType} has the standard interior.`,
            results: sheetData.results,
            hasNextInterior: match.hasNextInterior,
            fleetType: match.fleetType,
            reg: match.reg, // Include registration in response
            timestamp: sheetData.timestamp
        };
        
        console.log('Sending response:', response);
        res.json(response);
        
    } catch (error) {
        console.error('Error in /api/check-interior:', error);
        res.status(500).json({ 
            error: `Error checking aircraft interior: ${error.message}`,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});