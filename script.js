// Global state
let isConnected = false;
let currentDevice = null;
let apiUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://hwkim3330.github.io/mic/api';

// Console logging
function log(message, type = 'info') {
    const console = document.getElementById('console');
    const entry = document.createElement('div');
    entry.className = `console-entry ${type}`;
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    console.appendChild(entry);
    console.scrollTop = console.scrollHeight;
}

// Update connection status
function updateConnectionStatus(connected) {
    isConnected = connected;
    const status = document.getElementById('connectionStatus');
    const deviceName = document.getElementById('deviceName');
    
    if (connected) {
        status.textContent = 'Connected';
        status.className = 'status-value connected';
    } else {
        status.textContent = 'Disconnected';
        status.className = 'status-value disconnected';
        deviceName.textContent = 'Not selected';
    }
    
    // Enable/disable buttons based on connection
    const buttons = [
        'refreshInfoBtn', 'yangGetBtn', 'yangSetBtn', 
        'yangDeleteBtn', 'yangRpcBtn', 'coapSendBtn',
        'getFirmwareBtn', 'updateFirmwareBtn'
    ];
    
    buttons.forEach(id => {
        document.getElementById(id).disabled = !connected;
    });
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Remove active class from all tabs and panes
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding pane
        btn.classList.add('active');
        document.getElementById(tab).classList.add('active');
    });
});

// Connect to device
document.getElementById('connectBtn').addEventListener('click', async () => {
    const port = document.getElementById('devicePort').value;
    
    if (!port) {
        log('Please enter a serial port', 'error');
        return;
    }
    
    log(`Connecting to ${port}...`);
    
    try {
        const response = await fetch(`${apiUrl}/connect`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ port })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentDevice = port;
            document.getElementById('deviceName').textContent = port;
            updateConnectionStatus(true);
            log(`Connected to ${port}`, 'info');
            
            // Get initial device info
            getDeviceInfo();
        } else {
            throw new Error('Connection failed');
        }
    } catch (error) {
        log(`Failed to connect: ${error.message}`, 'error');
        updateConnectionStatus(false);
    }
});

// List available ports
document.getElementById('listPortsBtn').addEventListener('click', async () => {
    log('Listing available ports...');
    
    try {
        const response = await fetch(`${apiUrl}/ports`);
        const ports = await response.json();
        
        const portsList = document.getElementById('portsList');
        portsList.innerHTML = '';
        
        if (ports.length === 0) {
            portsList.innerHTML = '<p>No ports available</p>';
        } else {
            ports.forEach(port => {
                const item = document.createElement('div');
                item.className = 'port-item';
                item.textContent = port;
                item.onclick = () => {
                    document.getElementById('devicePort').value = port;
                };
                portsList.appendChild(item);
            });
        }
        
        log(`Found ${ports.length} ports`, 'info');
    } catch (error) {
        log(`Failed to list ports: ${error.message}`, 'error');
    }
});

// Get device information
async function getDeviceInfo() {
    try {
        const response = await fetch(`${apiUrl}/device/info`);
        const info = await response.json();
        
        document.getElementById('platformInfo').textContent = info.platform || '--';
        document.getElementById('firmwareInfo').textContent = info.firmware || '--';
        document.getElementById('deviceTypeInfo').textContent = info.type || '--';
        
        log('Device information retrieved', 'info');
    } catch (error) {
        log(`Failed to get device info: ${error.message}`, 'error');
    }
}

document.getElementById('refreshInfoBtn').addEventListener('click', getDeviceInfo);

// YANG Get operation
document.getElementById('yangGetBtn').addEventListener('click', async () => {
    const path = document.getElementById('yangGetId').value;
    
    if (!path) {
        log('Please enter a YANG path', 'error');
        return;
    }
    
    log(`Getting YANG data: ${path}`);
    
    try {
        const response = await fetch(`${apiUrl}/yang/get`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ path })
        });
        
        const data = await response.json();
        log(`Response: ${JSON.stringify(data, null, 2)}`, 'info');
    } catch (error) {
        log(`Failed to get data: ${error.message}`, 'error');
    }
});

// YANG Set operation
document.getElementById('yangSetBtn').addEventListener('click', async () => {
    const path = document.getElementById('yangSetId').value;
    const value = document.getElementById('yangSetValue').value;
    
    if (!path || !value) {
        log('Please enter both path and value', 'error');
        return;
    }
    
    log(`Setting YANG data: ${path} = ${value}`);
    
    try {
        const response = await fetch(`${apiUrl}/yang/set`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ path, value })
        });
        
        if (response.ok) {
            log('Data set successfully', 'info');
        } else {
            throw new Error('Set operation failed');
        }
    } catch (error) {
        log(`Failed to set data: ${error.message}`, 'error');
    }
});

// YANG Delete operation
document.getElementById('yangDeleteBtn').addEventListener('click', async () => {
    const path = document.getElementById('yangDeleteId').value;
    
    if (!path) {
        log('Please enter a YANG path', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${path}?`)) {
        return;
    }
    
    log(`Deleting YANG data: ${path}`);
    
    try {
        const response = await fetch(`${apiUrl}/yang/delete`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ path })
        });
        
        if (response.ok) {
            log('Data deleted successfully', 'info');
        } else {
            throw new Error('Delete operation failed');
        }
    } catch (error) {
        log(`Failed to delete data: ${error.message}`, 'error');
    }
});

// YANG RPC/Action call
document.getElementById('yangRpcBtn').addEventListener('click', async () => {
    const path = document.getElementById('yangRpcId').value;
    const params = document.getElementById('yangRpcValue').value;
    
    if (!path) {
        log('Please enter an RPC/Action path', 'error');
        return;
    }
    
    log(`Calling RPC: ${path}`);
    
    try {
        const response = await fetch(`${apiUrl}/yang/rpc`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ path, params: params ? JSON.parse(params) : {} })
        });
        
        const result = await response.json();
        log(`RPC Result: ${JSON.stringify(result, null, 2)}`, 'info');
    } catch (error) {
        log(`Failed to call RPC: ${error.message}`, 'error');
    }
});

// CoAP operations
document.getElementById('coapSendBtn').addEventListener('click', async () => {
    const method = document.getElementById('coapMethod').value;
    const path = document.getElementById('coapPath').value;
    const payload = document.getElementById('coapPayload').value;
    
    if (!path) {
        log('Please enter a CoAP path', 'error');
        return;
    }
    
    log(`Sending CoAP ${method} to ${path}`);
    
    try {
        const response = await fetch(`${apiUrl}/coap`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                method, 
                path, 
                payload: payload ? JSON.parse(payload) : null 
            })
        });
        
        const result = await response.json();
        log(`CoAP Response: ${JSON.stringify(result, null, 2)}`, 'info');
    } catch (error) {
        log(`Failed to send CoAP: ${error.message}`, 'error');
    }
});

// Firmware operations
document.getElementById('getFirmwareBtn').addEventListener('click', async () => {
    log('Getting firmware version...');
    
    try {
        const response = await fetch(`${apiUrl}/firmware/version`);
        const data = await response.json();
        log(`Firmware version: ${data.version}`, 'info');
        document.getElementById('firmwareInfo').textContent = data.version;
    } catch (error) {
        log(`Failed to get firmware version: ${error.message}`, 'error');
    }
});

document.getElementById('updateFirmwareBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('firmwareFile');
    const file = fileInput.files[0];
    
    if (!file) {
        log('Please select a firmware file', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to update the firmware?')) {
        return;
    }
    
    log('Uploading firmware...');
    
    const formData = new FormData();
    formData.append('firmware', file);
    
    try {
        const response = await fetch(`${apiUrl}/firmware/update`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            log('Firmware update initiated', 'info');
        } else {
            throw new Error('Firmware update failed');
        }
    } catch (error) {
        log(`Failed to update firmware: ${error.message}`, 'error');
    }
});

// Clear console
document.getElementById('clearConsoleBtn').addEventListener('click', () => {
    document.getElementById('console').innerHTML = '';
    log('Console cleared', 'info');
});

// Initial setup
window.addEventListener('load', () => {
    log('VelocityDRIVE Control Panel initialized', 'info');
    updateConnectionStatus(false);
});