/**
 * Page Templates for VelocityDRIVE-SP Control Center
 * Dynamic page content generator
 */

const pageTemplates = {
    getPage(pageName, app) {
        const pages = {
            connection: this.connectionPage,
            dashboard: this.dashboardPage,
            interfaces: this.interfacesPage,
            vlan: this.vlanPage,
            routing: this.routingPage,
            qos: this.qosPage,
            acl: this.aclPage,
            lacp: this.lacpPage,
            ptp: this.ptpPage,
            psfp: this.psfpPage,
            yang: this.yangPage,
            coap: this.coapPage,
            firmware: this.firmwarePage,
            backup: this.backupPage,
            statistics: this.statisticsPage,
            lldp: this.lldpPage,
            logs: this.logsPage
        };
        
        return pages[pageName] ? pages[pageName](app) : this.notFoundPage();
    },
    
    connectionPage(app) {
        return `
            <div class="page-header">
                <h1>Device Connection</h1>
                <p>Connect to VelocityDRIVE-SP device via WebSerial or network</p>
            </div>
            
            <div class="grid-2">
                <!-- WebSerial Connection -->
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-usb"></i>
                        <h3>Direct Serial (MUP1)</h3>
                    </div>
                    <div class="card-body">
                        <p>Connect directly via USB/Serial using WebSerial API</p>
                        <div class="info-grid mb-3">
                            <div class="info-item">
                                <span class="info-label">Protocol:</span>
                                <span>MUP1</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Baud Rate:</span>
                                <span>115200</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Data Format:</span>
                                <span>8N1</span>
                            </div>
                        </div>
                        <button class="btn btn-primary" id="serialConnectBtn">
                            <i class="fas fa-plug"></i>
                            Connect via WebSerial
                        </button>
                        <div id="serialStatus" class="mt-2"></div>
                    </div>
                </div>
                
                <!-- Network Connection -->
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-network-wired"></i>
                        <h3>Network (CoAP)</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Device IP Address:</label>
                            <input type="text" id="deviceIp" placeholder="192.168.1.100">
                        </div>
                        <div class="form-group">
                            <label>CoAP Port:</label>
                            <input type="number" id="coapPort" value="5683">
                        </div>
                        <div class="form-group">
                            <label>Security Mode:</label>
                            <select id="securityMode">
                                <option value="none">No Security</option>
                                <option value="dtls">DTLS Enabled</option>
                            </select>
                        </div>
                        <div id="dtlsOptions" style="display: none;">
                            <div class="form-group">
                                <label>Certificate:</label>
                                <input type="file" id="dtlsCert">
                            </div>
                            <div class="form-group">
                                <label>Private Key:</label>
                                <input type="file" id="dtlsKey">
                            </div>
                        </div>
                        <button class="btn btn-primary" id="networkConnectBtn">
                            <i class="fas fa-globe"></i>
                            Connect via Network
                        </button>
                        <div id="networkStatus" class="mt-2"></div>
                    </div>
                </div>
            </div>
            
            <!-- Recent Connections -->
            <div class="card mt-4">
                <div class="card-header">
                    <i class="fas fa-history"></i>
                    <h3>Recent Connections</h3>
                </div>
                <div class="card-body">
                    <div id="recentList"></div>
                </div>
            </div>
        `;
    },
    
    dashboardPage(app) {
        if (!app.isConnected) {
            return this.notConnectedPage();
        }
        
        return `
            <div class="page-header">
                <h1>Dashboard</h1>
                <p>System overview and real-time monitoring</p>
            </div>
            
            <!-- Stats Cards -->
            <div class="grid-4 mb-4">
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1);">
                        <i class="fas fa-ethernet" style="color: var(--success);"></i>
                    </div>
                    <div class="stat-value">24</div>
                    <div class="stat-label">Active Ports</div>
                    <div class="stat-change positive">
                        <i class="fas fa-arrow-up"></i> 100%
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(59, 130, 246, 0.1);">
                        <i class="fas fa-network-wired" style="color: var(--info);"></i>
                    </div>
                    <div class="stat-value">12</div>
                    <div class="stat-label">VLANs</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1);">
                        <i class="fas fa-microchip" style="color: var(--warning);"></i>
                    </div>
                    <div class="stat-value">45°C</div>
                    <div class="stat-label">Temperature</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(124, 58, 237, 0.1);">
                        <i class="fas fa-clock" style="color: var(--secondary);"></i>
                    </div>
                    <div class="stat-value" id="uptime">--</div>
                    <div class="stat-label">Uptime</div>
                </div>
            </div>
            
            <!-- System Info and Port Status -->
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-info-circle"></i>
                        <h3>System Information</h3>
                    </div>
                    <div class="card-body">
                        <table class="data-table">
                            <tr>
                                <td><strong>Platform:</strong></td>
                                <td id="platform">--</td>
                            </tr>
                            <tr>
                                <td><strong>Firmware:</strong></td>
                                <td id="firmware">--</td>
                            </tr>
                            <tr>
                                <td><strong>MAC Address:</strong></td>
                                <td id="macAddress">--</td>
                            </tr>
                            <tr>
                                <td><strong>Serial Number:</strong></td>
                                <td id="serialNumber">--</td>
                            </tr>
                            <tr>
                                <td><strong>Memory Usage:</strong></td>
                                <td id="memoryUsage">--</td>
                            </tr>
                            <tr>
                                <td><strong>CPU Usage:</strong></td>
                                <td id="cpuUsage">--</td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-ethernet"></i>
                        <h3>Port Status</h3>
                    </div>
                    <div class="card-body">
                        <div id="portStatus" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px;">
                            <!-- Port indicators will be dynamically inserted here -->
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Console -->
            <div class="card mt-4">
                <div class="card-header">
                    <i class="fas fa-terminal"></i>
                    <h3>System Console</h3>
                </div>
                <div class="card-body">
                    <div class="console" id="appConsole"></div>
                    <div class="mt-2">
                        <button class="btn btn-secondary" onclick="document.getElementById('appConsole').innerHTML=''">
                            Clear Console
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    
    interfacesPage(app) {
        if (!app.isConnected) {
            return this.notConnectedPage();
        }
        
        return `
            <div class="page-header">
                <h1>Interface Configuration</h1>
                <p>Manage network interfaces and port settings</p>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-ethernet"></i>
                    <h3>Network Interfaces</h3>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <button class="btn btn-primary" id="refreshInterfacesBtn">
                            <i class="fas fa-sync"></i> Refresh
                        </button>
                        <button class="btn btn-secondary" id="addInterfaceBtn">
                            <i class="fas fa-plus"></i> Add Interface
                        </button>
                    </div>
                    
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Interface</th>
                                <th>Status</th>
                                <th>Speed</th>
                                <th>Duplex</th>
                                <th>VLAN</th>
                                <th>IP Address</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="interfaceList">
                            <tr>
                                <td colspan="7" class="text-center">Loading interfaces...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },
    
    vlanPage(app) {
        if (!app.isConnected) {
            return this.notConnectedPage();
        }
        
        return `
            <div class="page-header">
                <h1>VLAN Configuration</h1>
                <p>Manage Virtual LANs and tagging</p>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-network-wired"></i>
                    <h3>VLAN List</h3>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <button class="btn btn-primary" id="addVlanBtn">
                            <i class="fas fa-plus"></i> Add VLAN
                        </button>
                        <button class="btn btn-secondary" id="refreshVlansBtn">
                            <i class="fas fa-sync"></i> Refresh
                        </button>
                    </div>
                    
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>VLAN ID</th>
                                <th>Name</th>
                                <th>Tagged Ports</th>
                                <th>Untagged Ports</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="vlanList">
                            <tr>
                                <td colspan="6" class="text-center">Loading VLANs...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },
    
    yangPage(app) {
        return `
            <div class="page-header">
                <h1>YANG Browser</h1>
                <p>Explore and manage YANG data models</p>
            </div>
            
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-folder-tree"></i>
                        <h3>YANG Tree</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <input type="text" id="yangSearch" placeholder="Search YANG nodes...">
                        </div>
                        <div id="yangTree" style="max-height: 500px; overflow-y: auto;">
                            <!-- YANG tree will be loaded here -->
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-code"></i>
                        <h3>YANG Operations</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Path:</label>
                            <input type="text" id="yangPath" placeholder="/ietf-system:system-state">
                        </div>
                        
                        <div class="form-group">
                            <label>Operation:</label>
                            <select id="yangOperation">
                                <option value="get">GET</option>
                                <option value="set">SET</option>
                                <option value="delete">DELETE</option>
                                <option value="rpc">RPC</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="yangValueGroup" style="display: none;">
                            <label>Value:</label>
                            <textarea id="yangValue" placeholder="Enter JSON value"></textarea>
                        </div>
                        
                        <button class="btn btn-primary" id="yangExecuteBtn">
                            <i class="fas fa-play"></i> Execute
                        </button>
                        
                        <div class="mt-3">
                            <label>Response:</label>
                            <div class="console" id="yangResponse"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    coapPage(app) {
        return `
            <div class="page-header">
                <h1>CoAP Console</h1>
                <p>Send CoAP requests and view responses</p>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <div class="grid-2">
                        <div>
                            <div class="form-group">
                                <label>Method:</label>
                                <select id="coapMethod">
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="PUT">PUT</option>
                                    <option value="DELETE">DELETE</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Path:</label>
                                <input type="text" id="coapPath" placeholder="/api/resource">
                            </div>
                            
                            <div class="form-group">
                                <label>Content Format:</label>
                                <select id="coapFormat">
                                    <option value="0">Text/Plain</option>
                                    <option value="50">JSON</option>
                                    <option value="60">CBOR</option>
                                    <option value="41">XML</option>
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <div class="form-group">
                                <label>Payload:</label>
                                <textarea id="coapPayload" style="min-height: 150px;" placeholder="Request payload (for POST/PUT)"></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <button class="btn btn-primary" id="coapSendBtn">
                            <i class="fas fa-paper-plane"></i> Send Request
                        </button>
                        <button class="btn btn-secondary" id="coapClearBtn">
                            <i class="fas fa-eraser"></i> Clear
                        </button>
                    </div>
                    
                    <div class="mt-4">
                        <h4>Request/Response Log:</h4>
                        <div class="console" id="coapConsole" style="min-height: 400px;"></div>
                    </div>
                </div>
            </div>
        `;
    },
    
    firmwarePage(app) {
        return `
            <div class="page-header">
                <h1>Firmware Management</h1>
                <p>Update and manage device firmware</p>
            </div>
            
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-info-circle"></i>
                        <h3>Current Firmware</h3>
                    </div>
                    <div class="card-body">
                        <table class="data-table">
                            <tr>
                                <td><strong>Version:</strong></td>
                                <td id="currentVersion">--</td>
                            </tr>
                            <tr>
                                <td><strong>Build Date:</strong></td>
                                <td id="buildDate">--</td>
                            </tr>
                            <tr>
                                <td><strong>Checksum:</strong></td>
                                <td id="checksum">--</td>
                            </tr>
                        </table>
                        
                        <button class="btn btn-secondary mt-3" id="checkUpdateBtn">
                            <i class="fas fa-sync"></i> Check for Updates
                        </button>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-upload"></i>
                        <h3>Firmware Update</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Select Firmware File:</label>
                            <input type="file" id="firmwareFile" accept=".bin,.img">
                        </div>
                        
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Warning:</strong> Updating firmware will restart the device. Ensure you have a backup of your configuration.
                        </div>
                        
                        <button class="btn btn-warning" id="uploadFirmwareBtn" disabled>
                            <i class="fas fa-upload"></i> Upload Firmware
                        </button>
                        
                        <div class="mt-3" id="uploadProgress" style="display: none;">
                            <div class="progress-bar">
                                <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                            </div>
                            <p class="mt-2" id="progressText">Uploading...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    notConnectedPage() {
        return `
            <div class="card">
                <div class="card-body text-center" style="padding: 60px;">
                    <i class="fas fa-plug fa-4x text-muted mb-4"></i>
                    <h2>No Device Connected</h2>
                    <p class="text-muted">Please connect to a VelocityDRIVE-SP device to access this feature.</p>
                    <button class="btn btn-primary" onclick="app.loadPage('connection')">
                        <i class="fas fa-arrow-right"></i> Go to Connection Page
                    </button>
                </div>
            </div>
        `;
    },
    
    notFoundPage() {
        return `
            <div class="card">
                <div class="card-body text-center" style="padding: 60px;">
                    <i class="fas fa-exclamation-triangle fa-4x text-warning mb-4"></i>
                    <h2>Page Not Found</h2>
                    <p class="text-muted">The requested page could not be found.</p>
                    <button class="btn btn-primary" onclick="app.loadPage('dashboard')">
                        <i class="fas fa-home"></i> Go to Dashboard
                    </button>
                </div>
            </div>
        `;
    }
};