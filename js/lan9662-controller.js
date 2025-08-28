/**
 * LAN9662 Device Controller
 * Complete interface for controlling Microchip LAN9662 switches
 */

class LAN9662Controller {
    constructor() {
        this.serial = null;
        this.mup1 = new MUP1Handler();
        this.coap = new CoapClient();
        this.isConnected = false;
        this.deviceInfo = {};
        this.yangModels = {};
        
        // Port configuration defaults
        this.portDefaults = {
            speed: 'auto',
            duplex: 'auto',
            flowControl: false,
            enabled: true
        };
        
        // Initialize connection handlers
        this.initHandlers();
    }
    
    initHandlers() {
        // Handle incoming data
        if (this.serial) {
            this.serial.onData = (data) => {
                this.handleIncomingData(data);
            };
        }
    }
    
    /**
     * Connect to LAN9662 via serial
     */
    async connectSerial(port = null) {
        try {
            this.serial = new WebSerialHandler();
            this.serial.onData = (data) => this.handleIncomingData(data);
            
            await this.serial.connect(port);
            
            // Test connection with ping
            const pingFrame = this.mup1.ping();
            await this.serial.write(pingFrame);
            
            // Wait for pong (with timeout)
            const response = await this.waitForResponse(this.mup1.MSG_TYPES.PONG, 2000);
            if (response) {
                this.isConnected = true;
                await this.getDeviceInfo();
                return true;
            } else {
                throw new Error('No response from device');
            }
        } catch (error) {
            console.error('Connection failed:', error);
            this.isConnected = false;
            throw error;
        }
    }
    
    /**
     * Disconnect from device
     */
    async disconnect() {
        if (this.serial) {
            await this.serial.disconnect();
        }
        this.isConnected = false;
    }
    
    /**
     * Handle incoming data from device
     */
    handleIncomingData(data) {
        const frames = this.mup1.parseFrame(data);
        
        for (const frame of frames) {
            const response = this.mup1.processResponse(frame);
            
            // Trigger callbacks based on message type
            if (this.responseCallbacks[frame.type]) {
                this.responseCallbacks[frame.type](response);
                delete this.responseCallbacks[frame.type];
            }
            
            // Log for debugging
            console.log('Received frame:', response);
        }
    }
    
    /**
     * Wait for specific response type
     */
    waitForResponse(msgType, timeout = 5000) {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                delete this.responseCallbacks[msgType];
                resolve(null);
            }, timeout);
            
            this.responseCallbacks = this.responseCallbacks || {};
            this.responseCallbacks[msgType] = (response) => {
                clearTimeout(timer);
                resolve(response);
            };
        });
    }
    
    /**
     * Get device information
     */
    async getDeviceInfo() {
        try {
            // Get version
            const versionFrame = this.mup1.getVersion();
            await this.serial.write(versionFrame);
            const versionResp = await this.waitForResponse(this.mup1.MSG_TYPES.SYSRESP);
            if (versionResp && versionResp.data) {
                this.deviceInfo.version = versionResp.data;
            }
            
            // Get MAC address
            const macFrame = this.mup1.getMacAddress();
            await this.serial.write(macFrame);
            const macResp = await this.waitForResponse(this.mup1.MSG_TYPES.SYSRESP);
            if (macResp && macResp.data) {
                this.deviceInfo.macAddress = macResp.data;
            }
            
            // Get status
            const statusFrame = this.mup1.getStatus();
            await this.serial.write(statusFrame);
            const statusResp = await this.waitForResponse(this.mup1.MSG_TYPES.SYSRESP);
            if (statusResp && statusResp.data) {
                this.deviceInfo.status = statusResp.data;
            }
            
            return this.deviceInfo;
        } catch (error) {
            console.error('Failed to get device info:', error);
            return null;
        }
    }
    
    /**
     * Get all interfaces
     */
    async getInterfaces() {
        try {
            const request = this.coap.createGetRequest('/ietf-interfaces:interfaces');
            const frame = this.mup1.coap(request);
            await this.serial.write(frame);
            
            const response = await this.waitForResponse(this.mup1.MSG_TYPES.COAP_RESP);
            if (response && response.data) {
                const coapResp = this.coap.parseResponse(response.data);
                return coapResp.payload;
            }
            return null;
        } catch (error) {
            console.error('Failed to get interfaces:', error);
            return null;
        }
    }
    
    /**
     * Configure port
     */
    async configurePort(portNumber, config) {
        try {
            const data = {
                'ietf-interfaces:interfaces': {
                    'interface': [{
                        'name': portNumber.toString(),
                        'enabled': config.enabled !== false,
                        'ietf-ethernet:ethernet': {
                            'auto-negotiate': config.speed === 'auto',
                            'speed': config.speed !== 'auto' ? parseInt(config.speed) : undefined,
                            'duplex': config.duplex !== 'auto' ? config.duplex : undefined
                        }
                    }]
                }
            };
            
            const request = this.coap.createPutRequest(
                `/ietf-interfaces:interfaces/interface[name='${portNumber}']`,
                data
            );
            const frame = this.mup1.coap(request);
            await this.serial.write(frame);
            
            const response = await this.waitForResponse(this.mup1.MSG_TYPES.COAP_RESP);
            return response && !response.error;
        } catch (error) {
            console.error('Failed to configure port:', error);
            return false;
        }
    }
    
    /**
     * Create VLAN
     */
    async createVlan(vlanId, name, ports = []) {
        try {
            const data = {
                'ietf-interfaces:interfaces': {
                    'interface': [{
                        'name': name || `VLAN${vlanId}`,
                        'type': 'iana-if-type:l2vlan',
                        'ietf-if-extensions:encapsulation': {
                            'ietf-if-vlan-encapsulation:dot1q-vlan': {
                                'outer-tag': {
                                    'vlan-id': vlanId
                                }
                            }
                        }
                    }]
                },
                'ieee802-dot1q-bridge:bridge': {
                    'component': [{
                        'name': 'default',
                        'filtering-database': {
                            'vlan-registration-entry': [{
                                'vlan-id': vlanId,
                                'port-map': ports.map(p => ({
                                    'port-ref': p.toString(),
                                    'pvid': false
                                }))
                            }]
                        }
                    }]
                }
            };
            
            const request = this.coap.createPostRequest('/ietf-interfaces:interfaces', data);
            const frame = this.mup1.coap(request);
            await this.serial.write(frame);
            
            const response = await this.waitForResponse(this.mup1.MSG_TYPES.COAP_RESP);
            return response && !response.error;
        } catch (error) {
            console.error('Failed to create VLAN:', error);
            return false;
        }
    }
    
    /**
     * Configure PTP (IEEE 1588)
     */
    async configurePTP(config) {
        try {
            const data = {
                'ieee1588-ptp:ptp': {
                    'instance': [{
                        'instance-index': config.instanceIndex || 0,
                        'default-ds': {
                            'two-step': config.twoStep !== false,
                            'clock-identity': config.clockIdentity || '00:00:00:00:00:00:00:00',
                            'priority1': config.priority1 || 128,
                            'priority2': config.priority2 || 128,
                            'domain-number': config.domain || 0,
                            'slave-only': config.slaveOnly || false
                        },
                        'port': config.ports ? config.ports.map(p => ({
                            'port-index': p,
                            'port-ds': {
                                'port-state': 'listening',
                                'delay-mechanism': config.delayMechanism || 'e2e'
                            }
                        })) : []
                    }]
                }
            };
            
            const request = this.coap.createPutRequest('/ieee1588-ptp:ptp', data);
            const frame = this.mup1.coap(request);
            await this.serial.write(frame);
            
            const response = await this.waitForResponse(this.mup1.MSG_TYPES.COAP_RESP);
            return response && !response.error;
        } catch (error) {
            console.error('Failed to configure PTP:', error);
            return false;
        }
    }
    
    /**
     * Configure TAS (Time Aware Scheduler)
     */
    async configureTAS(portNumber, schedule) {
        try {
            const data = {
                'ieee802-dot1q-sched:interfaces': {
                    'interface': [{
                        'name': portNumber.toString(),
                        'gate-parameters': {
                            'gate-enabled': true,
                            'admin-gate-states': 0xFF, // All gates open by default
                            'admin-control-list': schedule.entries.map(entry => ({
                                'operation-name': entry.operation || 'set-gate-states',
                                'sgs-params': {
                                    'gate-states-value': entry.gateStates
                                },
                                'time-interval-value': entry.interval
                            })),
                            'admin-cycle-time': {
                                'numerator': schedule.cycleTime || 1000000,
                                'denominator': 1
                            },
                            'admin-base-time': {
                                'seconds': Math.floor(Date.now() / 1000),
                                'nanoseconds': 0
                            }
                        }
                    }]
                }
            };
            
            const request = this.coap.createPutRequest(
                `/ieee802-dot1q-sched:interfaces/interface[name='${portNumber}']`,
                data
            );
            const frame = this.mup1.coap(request);
            await this.serial.write(frame);
            
            const response = await this.waitForResponse(this.mup1.MSG_TYPES.COAP_RESP);
            return response && !response.error;
        } catch (error) {
            console.error('Failed to configure TAS:', error);
            return false;
        }
    }
    
    /**
     * Get port statistics
     */
    async getPortStatistics(portNumber) {
        try {
            const request = this.coap.createGetRequest(
                `/ietf-interfaces:interfaces-state/interface[name='${portNumber}']/statistics`
            );
            const frame = this.mup1.coap(request);
            await this.serial.write(frame);
            
            const response = await this.waitForResponse(this.mup1.MSG_TYPES.COAP_RESP);
            if (response && response.data) {
                const coapResp = this.coap.parseResponse(response.data);
                return coapResp.payload;
            }
            return null;
        } catch (error) {
            console.error('Failed to get port statistics:', error);
            return null;
        }
    }
    
    /**
     * Save configuration to flash
     */
    async saveConfiguration() {
        try {
            const frame = this.mup1.saveConfig();
            await this.serial.write(frame);
            
            const response = await this.waitForResponse(this.mup1.MSG_TYPES.SYSRESP);
            return response && !response.error;
        } catch (error) {
            console.error('Failed to save configuration:', error);
            return false;
        }
    }
    
    /**
     * Reset device
     */
    async resetDevice() {
        try {
            const frame = this.mup1.resetDevice();
            await this.serial.write(frame);
            
            // Don't wait for response as device will reset
            this.isConnected = false;
            return true;
        } catch (error) {
            console.error('Failed to reset device:', error);
            return false;
        }
    }
    
    /**
     * Firmware update
     */
    async updateFirmware(firmwareData) {
        // Implementation would involve chunking the firmware
        // and sending it via special MUP1 commands
        console.warn('Firmware update not yet implemented');
        return false;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LAN9662Controller;
}