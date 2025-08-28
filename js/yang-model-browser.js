/**
 * YANG Model Browser with SID Support
 * For VelocityDRIVE-SP devices
 * Based on IETF YANG and CORECONF specifications
 */

class YANGModelBrowser {
    constructor() {
        // YANG models supported by LAN966x
        this.models = {
            'ietf-interfaces': {
                name: 'ietf-interfaces',
                revision: '2018-02-20',
                namespace: 'urn:ietf:params:xml:ns:yang:ietf-interfaces',
                prefix: 'if',
                description: 'Network interface management',
                sidRange: [1000, 1999]
            },
            'ietf-ip': {
                name: 'ietf-ip',
                revision: '2018-02-22',
                namespace: 'urn:ietf:params:xml:ns:yang:ietf-ip',
                prefix: 'ip',
                description: 'IP protocol configuration',
                sidRange: [1500, 1599]
            },
            'ieee802-dot1q-bridge': {
                name: 'ieee802-dot1q-bridge',
                revision: '2020-11-15',
                namespace: 'urn:ieee:std:802.1Q:yang:ieee802-dot1q-bridge',
                prefix: 'dot1q',
                description: 'IEEE 802.1Q bridge configuration',
                sidRange: [2000, 2999]
            },
            'ieee802-dot1q-sched-bridge': {
                name: 'ieee802-dot1q-sched-bridge',
                revision: '2020-11-15',
                namespace: 'urn:ieee:std:802.1Q:yang:ieee802-dot1q-sched-bridge',
                prefix: 'sched',
                description: 'Time Aware Scheduler (TAS) configuration',
                sidRange: [2500, 2599]
            },
            'ieee1588-ptp': {
                name: 'ieee1588-ptp',
                revision: '2020-08-06',
                namespace: 'urn:ieee:std:1588:yang:ieee1588-ptp',
                prefix: 'ptp',
                description: 'Precision Time Protocol configuration',
                sidRange: [3000, 3999]
            },
            'ieee802-ethernet-interface': {
                name: 'ieee802-ethernet-interface',
                revision: '2020-11-15',
                namespace: 'urn:ieee:std:802.3:yang:ieee802-ethernet-interface',
                prefix: 'eth',
                description: 'Ethernet interface configuration',
                sidRange: [2100, 2199]
            },
            'mchp-velocitysp-port': {
                name: 'mchp-velocitysp-port',
                revision: '2023-01-01',
                namespace: 'http://microchip.com/velocitysp/port',
                prefix: 'mchp-port',
                description: 'Microchip port extensions',
                sidRange: [4000, 4099]
            },
            'mchp-velocitysp-ptp': {
                name: 'mchp-velocitysp-ptp',
                revision: '2023-01-01',
                namespace: 'http://microchip.com/velocitysp/ptp',
                prefix: 'mchp-ptp',
                description: 'Microchip PTP extensions',
                sidRange: [4100, 4199]
            },
            'mchp-velocitysp-system': {
                name: 'mchp-velocitysp-system',
                revision: '2023-01-01',
                namespace: 'http://microchip.com/velocitysp/system',
                prefix: 'mchp-sys',
                description: 'System management',
                sidRange: [4200, 4299]
            },
            'ietf-constrained-yang-library': {
                name: 'ietf-constrained-yang-library',
                revision: '2019-01-04',
                namespace: 'urn:ietf:params:xml:ns:yang:ietf-constrained-yang-library',
                prefix: 'yanglib',
                description: 'YANG library for constrained devices',
                sidRange: [29300, 29399]
            }
        };
        
        // Complete SID mappings based on analysis
        this.sidMappings = this.buildSIDMappings();
        
        // YANG data types
        this.dataTypes = {
            'string': { base: 'string', description: 'UTF-8 string' },
            'boolean': { base: 'boolean', description: 'True or false' },
            'uint8': { base: 'number', description: 'Unsigned 8-bit integer', min: 0, max: 255 },
            'uint16': { base: 'number', description: 'Unsigned 16-bit integer', min: 0, max: 65535 },
            'uint32': { base: 'number', description: 'Unsigned 32-bit integer', min: 0, max: 4294967295 },
            'uint64': { base: 'number', description: 'Unsigned 64-bit integer', min: 0, max: '18446744073709551615' },
            'int8': { base: 'number', description: 'Signed 8-bit integer', min: -128, max: 127 },
            'int16': { base: 'number', description: 'Signed 16-bit integer', min: -32768, max: 32767 },
            'int32': { base: 'number', description: 'Signed 32-bit integer', min: -2147483648, max: 2147483647 },
            'int64': { base: 'number', description: 'Signed 64-bit integer', min: '-9223372036854775808', max: '9223372036854775807' },
            'decimal64': { base: 'number', description: 'Fixed-point decimal' },
            'enumeration': { base: 'enum', description: 'Enumerated values' },
            'bits': { base: 'bits', description: 'Set of named bits' },
            'binary': { base: 'binary', description: 'Binary data' },
            'leafref': { base: 'reference', description: 'Reference to another leaf' },
            'identityref': { base: 'identity', description: 'Reference to an identity' },
            'instance-identifier': { base: 'path', description: 'Path to a data node' },
            'union': { base: 'union', description: 'Choice of types' }
        };
    }
    
    /**
     * Build complete SID mappings
     */
    buildSIDMappings() {
        return {
            // ietf-interfaces
            1000: { path: '/ietf-interfaces:interfaces', type: 'container' },
            1001: { path: '/ietf-interfaces:interfaces/interface', type: 'list', key: 'name' },
            1002: { path: '/ietf-interfaces:interfaces/interface/name', type: 'leaf', dataType: 'string' },
            1003: { path: '/ietf-interfaces:interfaces/interface/type', type: 'leaf', dataType: 'identityref' },
            1004: { path: '/ietf-interfaces:interfaces/interface/enabled', type: 'leaf', dataType: 'boolean' },
            1005: { path: '/ietf-interfaces:interfaces/interface/description', type: 'leaf', dataType: 'string' },
            1006: { path: '/ietf-interfaces:interfaces/interface/link-up-down-trap-enable', type: 'leaf', dataType: 'enumeration' },
            1007: { path: '/ietf-interfaces:interfaces/interface/admin-status', type: 'leaf', dataType: 'enumeration' },
            1008: { path: '/ietf-interfaces:interfaces/interface/oper-status', type: 'leaf', dataType: 'enumeration' },
            1009: { path: '/ietf-interfaces:interfaces/interface/last-change', type: 'leaf', dataType: 'yang:timestamp' },
            1010: { path: '/ietf-interfaces:interfaces/interface/if-index', type: 'leaf', dataType: 'int32' },
            1011: { path: '/ietf-interfaces:interfaces/interface/phys-address', type: 'leaf', dataType: 'yang:phys-address' },
            1012: { path: '/ietf-interfaces:interfaces/interface/higher-layer-if', type: 'leaf-list', dataType: 'leafref' },
            1013: { path: '/ietf-interfaces:interfaces/interface/lower-layer-if', type: 'leaf-list', dataType: 'leafref' },
            1014: { path: '/ietf-interfaces:interfaces/interface/speed', type: 'leaf', dataType: 'uint64' },
            1015: { path: '/ietf-interfaces:interfaces/interface/statistics', type: 'container' },
            1016: { path: '/ietf-interfaces:interfaces/interface/statistics/discontinuity-time', type: 'leaf', dataType: 'yang:timestamp' },
            1017: { path: '/ietf-interfaces:interfaces/interface/statistics/in-octets', type: 'leaf', dataType: 'uint64' },
            1018: { path: '/ietf-interfaces:interfaces/interface/statistics/in-unicast-pkts', type: 'leaf', dataType: 'uint64' },
            1019: { path: '/ietf-interfaces:interfaces/interface/statistics/in-broadcast-pkts', type: 'leaf', dataType: 'uint64' },
            1020: { path: '/ietf-interfaces:interfaces/interface/statistics/in-multicast-pkts', type: 'leaf', dataType: 'uint64' },
            1021: { path: '/ietf-interfaces:interfaces/interface/statistics/in-discards', type: 'leaf', dataType: 'uint32' },
            1022: { path: '/ietf-interfaces:interfaces/interface/statistics/in-errors', type: 'leaf', dataType: 'uint32' },
            1023: { path: '/ietf-interfaces:interfaces/interface/statistics/out-octets', type: 'leaf', dataType: 'uint64' },
            1024: { path: '/ietf-interfaces:interfaces/interface/statistics/out-unicast-pkts', type: 'leaf', dataType: 'uint64' },
            1025: { path: '/ietf-interfaces:interfaces/interface/statistics/out-broadcast-pkts', type: 'leaf', dataType: 'uint64' },
            1026: { path: '/ietf-interfaces:interfaces/interface/statistics/out-multicast-pkts', type: 'leaf', dataType: 'uint64' },
            1027: { path: '/ietf-interfaces:interfaces/interface/statistics/out-discards', type: 'leaf', dataType: 'uint32' },
            1028: { path: '/ietf-interfaces:interfaces/interface/statistics/out-errors', type: 'leaf', dataType: 'uint32' },
            
            // ieee802-dot1q-bridge
            2000: { path: '/ieee802-dot1q-bridge:bridges', type: 'container' },
            2001: { path: '/ieee802-dot1q-bridge:bridges/bridge', type: 'list', key: 'name' },
            2002: { path: '/ieee802-dot1q-bridge:bridges/bridge/name', type: 'leaf', dataType: 'string' },
            2003: { path: '/ieee802-dot1q-bridge:bridges/bridge/ports', type: 'container' },
            2004: { path: '/ieee802-dot1q-bridge:bridges/bridge/ports/port', type: 'list', key: 'name' },
            2005: { path: '/ieee802-dot1q-bridge:bridges/bridge/ports/port/name', type: 'leaf', dataType: 'string' },
            2006: { path: '/ieee802-dot1q-bridge:bridges/bridge/ports/port/pvid', type: 'leaf', dataType: 'uint16' },
            2007: { path: '/ieee802-dot1q-bridge:bridges/bridge/ports/port/default-priority', type: 'leaf', dataType: 'uint8' },
            2008: { path: '/ieee802-dot1q-bridge:bridges/bridge/ports/port/priority-regeneration', type: 'container' },
            2009: { path: '/ieee802-dot1q-bridge:bridges/bridge/ports/port/pcp-decoding', type: 'container' },
            2010: { path: '/ieee802-dot1q-bridge:bridges/bridge/ports/port/pcp-encoding', type: 'container' },
            2011: { path: '/ieee802-dot1q-bridge:bridges/bridge/ports/port/use-dei', type: 'leaf', dataType: 'boolean' },
            2012: { path: '/ieee802-dot1q-bridge:bridges/bridge/ports/port/drop-encoding', type: 'leaf', dataType: 'boolean' },
            2013: { path: '/ieee802-dot1q-bridge:bridges/bridge/ports/port/service-access-priority-selection', type: 'leaf', dataType: 'boolean' },
            2014: { path: '/ieee802-dot1q-bridge:bridges/bridge/vlans', type: 'container' },
            2015: { path: '/ieee802-dot1q-bridge:bridges/bridge/vlans/vlan', type: 'list', key: 'vid' },
            2016: { path: '/ieee802-dot1q-bridge:bridges/bridge/vlans/vlan/vid', type: 'leaf', dataType: 'uint16' },
            2017: { path: '/ieee802-dot1q-bridge:bridges/bridge/vlans/vlan/name', type: 'leaf', dataType: 'string' },
            2018: { path: '/ieee802-dot1q-bridge:bridges/bridge/vlans/vlan/member-ports', type: 'leaf-list', dataType: 'string' },
            2019: { path: '/ieee802-dot1q-bridge:bridges/bridge/vlans/vlan/untagged-ports', type: 'leaf-list', dataType: 'string' },
            
            // ieee802-dot1q-sched-bridge (TAS)
            2500: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table', type: 'container' },
            2501: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/gate-enabled', type: 'leaf', dataType: 'boolean' },
            2502: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/admin-gate-states', type: 'leaf', dataType: 'uint8' },
            2503: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/oper-gate-states', type: 'leaf', dataType: 'uint8' },
            2504: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/admin-control-list', type: 'container' },
            2505: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/admin-control-list/gate-control-entry', type: 'list', key: 'index' },
            2506: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/admin-control-list/gate-control-entry/index', type: 'leaf', dataType: 'uint32' },
            2507: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/admin-control-list/gate-control-entry/operation-name', type: 'leaf', dataType: 'identityref' },
            2508: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/admin-control-list/gate-control-entry/time-interval-value', type: 'leaf', dataType: 'uint32' },
            2509: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/admin-control-list/gate-control-entry/gate-states-value', type: 'leaf', dataType: 'uint8' },
            2510: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/admin-cycle-time', type: 'container' },
            2511: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/admin-cycle-time/numerator', type: 'leaf', dataType: 'uint32' },
            2512: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/admin-cycle-time/denominator', type: 'leaf', dataType: 'uint32' },
            2513: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/admin-base-time', type: 'container' },
            2514: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/admin-base-time/seconds', type: 'leaf', dataType: 'string' },
            2515: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/admin-base-time/nanoseconds', type: 'leaf', dataType: 'uint32' },
            2516: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/config-change', type: 'leaf', dataType: 'boolean' },
            2517: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/config-pending', type: 'leaf', dataType: 'boolean' },
            2518: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/config-change-time', type: 'container' },
            2519: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/tick-granularity', type: 'leaf', dataType: 'uint32' },
            2520: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/current-time', type: 'container' },
            2521: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/oper-control-list', type: 'container' },
            2522: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/oper-cycle-time', type: 'container' },
            2523: { path: '/ieee802-dot1q-sched-bridge:gate-parameter-table/oper-base-time', type: 'container' },
            
            // ieee1588-ptp
            3000: { path: '/ieee1588-ptp:ptp', type: 'container' },
            3001: { path: '/ieee1588-ptp:ptp/instances', type: 'container' },
            3002: { path: '/ieee1588-ptp:ptp/instances/instance', type: 'list', key: 'instance-index' },
            3003: { path: '/ieee1588-ptp:ptp/instances/instance/instance-index', type: 'leaf', dataType: 'uint32' },
            3004: { path: '/ieee1588-ptp:ptp/instances/instance/default-ds', type: 'container' },
            3005: { path: '/ieee1588-ptp:ptp/instances/instance/default-ds/clock-identity', type: 'leaf', dataType: 'binary' },
            3006: { path: '/ieee1588-ptp:ptp/instances/instance/default-ds/number-ports', type: 'leaf', dataType: 'uint16' },
            3007: { path: '/ieee1588-ptp:ptp/instances/instance/default-ds/clock-quality', type: 'container' },
            3008: { path: '/ieee1588-ptp:ptp/instances/instance/default-ds/priority1', type: 'leaf', dataType: 'uint8' },
            3009: { path: '/ieee1588-ptp:ptp/instances/instance/default-ds/priority2', type: 'leaf', dataType: 'uint8' },
            3010: { path: '/ieee1588-ptp:ptp/instances/instance/default-ds/domain-number', type: 'leaf', dataType: 'uint8' },
            3011: { path: '/ieee1588-ptp:ptp/instances/instance/default-ds/external-port-config-enable', type: 'leaf', dataType: 'boolean' },
            3012: { path: '/ieee1588-ptp:ptp/instances/instance/current-ds', type: 'container' },
            3013: { path: '/ieee1588-ptp:ptp/instances/instance/current-ds/steps-removed', type: 'leaf', dataType: 'uint16' },
            3014: { path: '/ieee1588-ptp:ptp/instances/instance/current-ds/offset-from-master', type: 'leaf', dataType: 'int64' },
            3015: { path: '/ieee1588-ptp:ptp/instances/instance/current-ds/mean-path-delay', type: 'leaf', dataType: 'int64' },
            3016: { path: '/ieee1588-ptp:ptp/instances/instance/parent-ds', type: 'container' },
            3017: { path: '/ieee1588-ptp:ptp/instances/instance/time-properties-ds', type: 'container' },
            3018: { path: '/ieee1588-ptp:ptp/instances/instance/ports', type: 'container' },
            3019: { path: '/ieee1588-ptp:ptp/instances/instance/ports/port', type: 'list', key: 'port-index' },
            3020: { path: '/ieee1588-ptp:ptp/instances/instance/ports/port/port-index', type: 'leaf', dataType: 'uint16' },
            3021: { path: '/ieee1588-ptp:ptp/instances/instance/ports/port/port-ds', type: 'container' },
            3022: { path: '/ieee1588-ptp:ptp/instances/instance/ports/port/external-port-config-port-ds', type: 'container' },
            3023: { path: '/ieee1588-ptp:ptp/instances/instance/ports/port/external-port-config-port-ds/desired-state', type: 'leaf', dataType: 'enumeration' },
            
            // mchp-velocitysp extensions
            4000: { path: '/mchp-velocitysp-port:eth-port', type: 'container' },
            4001: { path: '/mchp-velocitysp-port:eth-port/config', type: 'container' },
            4002: { path: '/mchp-velocitysp-port:eth-port/config/speed', type: 'leaf', dataType: 'string' },
            4003: { path: '/mchp-velocitysp-port:eth-port/config/duplex', type: 'leaf', dataType: 'enumeration' },
            4004: { path: '/mchp-velocitysp-port:eth-port/config/flow-control', type: 'leaf', dataType: 'boolean' },
            4010: { path: '/mchp-velocitysp-port:eth-qos', type: 'container' },
            4011: { path: '/mchp-velocitysp-port:eth-qos/config', type: 'container' },
            4012: { path: '/mchp-velocitysp-port:eth-qos/config/traffic-class-shapers', type: 'container' },
            4013: { path: '/mchp-velocitysp-port:eth-qos/config/traffic-class-shapers/traffic-class', type: 'leaf', dataType: 'uint8' },
            4014: { path: '/mchp-velocitysp-port:eth-qos/config/traffic-class-shapers/credit-based', type: 'container' },
            4015: { path: '/mchp-velocitysp-port:eth-qos/config/traffic-class-shapers/credit-based/idle-slope', type: 'leaf', dataType: 'uint32' },
            
            4100: { path: '/mchp-velocitysp-ptp:automotive', type: 'container' },
            4101: { path: '/mchp-velocitysp-ptp:automotive/profile', type: 'leaf', dataType: 'enumeration' },
            
            4200: { path: '/mchp-velocitysp-system:save-config', type: 'rpc' },
            4201: { path: '/mchp-velocitysp-system:reset', type: 'rpc' },
            4202: { path: '/mchp-velocitysp-system:firmware-upgrade', type: 'rpc' },
            
            // ietf-constrained-yang-library
            29300: { path: '/ietf-constrained-yang-library:yang-library', type: 'container' },
            29301: { path: '/ietf-constrained-yang-library:yang-library/module-set', type: 'list', key: 'name' },
            29302: { path: '/ietf-constrained-yang-library:yang-library/module-set/name', type: 'leaf', dataType: 'string' },
            29303: { path: '/ietf-constrained-yang-library:yang-library/module-set/module', type: 'list', key: 'name' },
            29304: { path: '/ietf-constrained-yang-library:yang-library/checksum', type: 'leaf', dataType: 'binary' },
            29305: { path: '/ietf-constrained-yang-library:yang-library/content-id', type: 'leaf', dataType: 'string' }
        };
    }
    
    /**
     * Get SID for a YANG path
     */
    getSIDForPath(path) {
        for (const [sid, mapping] of Object.entries(this.sidMappings)) {
            if (mapping.path === path) {
                return parseInt(sid);
            }
        }
        return null;
    }
    
    /**
     * Get YANG path for a SID
     */
    getPathForSID(sid) {
        const mapping = this.sidMappings[sid];
        return mapping ? mapping.path : null;
    }
    
    /**
     * Get model tree structure
     */
    getModelTree() {
        const tree = {};
        
        for (const [sid, mapping] of Object.entries(this.sidMappings)) {
            const pathParts = mapping.path.split('/').filter(p => p);
            let current = tree;
            
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                
                if (!current[part]) {
                    current[part] = {
                        name: part,
                        sid: parseInt(sid),
                        type: mapping.type,
                        dataType: mapping.dataType,
                        children: {}
                    };
                }
                
                if (i === pathParts.length - 1) {
                    // Leaf node
                    current[part].sid = parseInt(sid);
                    current[part].type = mapping.type;
                    current[part].dataType = mapping.dataType;
                } else {
                    current = current[part].children;
                }
            }
        }
        
        return tree;
    }
    
    /**
     * Search for nodes by pattern
     */
    searchNodes(pattern) {
        const results = [];
        const regex = new RegExp(pattern, 'i');
        
        for (const [sid, mapping] of Object.entries(this.sidMappings)) {
            if (regex.test(mapping.path)) {
                results.push({
                    sid: parseInt(sid),
                    path: mapping.path,
                    type: mapping.type,
                    dataType: mapping.dataType
                });
            }
        }
        
        return results;
    }
    
    /**
     * Generate YANG path query
     */
    generateQuery(path, filters = {}) {
        const query = {
            path: path,
            filters: []
        };
        
        // Add key filters
        if (filters.keys) {
            for (const [key, value] of Object.entries(filters.keys)) {
                query.filters.push(`[${key}='${value}']`);
            }
        }
        
        // Add leaf filters
        if (filters.leaves) {
            query.filters.push(`{${filters.leaves.join(',')}}`);
        }
        
        // Build complete path
        let fullPath = path;
        if (query.filters.length > 0) {
            fullPath += query.filters.join('');
        }
        
        return fullPath;
    }
    
    /**
     * Validate data against model
     */
    validateData(path, data) {
        const sid = this.getSIDForPath(path);
        if (!sid) {
            return { valid: false, error: `Unknown path: ${path}` };
        }
        
        const mapping = this.sidMappings[sid];
        if (!mapping) {
            return { valid: false, error: `No mapping for SID: ${sid}` };
        }
        
        // Check data type
        if (mapping.dataType) {
            const typeInfo = this.dataTypes[mapping.dataType];
            if (typeInfo) {
                switch (typeInfo.base) {
                    case 'string':
                        if (typeof data !== 'string') {
                            return { valid: false, error: `Expected string, got ${typeof data}` };
                        }
                        break;
                        
                    case 'boolean':
                        if (typeof data !== 'boolean') {
                            return { valid: false, error: `Expected boolean, got ${typeof data}` };
                        }
                        break;
                        
                    case 'number':
                        if (typeof data !== 'number') {
                            return { valid: false, error: `Expected number, got ${typeof data}` };
                        }
                        if (typeInfo.min !== undefined && data < typeInfo.min) {
                            return { valid: false, error: `Value ${data} below minimum ${typeInfo.min}` };
                        }
                        if (typeInfo.max !== undefined && data > typeInfo.max) {
                            return { valid: false, error: `Value ${data} above maximum ${typeInfo.max}` };
                        }
                        break;
                }
            }
        }
        
        return { valid: true };
    }
    
    /**
     * Get model documentation
     */
    getModelInfo(modelName) {
        const model = this.models[modelName];
        if (!model) {
            return null;
        }
        
        // Get all nodes for this model
        const nodes = [];
        for (const [sid, mapping] of Object.entries(this.sidMappings)) {
            const sidNum = parseInt(sid);
            if (sidNum >= model.sidRange[0] && sidNum <= model.sidRange[1]) {
                nodes.push({
                    sid: sidNum,
                    path: mapping.path,
                    type: mapping.type,
                    dataType: mapping.dataType
                });
            }
        }
        
        return {
            ...model,
            nodes: nodes.sort((a, b) => a.sid - b.sid)
        };
    }
    
    /**
     * Export model as JSON schema
     */
    exportAsJSONSchema(path) {
        const sid = this.getSIDForPath(path);
        if (!sid) return null;
        
        const mapping = this.sidMappings[sid];
        const schema = {
            $schema: 'http://json-schema.org/draft-07/schema#',
            title: path,
            sid: sid
        };
        
        switch (mapping.type) {
            case 'container':
                schema.type = 'object';
                schema.properties = {};
                // Add child properties
                for (const [childSid, childMapping] of Object.entries(this.sidMappings)) {
                    if (childMapping.path.startsWith(path + '/') && 
                        childMapping.path.split('/').length === path.split('/').length + 1) {
                        const propName = childMapping.path.split('/').pop().split(':').pop();
                        schema.properties[propName] = this.getJSONSchemaType(childMapping);
                    }
                }
                break;
                
            case 'list':
                schema.type = 'array';
                schema.items = {
                    type: 'object',
                    properties: {}
                };
                break;
                
            case 'leaf':
                Object.assign(schema, this.getJSONSchemaType(mapping));
                break;
                
            case 'leaf-list':
                schema.type = 'array';
                schema.items = this.getJSONSchemaType(mapping);
                break;
        }
        
        return schema;
    }
    
    /**
     * Get JSON schema type for a mapping
     */
    getJSONSchemaType(mapping) {
        if (!mapping.dataType) {
            return { type: 'string' };
        }
        
        const typeInfo = this.dataTypes[mapping.dataType];
        if (!typeInfo) {
            return { type: 'string' };
        }
        
        const schema = {};
        
        switch (typeInfo.base) {
            case 'string':
                schema.type = 'string';
                break;
            case 'boolean':
                schema.type = 'boolean';
                break;
            case 'number':
                schema.type = typeInfo.base === 'number' && mapping.dataType.includes('int') ? 
                    'integer' : 'number';
                if (typeInfo.min !== undefined) schema.minimum = typeInfo.min;
                if (typeInfo.max !== undefined) schema.maximum = typeInfo.max;
                break;
            case 'binary':
                schema.type = 'string';
                schema.format = 'byte';
                break;
            case 'enum':
                schema.type = 'string';
                schema.enum = []; // Would need to be populated with actual values
                break;
        }
        
        schema.description = typeInfo.description;
        return schema;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YANGModelBrowser;
}