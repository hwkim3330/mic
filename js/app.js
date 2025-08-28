/**
 * Main Application Controller
 * VelocityDRIVE-SP Control Center
 */

class VelocityDriveApp {
    constructor() {
        this.currentPage = 'connection';
        this.isConnected = false;
        this.connectionType = null; // 'serial' or 'network'
        this.deviceInfo = {};
        this.settings = this.loadSettings();
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupWebSerial();
        this.loadPage('connection');
        this.applyTheme();
    }
    
    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.loadPage(page);
                
                // Update active state
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
        
        // Menu toggle for mobile
        const menuToggle = document.getElementById('menuToggle');
        menuToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
        
        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.add('active');
        });
        
        document.getElementById('closeSettings').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.remove('active');
        });
        
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });
        
        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
        });
    }
    
    setupWebSerial() {
        webSerial.setCallbacks({
            onConnect: (info) => {
                console.log('Serial connected:', info);
                this.updateConnectionStatus(true, 'serial');
                this.log('Connected via WebSerial', 'success');
            },
            onDisconnect: () => {
                console.log('Serial disconnected');
                this.updateConnectionStatus(false);
                this.log('Disconnected from serial port', 'warning');
            },
            onData: (data) => {
                console.log('Received data:', data);
                this.handleSerialData(data);
            },
            onError: (error) => {
                console.error('Serial error:', error);
                this.log(`Serial error: ${error.message}`, 'error');
            }
        });
    }
    
    loadPage(pageName) {
        this.currentPage = pageName;
        const container = document.getElementById('pageContainer');
        const breadcrumb = document.getElementById('breadcrumb');
        
        // Update breadcrumb
        const navItem = document.querySelector(`.nav-item[data-page="${pageName}"]`);
        if (navItem) {
            breadcrumb.textContent = navItem.querySelector('span').textContent;
        }
        
        // Load page content
        container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
        
        setTimeout(() => {
            container.innerHTML = pageTemplates.getPage(pageName, this);
            this.initializePage(pageName);
        }, 100);
    }
    
    initializePage(pageName) {
        switch (pageName) {
            case 'connection':
                this.initConnectionPage();
                break;
            case 'dashboard':
                this.initDashboard();
                break;
            case 'interfaces':
                this.initInterfacesPage();
                break;
            case 'vlan':
                this.initVlanPage();
                break;
            case 'yang':
                this.initYangBrowser();
                break;
            case 'coap':
                this.initCoapConsole();
                break;
            // Add more page initializations as needed
        }
    }
    
    initConnectionPage() {
        // WebSerial connect button
        const serialConnectBtn = document.getElementById('serialConnectBtn');
        if (serialConnectBtn) {
            if (!webSerial.isSupported()) {
                serialConnectBtn.disabled = true;
                serialConnectBtn.textContent = 'WebSerial Not Supported';
                document.getElementById('serialStatus').innerHTML = 
                    '<span class="text-danger">WebSerial API is not supported in this browser. Please use Chrome/Edge.</span>';
            } else {
                serialConnectBtn.addEventListener('click', async () => {
                    try {
                        await webSerial.connect();
                    } catch (error) {
                        this.log(`Connection failed: ${error.message}`, 'error');
                    }
                });
            }
        }
        
        // Network connect button
        const networkConnectBtn = document.getElementById('networkConnectBtn');
        if (networkConnectBtn) {
            networkConnectBtn.addEventListener('click', () => {
                this.connectNetwork();
            });
        }
        
        // Security mode change
        const securityMode = document.getElementById('securityMode');
        if (securityMode) {
            securityMode.addEventListener('change', (e) => {
                const dtlsOptions = document.getElementById('dtlsOptions');
                if (dtlsOptions) {
                    dtlsOptions.style.display = e.target.value === 'dtls' ? 'block' : 'none';
                }
            });
        }
    }
    
    async connectNetwork() {
        const ip = document.getElementById('deviceIp').value;
        const port = document.getElementById('coapPort').value;
        const securityMode = document.getElementById('securityMode').value;
        
        if (!ip) {
            this.log('Please enter device IP address', 'error');
            return;
        }
        
        // TODO: Implement network connection
        // This would typically use a backend service or WebSockets
        this.log(`Connecting to ${ip}:${port}...`, 'info');
        
        // Simulate connection for now
        setTimeout(() => {
            this.updateConnectionStatus(true, 'network');
            this.log(`Connected to ${ip}:${port}`, 'success');
            this.saveRecentConnection({ type: 'network', ip, port, securityMode });
        }, 1000);
    }
    
    initDashboard() {
        if (!this.isConnected) {
            document.getElementById('pageContainer').innerHTML = `
                <div class="card">
                    <div class="card-body text-center">
                        <i class="fas fa-plug fa-3x text-muted mb-3"></i>
                        <h3>No Device Connected</h3>
                        <p>Please connect to a device first</p>
                        <button class="btn btn-primary" onclick="app.loadPage('connection')">
                            Go to Connection Page
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        // Start real-time monitoring
        this.startMonitoring();
    }
    
    initInterfacesPage() {
        this.loadInterfaces();
    }
    
    initVlanPage() {
        this.loadVlanConfig();
    }
    
    initYangBrowser() {
        yangBrowser.init();
    }
    
    initCoapConsole() {
        this.setupCoapConsole();
    }
    
    async loadInterfaces() {
        if (this.connectionType === 'serial') {
            // Send CoAP request via MUP1
            const request = coapClient.createGetRequest('/interfaces');
            await webSerial.sendCoap(request);
        } else {
            // Send via network
            // TODO: Implement network CoAP
        }
    }
    
    async loadVlanConfig() {
        if (this.connectionType === 'serial') {
            const request = coapClient.createGetRequest('/vlans');
            await webSerial.sendCoap(request);
        }
    }
    
    setupCoapConsole() {
        const sendBtn = document.getElementById('coapSendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', async () => {
                const method = document.getElementById('coapMethod').value;
                const path = document.getElementById('coapPath').value;
                const payload = document.getElementById('coapPayload').value;
                
                let request;
                switch (method) {
                    case 'GET':
                        request = coapClient.createGetRequest(path);
                        break;
                    case 'POST':
                        request = coapClient.createPostRequest(path, payload);
                        break;
                    case 'PUT':
                        request = coapClient.createPutRequest(path, payload);
                        break;
                    case 'DELETE':
                        request = coapClient.createDeleteRequest(path);
                        break;
                }
                
                if (this.connectionType === 'serial') {
                    await webSerial.sendCoap(request);
                    this.log(`Sent CoAP ${method} ${path}`, 'info');
                }
            });
        }
    }
    
    handleSerialData(data) {
        console.log('Processing serial data:', data);
        
        if (data.type === 'COAP') {
            // Parse CoAP response
            const response = coapClient.parseMessage(data.data);
            this.handleCoapResponse(response);
        } else if (data.type === 'ANNOUNCE') {
            // Handle device announcement
            this.deviceInfo = data.parsed;
            this.updateDeviceInfo();
        } else if (data.type === 'PONG') {
            this.log('Pong received', 'success');
        }
    }
    
    handleCoapResponse(response) {
        const path = coapClient.extractPath(response.options);
        const contentFormat = coapClient.extractContentFormat(response.options);
        
        // Decode payload based on content format
        let payload = response.payload;
        if (contentFormat === coapClient.CONTENT_FORMAT.JSON && payload) {
            try {
                payload = JSON.parse(new TextDecoder().decode(payload));
            } catch (e) {
                console.error('Failed to parse JSON payload');
            }
        }
        
        // Route response to appropriate handler
        if (path.startsWith('/interfaces')) {
            this.updateInterfacesDisplay(payload);
        } else if (path.startsWith('/vlans')) {
            this.updateVlanDisplay(payload);
        }
        
        this.log(`CoAP Response: ${response.codeString} ${coapClient.getResponseCodeName(response.code)}`, 'info');
    }
    
    updateConnectionStatus(connected, type = null) {
        this.isConnected = connected;
        this.connectionType = type;
        
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        const deviceInfo = document.getElementById('deviceInfo');
        
        if (connected) {
            statusDot.classList.add('connected');
            statusText.textContent = `Connected (${type})`;
            deviceInfo.style.display = 'flex';
        } else {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Disconnected';
            deviceInfo.style.display = 'none';
        }
    }
    
    updateDeviceInfo() {
        const deviceName = document.getElementById('deviceName');
        if (deviceName && this.deviceInfo.info) {
            deviceName.textContent = this.deviceInfo.info;
        }
    }
    
    updateInterfacesDisplay(data) {
        // TODO: Update interfaces display with received data
        console.log('Interfaces data:', data);
    }
    
    updateVlanDisplay(data) {
        // TODO: Update VLAN display with received data
        console.log('VLAN data:', data);
    }
    
    startMonitoring() {
        // Start periodic status updates
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        this.monitoringInterval = setInterval(() => {
            if (this.isConnected) {
                this.fetchStatus();
            }
        }, this.settings.refreshRate * 1000);
    }
    
    async fetchStatus() {
        if (this.connectionType === 'serial') {
            // Send status request
            const request = coapClient.createGetRequest('/status');
            await webSerial.sendCoap(request);
        }
    }
    
    log(message, type = 'info') {
        const console = document.getElementById('appConsole');
        if (console) {
            const entry = document.createElement('div');
            entry.className = `console-entry ${type}`;
            const timestamp = new Date().toLocaleTimeString();
            entry.textContent = `[${timestamp}] ${message}`;
            console.appendChild(entry);
            console.scrollTop = console.scrollHeight;
        }
        
        // Also log to browser console
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    saveRecentConnection(connection) {
        let recent = JSON.parse(localStorage.getItem('recentConnections') || '[]');
        
        // Add to beginning and limit to 5
        recent.unshift({
            ...connection,
            timestamp: Date.now()
        });
        recent = recent.slice(0, 5);
        
        localStorage.setItem('recentConnections', JSON.stringify(recent));
        this.updateRecentConnections();
    }
    
    updateRecentConnections() {
        const recentList = document.getElementById('recentList');
        if (!recentList) return;
        
        const recent = JSON.parse(localStorage.getItem('recentConnections') || '[]');
        
        if (recent.length === 0) {
            recentList.innerHTML = '<p class="text-muted">No recent connections</p>';
            return;
        }
        
        recentList.innerHTML = recent.map(conn => `
            <div class="recent-item">
                <i class="fas fa-${conn.type === 'serial' ? 'usb' : 'network-wired'}"></i>
                <span>${conn.type === 'serial' ? 'Serial' : `${conn.ip}:${conn.port}`}</span>
                <small>${new Date(conn.timestamp).toLocaleDateString()}</small>
            </div>
        `).join('');
    }
    
    loadSettings() {
        const defaults = {
            autoReconnect: true,
            connectionTimeout: 5000,
            theme: 'auto',
            refreshRate: 5,
            debugMode: false,
            logLevel: 'info'
        };
        
        const saved = localStorage.getItem('appSettings');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    }
    
    saveSettings() {
        this.settings = {
            autoReconnect: document.getElementById('autoReconnect').checked,
            connectionTimeout: parseInt(document.getElementById('connectionTimeout').value),
            theme: document.getElementById('theme').value,
            refreshRate: parseInt(document.getElementById('refreshRate').value),
            debugMode: document.getElementById('debugMode').checked,
            logLevel: document.getElementById('logLevel').value
        };
        
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
        document.getElementById('settingsModal').classList.remove('active');
        
        this.applyTheme();
        this.log('Settings saved', 'success');
    }
    
    resetSettings() {
        localStorage.removeItem('appSettings');
        this.settings = this.loadSettings();
        this.applySettingsToUI();
        this.applyTheme();
        this.log('Settings reset to defaults', 'info');
    }
    
    applySettingsToUI() {
        document.getElementById('autoReconnect').checked = this.settings.autoReconnect;
        document.getElementById('connectionTimeout').value = this.settings.connectionTimeout;
        document.getElementById('theme').value = this.settings.theme;
        document.getElementById('refreshRate').value = this.settings.refreshRate;
        document.getElementById('debugMode').checked = this.settings.debugMode;
        document.getElementById('logLevel').value = this.settings.logLevel;
    }
    
    applyTheme() {
        document.body.className = this.settings.theme === 'auto' ? 'auto-theme' : '';
        
        if (this.settings.theme === 'dark') {
            document.body.style.background = 'var(--gray-900)';
            document.body.style.color = 'var(--gray-100)';
        } else if (this.settings.theme === 'light') {
            document.body.style.background = 'var(--gray-50)';
            document.body.style.color = 'var(--gray-900)';
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VelocityDriveApp();
});