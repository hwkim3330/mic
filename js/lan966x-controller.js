/**
 * LAN966x Series Controller
 * Supports LAN9662 (2-port) and LAN9692 (12-port) switches
 * Based on VelocityDRIVE-SP platform
 */

class LAN966xController {
    constructor() {
        this.serial = null;
        this.mup1 = new MUP1Protocol();
        this.coap = new CoapClient();
        this.isConnected = false;
        this.deviceInfo = {
            model: null,      // LAN9662 or LAN9692
            ports: 0,         // Number of ports
            version: null,
            checksum: null    // YANG library checksum
        };
        
        // YANG SID for checksum
        this.SID_CHECKSUM = 29304; // ietf-constrained-yang-library:yang-library/checksum
        
        // Device detection patterns
        this.devicePatterns = {
            LAN9662: { ports: 2, pattern: /9662/ },
            LAN9692: { ports: 12, pattern: /9692/ },
            LAN9668: { ports: 8, pattern: /9668/ }
        };
    }
    
    /**
     * Connect to device via serial port
     */
    async connect(port = null) {
        try {
            // Initialize serial connection
            this.serial = new WebSerialHandler();
            this.serial.onData = (data) => this.handleIncomingData(data);
            
            await this.serial.connect(port);
            
            // Test connection with ping
            const pingFrame = this.mup1.createPing();
            await this.serial.write(pingFrame);
            
            // Wait for response
            const response = await this.waitForResponse('P', 2000);
            if (!response) {
                throw new Error('No response from device - check connection');
            }
            
            this.isConnected = true;
            
            // Get device information
            await this.identifyDevice();
            
            return true;
        } catch (error) {
            console.error('Connection failed:', error);
            this.isConnected = false;
            throw error;
        }
    }
    
    /**
     * Identify connected device model
     */
    async identifyDevice() {
        try {
            // Get YANG library checksum first
            const checksumData = await this.getYangChecksum();
            if (checksumData) {
                this.deviceInfo.checksum = checksumData;
            }
            
            // Try to get system information
            const interfaces = await this.getInterfaces();
            if (interfaces) {
                // Count number of physical ports
                const portCount = interfaces.filter(i => 
                    /^\d+$/.test(i.name)).length;
                
                // Determine model based on port count
                if (portCount === 2) {
                    this.deviceInfo.model = 'LAN9662';
                    this.deviceInfo.ports = 2;
                } else if (portCount === 12) {
                    this.deviceInfo.model = 'LAN9692';
                    this.deviceInfo.ports = 12;
                } else if (portCount === 8) {
                    this.deviceInfo.model = 'LAN9668';
                    this.deviceInfo.ports = 8;
                }
            }
            
            console.log('Device identified:', this.deviceInfo);
            return this.deviceInfo;
        } catch (error) {
            console.error('Failed to identify device:', error);
            return null;
        }
    }
    
    /**
     * Get YANG library checksum from device
     */
    async getYangChecksum() {
        try {
            const sid = this.coap.encodeCBOR(this.SID_CHECKSUM);
            const request = this.coap.createGetRequest('/c', {
                payload: sid,
                contentType: 141 // application/yang-sid+cbor
            });
            
            const frame = this.mup1.createCoAP(request);
            await this.serial.write(frame);
            
            const response = await this.waitForResponse('C', 5000);
            if (response && response.data) {
                const cbor = this.coap.decodeCBOR(response.data);
                const checksum = Array.from(cbor.values[0])
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                return checksum;
            }
        } catch (error) {
            console.error('Failed to get YANG checksum:', error);
        }
        return null;
    }
    
    /**
     * Get all interfaces
     */
    async getInterfaces() {
        try {
            const data = await this.fetchData('/ietf-interfaces:interfaces');
            if (data && data.interfaces && data.interfaces.interface) {
                return data.interfaces.interface;
            }
            return [];
        } catch (error) {
            console.error('Failed to get interfaces:', error);
            return [];
        }
    }
    
    /**
     * Configure port settings
     */
    async configurePort(portNumber, config) {
        try {
            const path = `/ietf-interfaces:interfaces/interface[name='${portNumber}']`;
            const data = {
                'ieee802-ethernet-interface:ethernet': {
                    'auto-negotiation': {
                        'enable': config.autoNeg !== false
                    }
                }
            };
            
            // Add speed configuration if not auto-negotiating
            if (!config.autoNeg && config.speed) {
                data['mchp-velocitysp-port:eth-port'] = {
                    'config': {
                        'speed': this.speedToValue(config.speed)
                    }
                };
            }
            
            return await this.patchData(path, data);
        } catch (error) {
            console.error('Failed to configure port:', error);
            return false;
        }
    }
    
    /**
     * Convert speed string to protocol value
     */
    speedToValue(speed) {
        const speedMap = {
            '10': '0.01',    // 10 Mbps
            '100': '0.1',    // 100 Mbps
            '1000': '1',     // 1 Gbps
            '2500': '2.5',   // 2.5 Gbps
            '10000': '10'    // 10 Gbps
        };
        return speedMap[speed] || '0.1';
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
                        'bridge-port': {
                            'bridge-name': 'default',
                            'vlan': {
                                'vlan-id': vlanId
                            }
                        }
                    }]
                }
            };
            
            // First create the VLAN interface
            await this.postData('/ietf-interfaces:interfaces', data);
            
            // Then add ports to VLAN
            if (ports.length > 0) {
                await this.addPortsToVlan(vlanId, ports);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to create VLAN:', error);
            return false;
        }
    }
    
    /**
     * Add ports to VLAN
     */
    async addPortsToVlan(vlanId, ports) {
        try {
            for (const port of ports) {
                const path = `/ietf-interfaces:interfaces/interface[name='${port}']/bridge-port`;
                const data = {
                    'vlan-membership': [{
                        'vlan-id': vlanId,
                        'tagged': true  // Can be configured
                    }]
                };
                await this.patchData(path, data);
            }
            return true;
        } catch (error) {
            console.error('Failed to add ports to VLAN:', error);
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
                    'instances': {
                        'instance': [{
                            'instance-index': config.instanceIndex || 0,
                            'default-ds': {
                                'external-port-config-enable': true
                            },
                            'mchp-velocitysp-ptp:automotive': {
                                'profile': config.profile || 'bridge'
                            },
                            'ports': {
                                'port': config.ports ? config.ports.map(p => ({
                                    'port-index': p.index,
                                    'external-port-config-port-ds': {
                                        'desired-state': p.state || 'slave'
                                    }
                                })) : []
                            }
                        }]
                    }
                }
            };
            
            return await this.patchData('/ieee1588-ptp:ptp', data);
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
            const path = `/ietf-interfaces:interfaces/interface[name='${portNumber}']/` +
                        'ieee802-dot1q-bridge:bridge-port/ieee802-dot1q-sched-bridge:gate-parameter-table';
            
            const data = {
                'gate-enabled': true,
                'admin-control-list': {
                    'gate-control-entry': schedule.entries.map((entry, index) => ({
                        'index': index + 1,
                        'operation-name': 'ieee802-dot1q-sched:set-gate-states',
                        'time-interval-value': entry.interval,
                        'gate-states-value': entry.gateStates
                    }))
                },
                'admin-cycle-time': {
                    'numerator': schedule.cycleTime || 1000000,
                    'denominator': 1000000000
                },
                'admin-base-time': {
                    'seconds': Math.floor(Date.now() / 1000).toString(),
                    'nanoseconds': 0
                },
                'config-change': true
            };
            
            return await this.patchData(path, data);
        } catch (error) {
            console.error('Failed to configure TAS:', error);
            return false;
        }
    }
    
    /**
     * Configure CBS (Credit Based Shaper)
     */
    async configureCBS(portNumber, trafficClass, idleSlope) {
        try {
            const path = `/ietf-interfaces:interfaces/interface[name='${portNumber}']/` +
                        'mchp-velocitysp-port:eth-qos/config/traffic-class-shapers';
            
            const data = {
                'traffic-class': trafficClass,
                'credit-based': {
                    'idle-slope': idleSlope
                }
            };
            
            return await this.patchData(path, data);
        } catch (error) {
            console.error('Failed to configure CBS:', error);
            return false;
        }
    }
    
    /**
     * Save configuration
     */
    async saveConfig() {
        try {
            const data = {
                '/mchp-velocitysp-system:save-config': {}
            };
            
            return await this.postData('/', data);
        } catch (error) {
            console.error('Failed to save config:', error);
            return false;
        }
    }
    
    /**
     * Generic fetch data method
     */
    async fetchData(path) {
        try {
            const request = this.coap.createGetRequest(path);
            const frame = this.mup1.createCoAP(request);
            await this.serial.write(frame);
            
            const response = await this.waitForResponse('C', 5000);
            if (response && response.data) {
                const coapResp = this.coap.parseResponse(response.data);
                if (coapResp.code === '2.05') { // Content
                    return this.coap.decodeCBOR(coapResp.payload);
                }
            }
        } catch (error) {
            console.error('Fetch failed:', error);
        }
        return null;
    }
    
    /**
     * Generic patch data method
     */
    async patchData(path, data) {
        try {
            const cbor = this.coap.encodeCBOR({ [path]: data });
            const request = this.coap.createPutRequest(path, cbor);
            const frame = this.mup1.createCoAP(request);
            await this.serial.write(frame);
            
            const response = await this.waitForResponse('C', 5000);
            return response && response.data;
        } catch (error) {
            console.error('Patch failed:', error);
            return false;
        }
    }
    
    /**
     * Generic post data method
     */
    async postData(path, data) {
        try {
            const cbor = this.coap.encodeCBOR(data);
            const request = this.coap.createPostRequest(path, cbor);
            const frame = this.mup1.createCoAP(request);
            await this.serial.write(frame);
            
            const response = await this.waitForResponse('C', 5000);
            return response && response.data;
        } catch (error) {
            console.error('Post failed:', error);
            return false;
        }
    }
    
    /**
     * Handle incoming data
     */
    handleIncomingData(data) {
        const frames = this.mup1.parseData(data);
        
        for (const frame of frames) {
            const processed = this.mup1.processFrame(frame);
            
            // Trigger callbacks
            if (this.responseCallbacks[processed.type]) {
                this.responseCallbacks[processed.type](processed);
                delete this.responseCallbacks[processed.type];
            }
            
            // Log for debugging
            console.log('Received:', processed);
        }
    }
    
    /**
     * Wait for specific response type
     */
    waitForResponse(type, timeout = 5000) {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                delete this.responseCallbacks[type];
                resolve(null);
            }, timeout);
            
            this.responseCallbacks = this.responseCallbacks || {};
            this.responseCallbacks[type] = (response) => {
                clearTimeout(timer);
                resolve(response);
            };
        });
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
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LAN966xController;
}