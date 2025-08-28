const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Path to mvdct CLI
const MVDCT_PATH = '/home/kim/Downloads/Microchip_VelocityDRIVE_CT-CLI-linux-2025.07.12/mvdct';

// Global state
let currentDevice = null;

// Helper function to execute mvdct commands
function executeMvdct(args) {
    return new Promise((resolve, reject) => {
        const process = spawn(MVDCT_PATH, args, { cwd: path.dirname(MVDCT_PATH) });
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(stderr || stdout));
            }
        });
    });
}

// Routes

// List available serial ports
app.get('/api/ports', async (req, res) => {
    try {
        const output = await executeMvdct(['list']);
        const ports = output.split('\n').filter(line => line.trim());
        res.json(ports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Connect to device
app.post('/api/connect', (req, res) => {
    const { port } = req.body;
    if (!port) {
        return res.status(400).json({ error: 'Port is required' });
    }
    currentDevice = port;
    res.json({ success: true, device: port });
});

// Get device information
app.get('/api/device/info', async (req, res) => {
    if (!currentDevice) {
        return res.status(400).json({ error: 'No device connected' });
    }

    try {
        const [platform, type] = await Promise.all([
            executeMvdct(['device', currentDevice, 'get', '/ietf-system:system-state/platform']),
            executeMvdct(['device', currentDevice, 'type'])
        ]);

        res.json({
            platform: platform.trim(),
            type: type.trim(),
            device: currentDevice
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// YANG Get operation
app.post('/api/yang/get', async (req, res) => {
    const { path } = req.body;
    if (!currentDevice) {
        return res.status(400).json({ error: 'No device connected' });
    }
    if (!path) {
        return res.status(400).json({ error: 'Path is required' });
    }

    try {
        const output = await executeMvdct(['device', currentDevice, 'get', path]);
        res.json({ result: output.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// YANG Set operation
app.post('/api/yang/set', async (req, res) => {
    const { path, value } = req.body;
    if (!currentDevice) {
        return res.status(400).json({ error: 'No device connected' });
    }
    if (!path || !value) {
        return res.status(400).json({ error: 'Path and value are required' });
    }

    try {
        const output = await executeMvdct(['device', currentDevice, 'set', path, value]);
        res.json({ success: true, result: output.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// YANG Delete operation
app.post('/api/yang/delete', async (req, res) => {
    const { path } = req.body;
    if (!currentDevice) {
        return res.status(400).json({ error: 'No device connected' });
    }
    if (!path) {
        return res.status(400).json({ error: 'Path is required' });
    }

    try {
        const output = await executeMvdct(['device', currentDevice, 'delete', path]);
        res.json({ success: true, result: output.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// YANG RPC/Action call
app.post('/api/yang/rpc', async (req, res) => {
    const { path, params } = req.body;
    if (!currentDevice) {
        return res.status(400).json({ error: 'No device connected' });
    }
    if (!path) {
        return res.status(400).json({ error: 'Path is required' });
    }

    try {
        const paramsStr = params ? JSON.stringify(params) : '{}';
        const output = await executeMvdct(['device', currentDevice, 'call', path, paramsStr]);
        res.json({ result: output.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CoAP operations
app.post('/api/coap', async (req, res) => {
    const { method, path, payload } = req.body;
    if (!currentDevice) {
        return res.status(400).json({ error: 'No device connected' });
    }
    if (!method || !path) {
        return res.status(400).json({ error: 'Method and path are required' });
    }

    try {
        const args = ['device', currentDevice, 'coap'];
        // Add CoAP specific arguments based on method
        // This will need to be adjusted based on actual mvdct CoAP syntax
        const output = await executeMvdct(args);
        res.json({ result: output.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get firmware version
app.get('/api/firmware/version', async (req, res) => {
    if (!currentDevice) {
        return res.status(400).json({ error: 'No device connected' });
    }

    try {
        const output = await executeMvdct(['device', currentDevice, 'firmware']);
        res.json({ version: output.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update firmware
app.post('/api/firmware/update', upload.single('firmware'), async (req, res) => {
    if (!currentDevice) {
        return res.status(400).json({ error: 'No device connected' });
    }
    if (!req.file) {
        return res.status(400).json({ error: 'Firmware file is required' });
    }

    try {
        const firmwarePath = req.file.path;
        const output = await executeMvdct(['device', currentDevice, 'firmware', firmwarePath]);
        
        // Clean up uploaded file
        fs.unlinkSync(firmwarePath);
        
        res.json({ success: true, result: output.trim() });
    } catch (error) {
        // Clean up uploaded file on error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`VelocityDRIVE API Server running on port ${PORT}`);
    console.log(`Web interface available at http://localhost:${PORT}`);
});