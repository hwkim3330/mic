/**
 * Time-Sensitive Networking (TSN) Configuration Module
 * For LAN966x VelocityDRIVE-SP devices
 * Based on IEEE standards and YAML configuration analysis
 */

class TSNConfigurator {
    constructor(controller) {
        this.controller = controller;
        
        // TSN Standards supported
        this.standards = {
            PTP: 'IEEE 1588-2019',      // Precision Time Protocol
            TAS: 'IEEE 802.1Qbv',       // Time Aware Scheduler
            CBS: 'IEEE 802.1Qav',       // Credit Based Shaper
            FRER: 'IEEE 802.1CB',       // Frame Replication and Elimination
            Preemption: 'IEEE 802.1Qbu' // Frame Preemption
        };
        
        // Traffic Class definitions (0-7)
        this.TRAFFIC_CLASSES = {
            BE: 0,      // Best Effort
            BK: 1,      // Background
            EE: 2,      // Excellent Effort
            CA: 3,      // Critical Applications
            VI: 4,      // Video
            VO: 5,      // Voice
            IC: 6,      // Internetwork Control
            NC: 7       // Network Control
        };
        
        // Gate states for TAS (8 bits, one per traffic class)
        this.GATE_STATE = {
            ALL_OPEN: 0xFF,     // 11111111 - All traffic classes open
            ALL_CLOSED: 0x00,   // 00000000 - All traffic classes closed
            TC0_ONLY: 0x01,     // 00000001 - Only TC0 open
            TC6_ONLY: 0x40,     // 01000000 - Only TC6 open
            TC7_ONLY: 0x80,     // 10000000 - Only TC7 open
            TC0_TC6: 0x41,      // 01000001 - TC0 and TC6 open
            TC3_CLOSED: 0xF7,   // 11110111 - All except TC3 open
            HIGH_PRIORITY: 0xC0 // 11000000 - TC6 and TC7 open
        };
    }
    
    /**
     * Configure IEEE 1588 PTP
     * Based on ipatch-set-ptp-instance.yaml
     */
    async configurePTP(config = {}) {
        const defaultConfig = {
            instanceIndex: 0,
            profile: 'bridge',      // 'bridge', 'automotive', 'industrial'
            domain: 0,
            priority1: 128,
            priority2: 128,
            ports: []
        };
        
        const ptpConfig = { ...defaultConfig, ...config };
        
        // Build YANG path and data
        const data = {
            '/ieee1588-ptp:ptp/instances/instance': {
                'instance-index': ptpConfig.instanceIndex,
                'default-ds': {
                    'external-port-config-enable': true,
                    'domain-number': ptpConfig.domain,
                    'priority1': ptpConfig.priority1,
                    'priority2': ptpConfig.priority2
                }
            }
        };
        
        // Add automotive profile if selected
        if (ptpConfig.profile === 'automotive' || ptpConfig.profile === 'bridge') {
            data['/ieee1588-ptp:ptp/instances/instance']['mchp-velocitysp-ptp:automotive'] = {
                'profile': ptpConfig.profile
            };
        }
        
        // Configure ports
        if (ptpConfig.ports.length > 0) {
            const portConfigs = ptpConfig.ports.map(port => ({
                'port-index': port.index,
                'external-port-config-port-ds': {
                    'desired-state': port.state || 'slave' // 'master', 'slave', 'passive'
                }
            }));
            
            data['/ieee1588-ptp:ptp/instances/instance']['ports'] = {
                'port': portConfigs
            };
        }
        
        try {
            const result = await this.controller.patchData(
                '/ieee1588-ptp:ptp',
                data
            );
            
            console.log('PTP configured successfully:', ptpConfig);
            return result;
        } catch (error) {
            console.error('Failed to configure PTP:', error);
            throw error;
        }
    }
    
    /**
     * Configure Time Aware Scheduler (TAS)
     * Based on tas_*.yaml files
     */
    async configureTAS(portNumber, schedule) {
        const defaultSchedule = {
            enabled: true,
            baseTime: null,         // Will be set to current time if null
            cycleTime: 1000000,     // 1ms in nanoseconds
            entries: [],
            defaultGateStates: this.GATE_STATE.ALL_OPEN
        };
        
        const tasSchedule = { ...defaultSchedule, ...schedule };
        
        // Calculate base time if not provided
        if (!tasSchedule.baseTime) {
            const now = Date.now();
            tasSchedule.baseTime = {
                seconds: Math.floor(now / 1000).toString(),
                nanoseconds: (now % 1000) * 1000000
            };
        }
        
        // Build gate control list
        const gateControlEntries = tasSchedule.entries.map((entry, index) => ({
            'index': index + 1,
            'operation-name': 'ieee802-dot1q-sched:set-gate-states',
            'time-interval-value': entry.interval || 1000000,
            'gate-states-value': entry.gateStates !== undefined ? 
                entry.gateStates : this.GATE_STATE.ALL_OPEN
        }));
        
        // Build YANG data
        const path = `/ietf-interfaces:interfaces/interface[name='${portNumber}']/` +
                    'ieee802-dot1q-bridge:bridge-port/ieee802-dot1q-sched-bridge:gate-parameter-table';
        
        const data = {
            [path]: {
                'gate-enabled': tasSchedule.enabled,
                'admin-gate-states': tasSchedule.defaultGateStates,
                'admin-control-list': {
                    'gate-control-entry': gateControlEntries
                },
                'admin-cycle-time': {
                    'numerator': tasSchedule.cycleTime,
                    'denominator': 1000000000  // Convert to seconds
                },
                'admin-base-time': tasSchedule.baseTime,
                'config-change': true
            }
        };
        
        try {
            const result = await this.controller.patchData('/', data);
            console.log(`TAS configured on port ${portNumber}:`, tasSchedule);
            return result;
        } catch (error) {
            console.error(`Failed to configure TAS on port ${portNumber}:`, error);
            throw error;
        }
    }
    
    /**
     * Configure Credit Based Shaper (CBS)
     * Based on ipatch-set-cbs-tc0.yaml
     */
    async configureCBS(portNumber, trafficClass, idleSlope) {
        const path = `/ietf-interfaces:interfaces/interface[name='${portNumber}']/` +
                    'mchp-velocitysp-port:eth-qos/config/traffic-class-shapers';
        
        const data = {
            [path]: {
                'traffic-class': trafficClass,
                'credit-based': {
                    'idle-slope': idleSlope  // in kbps
                }
            }
        };
        
        try {
            const result = await this.controller.patchData('/', data);
            console.log(`CBS configured on port ${portNumber}, TC${trafficClass}, idle slope: ${idleSlope} kbps`);
            return result;
        } catch (error) {
            console.error(`Failed to configure CBS on port ${portNumber}:`, error);
            throw error;
        }
    }
    
    /**
     * Create predefined TAS schedules
     */
    getPredefinedSchedules() {
        return {
            // Always open - no time-based gating
            alwaysOpen: {
                name: 'Always Open',
                description: 'All traffic classes always open',
                enabled: true,
                entries: [{
                    interval: 1000000,
                    gateStates: this.GATE_STATE.ALL_OPEN
                }]
            },
            
            // TC3 always closed (from tas_tc3_always_closed.yaml)
            tc3Closed: {
                name: 'TC3 Closed',
                description: 'Traffic Class 3 always closed',
                enabled: true,
                defaultGateStates: this.GATE_STATE.TC3_CLOSED,
                entries: [{
                    interval: 1000000,
                    gateStates: this.GATE_STATE.TC3_CLOSED  // 0xF7 = 247
                }]
            },
            
            // TC0 and TC6 open (from tas_tc0_tc6_open.yaml)
            tc0tc6Open: {
                name: 'TC0 & TC6 Open',
                description: 'Only Traffic Classes 0 and 6 open',
                enabled: true,
                entries: [{
                    interval: 1000000,
                    gateStates: this.GATE_STATE.TC0_TC6  // 0x41
                }]
            },
            
            // 1 microsecond window
            oneUsWindow: {
                name: '1μs Window',
                description: '1 microsecond gate open window',
                enabled: true,
                cycleTime: 1000000,  // 1ms cycle
                entries: [
                    {
                        interval: 1,  // 1ns (basically instant)
                        gateStates: this.GATE_STATE.ALL_OPEN
                    },
                    {
                        interval: 999999,  // Rest of cycle closed
                        gateStates: this.GATE_STATE.ALL_CLOSED
                    }
                ]
            },
            
            // Industrial automation schedule
            industrial: {
                name: 'Industrial',
                description: 'Industrial automation TSN schedule',
                enabled: true,
                cycleTime: 1000000,  // 1ms cycle
                entries: [
                    {
                        // Critical control traffic (100μs)
                        interval: 100000,
                        gateStates: this.GATE_STATE.HIGH_PRIORITY
                    },
                    {
                        // Process data (400μs)
                        interval: 400000,
                        gateStates: this.GATE_STATE.TC0_TC6
                    },
                    {
                        // Best effort (500μs)
                        interval: 500000,
                        gateStates: this.GATE_STATE.ALL_OPEN
                    }
                ]
            },
            
            // Automotive schedule
            automotive: {
                name: 'Automotive',
                description: 'Automotive Ethernet TSN schedule',
                enabled: true,
                cycleTime: 10000000,  // 10ms cycle
                entries: [
                    {
                        // Safety-critical (1ms)
                        interval: 1000000,
                        gateStates: this.GATE_STATE.TC7_ONLY
                    },
                    {
                        // Control traffic (2ms)
                        interval: 2000000,
                        gateStates: this.GATE_STATE.TC6_ONLY
                    },
                    {
                        // Infotainment/diagnostics (7ms)
                        interval: 7000000,
                        gateStates: this.GATE_STATE.ALL_OPEN
                    }
                ]
            }
        };
    }
    
    /**
     * Apply complete TSN profile
     */
    async applyTSNProfile(profile) {
        const profiles = {
            automotive: {
                ptp: {
                    profile: 'automotive',
                    domain: 0,
                    ports: [
                        { index: 1, state: 'master' },
                        { index: 2, state: 'slave' }
                    ]
                },
                tas: this.getPredefinedSchedules().automotive,
                cbs: [
                    { port: 1, trafficClass: 0, idleSlope: 100000 },
                    { port: 2, trafficClass: 0, idleSlope: 100000 }
                ]
            },
            
            industrial: {
                ptp: {
                    profile: 'bridge',
                    domain: 0,
                    priority1: 100,
                    ports: [
                        { index: 1, state: 'master' },
                        { index: 2, state: 'slave' }
                    ]
                },
                tas: this.getPredefinedSchedules().industrial,
                cbs: [
                    { port: 1, trafficClass: 6, idleSlope: 500000 },
                    { port: 2, trafficClass: 6, idleSlope: 500000 }
                ]
            },
            
            bridge: {
                ptp: {
                    profile: 'bridge',
                    domain: 0,
                    ports: []  // All ports in boundary clock mode
                },
                tas: this.getPredefinedSchedules().alwaysOpen,
                cbs: []  // No CBS by default
            }
        };
        
        if (!profiles[profile]) {
            throw new Error(`Unknown TSN profile: ${profile}`);
        }
        
        const config = profiles[profile];
        const results = {};
        
        try {
            // Configure PTP
            if (config.ptp) {
                results.ptp = await this.configurePTP(config.ptp);
            }
            
            // Configure TAS on all ports
            if (config.tas) {
                results.tas = [];
                const ports = this.controller.deviceInfo.ports || 2;
                for (let i = 1; i <= ports; i++) {
                    const tasResult = await this.configureTAS(i, config.tas);
                    results.tas.push({ port: i, result: tasResult });
                }
            }
            
            // Configure CBS
            if (config.cbs && config.cbs.length > 0) {
                results.cbs = [];
                for (const cbsConfig of config.cbs) {
                    const cbsResult = await this.configureCBS(
                        cbsConfig.port,
                        cbsConfig.trafficClass,
                        cbsConfig.idleSlope
                    );
                    results.cbs.push({ ...cbsConfig, result: cbsResult });
                }
            }
            
            console.log(`TSN profile '${profile}' applied successfully`);
            return results;
        } catch (error) {
            console.error(`Failed to apply TSN profile '${profile}':`, error);
            throw error;
        }
    }
    
    /**
     * Get current TAS status
     */
    async getTASStatus(portNumber) {
        const path = `/ietf-interfaces:interfaces/interface[name='${portNumber}']/` +
                    'ieee802-dot1q-bridge:bridge-port/ieee802-dot1q-sched-bridge:gate-parameter-table';
        
        try {
            const result = await this.controller.fetchData(path);
            return this.parseTASStatus(result);
        } catch (error) {
            console.error(`Failed to get TAS status for port ${portNumber}:`, error);
            throw error;
        }
    }
    
    /**
     * Parse TAS status response
     */
    parseTASStatus(data) {
        if (!data) return null;
        
        const status = {
            enabled: data['gate-enabled'] || false,
            operationalGateStates: data['oper-gate-states'],
            currentTime: data['current-time'],
            configPending: data['config-pending'] || false,
            configChangeTime: data['config-change-time'],
            tickGranularity: data['tick-granularity'],
            operCycleTime: data['oper-cycle-time'],
            operBaseTime: data['oper-base-time'],
            operControlList: []
        };
        
        if (data['oper-control-list'] && data['oper-control-list']['gate-control-entry']) {
            status.operControlList = data['oper-control-list']['gate-control-entry'].map(entry => ({
                index: entry.index,
                operation: entry['operation-name'],
                interval: entry['time-interval-value'],
                gateStates: entry['gate-states-value'],
                gateStatesBinary: this.formatGateStates(entry['gate-states-value'])
            }));
        }
        
        return status;
    }
    
    /**
     * Format gate states as binary string
     */
    formatGateStates(states) {
        if (typeof states === 'number') {
            return states.toString(2).padStart(8, '0')
                .split('').reverse().map((bit, tc) => 
                    bit === '1' ? `TC${tc}` : null
                ).filter(x => x).join(',') || 'None';
        }
        return states;
    }
    
    /**
     * Get PTP clock status
     */
    async getPTPStatus() {
        try {
            const result = await this.controller.fetchData('/ieee1588-ptp:ptp');
            return this.parsePTPStatus(result);
        } catch (error) {
            console.error('Failed to get PTP status:', error);
            throw error;
        }
    }
    
    /**
     * Parse PTP status response
     */
    parsePTPStatus(data) {
        if (!data || !data.ptp) return null;
        
        const instances = data.ptp.instances?.instance || [];
        
        return instances.map(instance => ({
            index: instance['instance-index'],
            state: instance['current-ds']?.['steps-removed'] === 0 ? 'Master' : 'Slave',
            clockIdentity: instance['default-ds']?.['clock-identity'],
            clockQuality: instance['default-ds']?.['clock-quality'],
            priority1: instance['default-ds']?.['priority1'],
            priority2: instance['default-ds']?.['priority2'],
            domainNumber: instance['default-ds']?.['domain-number'],
            stepsRemoved: instance['current-ds']?.['steps-removed'],
            offsetFromMaster: instance['current-ds']?.['offset-from-master'],
            meanPathDelay: instance['current-ds']?.['mean-path-delay'],
            ports: this.parsePTPPorts(instance.ports?.port)
        }));
    }
    
    /**
     * Parse PTP port status
     */
    parsePTPPorts(ports) {
        if (!ports) return [];
        
        return ports.map(port => ({
            index: port['port-index'],
            state: port['port-ds']?.['port-state'],
            role: port['external-port-config-port-ds']?.['desired-state'],
            peerMeanPathDelay: port['port-ds']?.['peer-mean-path-delay'],
            logAnnounceInterval: port['port-ds']?.['log-announce-interval'],
            logSyncInterval: port['port-ds']?.['log-sync-interval'],
            logMinDelayReqInterval: port['port-ds']?.['log-min-delay-req-interval']
        }));
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TSNConfigurator;
}