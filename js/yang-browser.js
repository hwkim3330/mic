/**
 * YANG Browser and Editor for VelocityDRIVE-SP
 * Provides YANG model exploration and data manipulation
 */

class YangBrowser {
    constructor() {
        this.yangModels = this.getBuiltInModels();
        this.currentPath = '/';
        this.expandedNodes = new Set();
    }
    
    init() {
        this.renderTree();
        this.setupEventListeners();
    }
    
    getBuiltInModels() {
        // Built-in YANG models for VelocityDRIVE-SP
        return {
            'ietf-system': {
                'system': {
                    'contact': { type: 'string', access: 'rw' },
                    'hostname': { type: 'string', access: 'rw' },
                    'location': { type: 'string', access: 'rw' },
                    'clock': {
                        'current-datetime': { type: 'datetime', access: 'ro' },
                        'boot-datetime': { type: 'datetime', access: 'ro' }
                    },
                    'dns-resolver': {
                        'search': { type: 'list', access: 'rw' },
                        'server': { type: 'list', access: 'rw' }
                    }
                },
                'system-state': {
                    'platform': {
                        'os-name': { type: 'string', access: 'ro' },
                        'os-release': { type: 'string', access: 'ro' },
                        'os-version': { type: 'string', access: 'ro' },
                        'machine': { type: 'string', access: 'ro' }
                    }
                }
            },
            'ietf-interfaces': {
                'interfaces': {
                    'interface': {
                        _list: true,
                        _key: 'name',
                        'name': { type: 'string', access: 'ro' },
                        'description': { type: 'string', access: 'rw' },
                        'type': { type: 'identityref', access: 'ro' },
                        'enabled': { type: 'boolean', access: 'rw' },
                        'link-up-down-trap-enable': { type: 'enumeration', access: 'rw' }
                    }
                },
                'interfaces-state': {
                    'interface': {
                        _list: true,
                        _key: 'name',
                        'name': { type: 'string', access: 'ro' },
                        'type': { type: 'identityref', access: 'ro' },
                        'admin-status': { type: 'enumeration', access: 'ro' },
                        'oper-status': { type: 'enumeration', access: 'ro' },
                        'last-change': { type: 'datetime', access: 'ro' },
                        'if-index': { type: 'int32', access: 'ro' },
                        'phys-address': { type: 'string', access: 'ro' },
                        'speed': { type: 'gauge64', access: 'ro' },
                        'statistics': {
                            'discontinuity-time': { type: 'datetime', access: 'ro' },
                            'in-octets': { type: 'counter64', access: 'ro' },
                            'in-unicast-pkts': { type: 'counter64', access: 'ro' },
                            'in-broadcast-pkts': { type: 'counter64', access: 'ro' },
                            'in-multicast-pkts': { type: 'counter64', access: 'ro' },
                            'in-discards': { type: 'counter32', access: 'ro' },
                            'in-errors': { type: 'counter32', access: 'ro' },
                            'out-octets': { type: 'counter64', access: 'ro' },
                            'out-unicast-pkts': { type: 'counter64', access: 'ro' },
                            'out-broadcast-pkts': { type: 'counter64', access: 'ro' },
                            'out-multicast-pkts': { type: 'counter64', access: 'ro' },
                            'out-discards': { type: 'counter32', access: 'ro' },
                            'out-errors': { type: 'counter32', access: 'ro' }
                        }
                    }
                }
            },
            'ieee802-dot1q-bridge': {
                'bridges': {
                    'bridge': {
                        _list: true,
                        _key: 'name',
                        'name': { type: 'string', access: 'ro' },
                        'address': { type: 'mac-address', access: 'ro' },
                        'bridge-type': { type: 'identityref', access: 'ro' },
                        'component': {
                            _list: true,
                            _key: 'name',
                            'name': { type: 'string', access: 'ro' },
                            'id': { type: 'uint32', access: 'ro' },
                            'type': { type: 'identityref', access: 'ro' },
                            'address': { type: 'mac-address', access: 'ro' },
                            'traffic-class-enabled': { type: 'boolean', access: 'rw' },
                            'vlan': {
                                _list: true,
                                _key: 'vid',
                                'vid': { type: 'vlan-id', access: 'ro' },
                                'name': { type: 'string', access: 'rw' },
                                'untagged-ports': { type: 'port-list', access: 'rw' },
                                'egress-ports': { type: 'port-list', access: 'rw' }
                            }
                        }
                    }
                }
            },
            'ietf-routing': {
                'routing': {
                    'control-plane-protocols': {
                        'control-plane-protocol': {
                            _list: true,
                            _key: ['type', 'name'],
                            'type': { type: 'identityref', access: 'ro' },
                            'name': { type: 'string', access: 'ro' },
                            'description': { type: 'string', access: 'rw' },
                            'static-routes': {
                                'ipv4': {
                                    'route': {
                                        _list: true,
                                        _key: ['destination-prefix', 'next-hop-address'],
                                        'destination-prefix': { type: 'ipv4-prefix', access: 'ro' },
                                        'next-hop-address': { type: 'ipv4-address', access: 'ro' },
                                        'outgoing-interface': { type: 'string', access: 'rw' }
                                    }
                                },
                                'ipv6': {
                                    'route': {
                                        _list: true,
                                        _key: ['destination-prefix', 'next-hop-address'],
                                        'destination-prefix': { type: 'ipv6-prefix', access: 'ro' },
                                        'next-hop-address': { type: 'ipv6-address', access: 'ro' },
                                        'outgoing-interface': { type: 'string', access: 'rw' }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            'ieee1588-ptp': {
                'ptp': {
                    'instance-list': {
                        _list: true,
                        _key: 'instance-number',
                        'instance-number': { type: 'uint32', access: 'ro' },
                        'default-ds': {
                            'two-step-flag': { type: 'boolean', access: 'rw' },
                            'clock-identity': { type: 'clock-identity', access: 'ro' },
                            'number-ports': { type: 'uint16', access: 'ro' },
                            'clock-quality': {
                                'clock-class': { type: 'uint8', access: 'rw' },
                                'clock-accuracy': { type: 'identityref', access: 'rw' },
                                'offset-scaled-log-variance': { type: 'uint16', access: 'rw' }
                            },
                            'priority1': { type: 'uint8', access: 'rw' },
                            'priority2': { type: 'uint8', access: 'rw' },
                            'domain-number': { type: 'uint8', access: 'rw' },
                            'slave-only': { type: 'boolean', access: 'rw' }
                        },
                        'current-ds': {
                            'steps-removed': { type: 'uint16', access: 'ro' },
                            'offset-from-master': { type: 'time-interval', access: 'ro' },
                            'mean-path-delay': { type: 'time-interval', access: 'ro' }
                        }
                    }
                }
            }
        };
    }
    
    renderTree() {
        const treeContainer = document.getElementById('yangTree');
        if (!treeContainer) return;
        
        treeContainer.innerHTML = this.renderNode(this.yangModels, '', 0);
    }
    
    renderNode(node, path, depth) {
        let html = '';
        
        for (let [key, value] of Object.entries(node)) {
            if (key.startsWith('_')) continue;
            
            const nodePath = path ? `${path}/${key}` : key;
            const hasChildren = typeof value === 'object' && !value.type;
            const isExpanded = this.expandedNodes.has(nodePath);
            const indent = depth * 20;
            
            html += '<div class="yang-node" style="margin-left: ' + indent + 'px;">';
            
            if (hasChildren) {
                html += `
                    <span class="yang-toggle ${isExpanded ? 'expanded' : ''}" data-path="${nodePath}">
                        <i class="fas fa-chevron-${isExpanded ? 'down' : 'right'}"></i>
                    </span>
                `;
            } else {
                html += '<span style="width: 20px; display: inline-block;"></span>';
            }
            
            const icon = this.getNodeIcon(value);
            const badge = this.getNodeBadge(value);
            
            html += `
                <span class="yang-key" data-path="${nodePath}">
                    <i class="${icon}"></i> ${key} ${badge}
                </span>
            `;
            
            if (value.type) {
                html += `<span class="yang-type">${value.type}</span>`;
                html += `<span class="yang-access badge badge-${value.access === 'rw' ? 'success' : 'info'}">${value.access}</span>`;
            }
            
            html += '</div>';
            
            if (hasChildren && isExpanded) {
                html += this.renderNode(value, nodePath, depth + 1);
            }
        }
        
        return html;
    }
    
    getNodeIcon(node) {
        if (node._list) return 'fas fa-list';
        if (node.type === 'boolean') return 'fas fa-toggle-on';
        if (node.type === 'string') return 'fas fa-font';
        if (node.type && node.type.includes('int')) return 'fas fa-hashtag';
        if (typeof node === 'object' && !node.type) return 'fas fa-folder';
        return 'fas fa-cube';
    }
    
    getNodeBadge(node) {
        if (node._list) return '<span class="badge badge-info">list</span>';
        if (node._key) return `<span class="badge badge-warning">key: ${node._key}</span>`;
        return '';
    }
    
    setupEventListeners() {
        // Tree node toggle
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('yang-toggle') || e.target.parentElement?.classList.contains('yang-toggle')) {
                const toggle = e.target.classList.contains('yang-toggle') ? e.target : e.target.parentElement;
                const path = toggle.dataset.path;
                
                if (this.expandedNodes.has(path)) {
                    this.expandedNodes.delete(path);
                } else {
                    this.expandedNodes.add(path);
                }
                
                this.renderTree();
            }
            
            if (e.target.classList.contains('yang-key')) {
                const path = e.target.dataset.path;
                this.selectNode(path);
            }
        });
        
        // Search functionality
        const searchInput = document.getElementById('yangSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchNodes(e.target.value);
            });
        }
        
        // Operation type change
        const operationSelect = document.getElementById('yangOperation');
        if (operationSelect) {
            operationSelect.addEventListener('change', (e) => {
                const valueGroup = document.getElementById('yangValueGroup');
                if (valueGroup) {
                    valueGroup.style.display = (e.target.value === 'set' || e.target.value === 'rpc') ? 'block' : 'none';
                }
            });
        }
        
        // Execute button
        const executeBtn = document.getElementById('yangExecuteBtn');
        if (executeBtn) {
            executeBtn.addEventListener('click', () => {
                this.executeOperation();
            });
        }
    }
    
    selectNode(path) {
        const pathInput = document.getElementById('yangPath');
        if (pathInput) {
            pathInput.value = '/' + path.replace(/:/g, ':');
        }
        
        // Highlight selected node
        document.querySelectorAll('.yang-key').forEach(el => {
            el.classList.remove('selected');
        });
        
        const selectedEl = document.querySelector(`.yang-key[data-path="${path}"]`);
        if (selectedEl) {
            selectedEl.classList.add('selected');
        }
    }
    
    searchNodes(query) {
        if (!query) {
            this.renderTree();
            return;
        }
        
        // Expand all nodes containing the search query
        this.expandedNodes.clear();
        this.searchAndExpand(this.yangModels, '', query.toLowerCase());
        this.renderTree();
    }
    
    searchAndExpand(node, path, query) {
        for (let [key, value] of Object.entries(node)) {
            if (key.startsWith('_')) continue;
            
            const nodePath = path ? `${path}/${key}` : key;
            
            if (key.toLowerCase().includes(query)) {
                // Expand all parent nodes
                let parentPath = '';
                for (let segment of nodePath.split('/')) {
                    if (parentPath) {
                        this.expandedNodes.add(parentPath);
                    }
                    parentPath = parentPath ? `${parentPath}/${segment}` : segment;
                }
            }
            
            if (typeof value === 'object' && !value.type) {
                this.searchAndExpand(value, nodePath, query);
            }
        }
    }
    
    async executeOperation() {
        const path = document.getElementById('yangPath').value;
        const operation = document.getElementById('yangOperation').value;
        const value = document.getElementById('yangValue')?.value;
        const responseEl = document.getElementById('yangResponse');
        
        if (!path) {
            this.showResponse('Please enter a YANG path', 'error');
            return;
        }
        
        responseEl.innerHTML = '<div class="text-info">Executing...</div>';
        
        try {
            let request;
            
            switch (operation) {
                case 'get':
                    request = coapClient.createGetRequest(path);
                    break;
                case 'set':
                    if (!value) {
                        throw new Error('Value is required for SET operation');
                    }
                    request = coapClient.createPutRequest(path, value);
                    break;
                case 'delete':
                    request = coapClient.createDeleteRequest(path);
                    break;
                case 'rpc':
                    if (!value) {
                        throw new Error('Parameters are required for RPC operation');
                    }
                    request = coapClient.createPostRequest(path, value);
                    break;
            }
            
            if (webSerial.isConnected()) {
                await webSerial.sendCoap(request);
                this.showResponse(`Request sent: ${operation.toUpperCase()} ${path}`, 'success');
            } else {
                this.showResponse('Not connected to device', 'error');
            }
        } catch (error) {
            this.showResponse(`Error: ${error.message}`, 'error');
        }
    }
    
    showResponse(message, type = 'info') {
        const responseEl = document.getElementById('yangResponse');
        if (responseEl) {
            const colorClass = type === 'error' ? 'text-danger' : type === 'success' ? 'text-success' : 'text-info';
            responseEl.innerHTML = `<div class="${colorClass}">${message}</div>`;
        }
    }
}

// Create global instance
const yangBrowser = new YangBrowser();