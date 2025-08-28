/**
 * Advanced CoAP Client Implementation
 * Based on Microchip VelocityDRIVE-SP Ruby implementation
 * RFC 7252 compliant with block-wise transfer support
 */

class AdvancedCoAPClient {
    constructor() {
        // CoAP Constants from RFC 7252
        this.VERSION = 1;
        
        // Message Types
        this.TYPE = {
            CONFIRMABLE: 0,     // CON
            NON_CONFIRMABLE: 1, // NON
            ACKNOWLEDGMENT: 2,   // ACK
            RESET: 3            // RST
        };
        
        // Request Methods (Code Class 0)
        this.METHOD = {
            EMPTY: 0,
            GET: 1,
            POST: 2,
            PUT: 3,
            DELETE: 4,
            FETCH: 5,
            PATCH: 6,
            IPATCH: 7
        };
        
        // Response Codes
        this.CODE_CLASS = {
            REQUEST: 0,
            SUCCESS: 2,         // 2.xx
            CLIENT_ERROR: 4,    // 4.xx
            SERVER_ERROR: 5     // 5.xx
        };
        
        // Content Types
        this.CONTENT_FORMAT = {
            TEXT_PLAIN: 0,
            APPLICATION_LINK: 40,
            APPLICATION_XML: 41,
            APPLICATION_JSON: 50,
            APPLICATION_CBOR: 60,
            APPLICATION_YANG_DATA_CBOR: 140,       // RFC 9254
            APPLICATION_YANG_IDENTIFIERS_CBOR: 141, // SID-based
            APPLICATION_YANG_INSTANCES_CBOR: 142    // Instance data
        };
        
        // Option Numbers
        this.OPTION = {
            IF_MATCH: 1,
            URI_HOST: 3,
            ETAG: 4,
            IF_NONE_MATCH: 5,
            URI_PORT: 7,
            LOCATION_PATH: 8,
            URI_PATH: 11,
            CONTENT_FORMAT: 12,
            MAX_AGE: 14,
            URI_QUERY: 15,
            ACCEPT: 17,
            LOCATION_QUERY: 20,
            BLOCK2: 23,        // Response block-wise
            BLOCK1: 27,        // Request block-wise
            PROXY_URI: 35,
            PROXY_SCHEME: 39,
            SIZE1: 60
        };
        
        // Default parameters
        this.DEFAULT_BLOCK_SIZE = 256;
        this.RETRANSMIT_TIME_SEC = 3;
        this.MAX_RETRANSMIT = 5;
        
        // Active requests
        this.activeRequests = new Map();
        this.messageIdCounter = Math.floor(Math.random() * 0xFFFF);
    }
    
    /**
     * Generate next message ID
     */
    getNextMessageId() {
        this.messageIdCounter = (this.messageIdCounter + 1) & 0xFFFF;
        return this.messageIdCounter;
    }
    
    /**
     * Encode CoAP option
     */
    encodeOption(number, value) {
        const encoded = [];
        
        // Calculate delta from previous option
        let delta = number;
        let length = value.length;
        
        // Encode delta
        let deltaNibble, deltaExtended = [];
        if (delta < 13) {
            deltaNibble = delta;
        } else if (delta < 269) {
            deltaNibble = 13;
            deltaExtended = [delta - 13];
        } else {
            deltaNibble = 14;
            const val = delta - 269;
            deltaExtended = [(val >> 8) & 0xFF, val & 0xFF];
        }
        
        // Encode length
        let lengthNibble, lengthExtended = [];
        if (length < 13) {
            lengthNibble = length;
        } else if (length < 269) {
            lengthNibble = 13;
            lengthExtended = [length - 13];
        } else {
            lengthNibble = 14;
            const val = length - 269;
            lengthExtended = [(val >> 8) & 0xFF, val & 0xFF];
        }
        
        // Build option header
        encoded.push((deltaNibble << 4) | lengthNibble);
        encoded.push(...deltaExtended);
        encoded.push(...lengthExtended);
        encoded.push(...value);
        
        return encoded;
    }
    
    /**
     * Encode block option value
     */
    encodeBlockOption(num, more, blockSize) {
        // Calculate SZX from block size
        let szx = 0;
        switch (blockSize) {
            case 16: szx = 0; break;
            case 32: szx = 1; break;
            case 64: szx = 2; break;
            case 128: szx = 3; break;
            case 256: szx = 4; break;
            case 512: szx = 5; break;
            case 1024: szx = 6; break;
            default: szx = 4; // Default to 256
        }
        
        // Encode as: NUM (bits 4-23) | M (bit 3) | SZX (bits 0-2)
        const value = (num << 4) | (more ? 0x08 : 0) | szx;
        
        // Encode as variable length integer
        if (value === 0) {
            return [];
        } else if (value < 256) {
            return [value];
        } else if (value < 65536) {
            return [(value >> 8) & 0xFF, value & 0xFF];
        } else {
            return [
                (value >> 16) & 0xFF,
                (value >> 8) & 0xFF,
                value & 0xFF
            ];
        }
    }
    
    /**
     * Decode block option value
     */
    decodeBlockOption(bytes) {
        let value = 0;
        for (const byte of bytes) {
            value = (value << 8) | byte;
        }
        
        const szx = value & 0x07;
        const more = (value & 0x08) !== 0;
        const num = value >> 4;
        const blockSize = Math.pow(2, szx + 4);
        
        return { num, more, blockSize };
    }
    
    /**
     * Create CoAP message
     */
    createMessage(type, code, messageId, token = null) {
        const message = [];
        
        // Header: Ver(2) | T(2) | TKL(4) | Code(8) | Message ID(16)
        const ver = this.VERSION;
        const t = type;
        const tkl = token ? token.length : 0;
        
        // First byte: VV TT TTTT
        message.push((ver << 6) | (t << 4) | tkl);
        
        // Code byte
        message.push(code);
        
        // Message ID (2 bytes)
        message.push((messageId >> 8) & 0xFF);
        message.push(messageId & 0xFF);
        
        // Token if present
        if (token) {
            message.push(...token);
        }
        
        return message;
    }
    
    /**
     * Create request with block-wise support
     */
    createRequest(method, path, payload = null, options = {}) {
        const messageId = this.getNextMessageId();
        const type = this.TYPE.CONFIRMABLE;
        const code = method;
        
        // Create base message
        const message = this.createMessage(type, code, messageId);
        
        // Add options in order
        let lastOption = 0;
        const optionsData = [];
        
        // URI Path options
        if (path) {
            const pathParts = path.split('/').filter(p => p.length > 0);
            for (const part of pathParts) {
                const partBytes = new TextEncoder().encode(part);
                const delta = this.OPTION.URI_PATH - lastOption;
                optionsData.push(...this.encodeOption(delta, partBytes));
                lastOption = this.OPTION.URI_PATH;
            }
        }
        
        // Content Format
        if (options.contentFormat !== undefined) {
            const delta = this.OPTION.CONTENT_FORMAT - lastOption;
            const value = this.encodeUint(options.contentFormat);
            optionsData.push(...this.encodeOption(delta, value));
            lastOption = this.OPTION.CONTENT_FORMAT;
        }
        
        // URI Query
        if (options.query) {
            for (const q of options.query) {
                const delta = this.OPTION.URI_QUERY - lastOption;
                const qBytes = new TextEncoder().encode(q);
                optionsData.push(...this.encodeOption(delta, qBytes));
                lastOption = this.OPTION.URI_QUERY;
            }
        }
        
        // Accept
        if (options.accept !== undefined) {
            const delta = this.OPTION.ACCEPT - lastOption;
            const value = this.encodeUint(options.accept);
            optionsData.push(...this.encodeOption(delta, value));
            lastOption = this.OPTION.ACCEPT;
        }
        
        // Block2 for requesting block-wise response
        if (options.block2 !== undefined) {
            const delta = this.OPTION.BLOCK2 - lastOption;
            const value = this.encodeBlockOption(
                options.block2.num || 0,
                options.block2.more || false,
                options.block2.size || this.DEFAULT_BLOCK_SIZE
            );
            optionsData.push(...this.encodeOption(delta, value));
            lastOption = this.OPTION.BLOCK2;
        }
        
        // Block1 for block-wise request
        if (options.block1 !== undefined) {
            const delta = this.OPTION.BLOCK1 - lastOption;
            const value = this.encodeBlockOption(
                options.block1.num,
                options.block1.more,
                options.block1.size
            );
            optionsData.push(...this.encodeOption(delta, value));
            lastOption = this.OPTION.BLOCK1;
        }
        
        // Add options to message
        message.push(...optionsData);
        
        // Add payload if present
        if (payload) {
            message.push(0xFF); // Payload marker
            if (payload instanceof Uint8Array) {
                message.push(...payload);
            } else if (typeof payload === 'string') {
                message.push(...new TextEncoder().encode(payload));
            } else {
                message.push(...payload);
            }
        }
        
        return new Uint8Array(message);
    }
    
    /**
     * Encode unsigned integer for options
     */
    encodeUint(value) {
        if (value === 0) {
            return [];
        } else if (value < 256) {
            return [value];
        } else if (value < 65536) {
            return [(value >> 8) & 0xFF, value & 0xFF];
        } else if (value < 16777216) {
            return [(value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF];
        } else {
            return [
                (value >> 24) & 0xFF,
                (value >> 16) & 0xFF,
                (value >> 8) & 0xFF,
                value & 0xFF
            ];
        }
    }
    
    /**
     * Parse CoAP message
     */
    parseMessage(data) {
        const bytes = new Uint8Array(data);
        
        if (bytes.length < 4) {
            throw new Error('CoAP message too short');
        }
        
        // Parse header
        const version = (bytes[0] >> 6) & 0x03;
        const type = (bytes[0] >> 4) & 0x03;
        const tokenLength = bytes[0] & 0x0F;
        const codeClass = (bytes[1] >> 5) & 0x07;
        const codeDetail = bytes[1] & 0x1F;
        const messageId = (bytes[2] << 8) | bytes[3];
        
        let offset = 4;
        
        // Parse token
        let token = null;
        if (tokenLength > 0) {
            if (offset + tokenLength > bytes.length) {
                throw new Error('Token extends beyond message');
            }
            token = bytes.slice(offset, offset + tokenLength);
            offset += tokenLength;
        }
        
        // Parse options
        const options = {};
        let lastOption = 0;
        
        while (offset < bytes.length && bytes[offset] !== 0xFF) {
            const optionByte = bytes[offset++];
            
            // Parse delta
            let delta = (optionByte >> 4) & 0x0F;
            if (delta === 13) {
                delta = bytes[offset++] + 13;
            } else if (delta === 14) {
                delta = ((bytes[offset] << 8) | bytes[offset + 1]) + 269;
                offset += 2;
            } else if (delta === 15) {
                throw new Error('Invalid option delta 15');
            }
            
            // Parse length
            let length = optionByte & 0x0F;
            if (length === 13) {
                length = bytes[offset++] + 13;
            } else if (length === 14) {
                length = ((bytes[offset] << 8) | bytes[offset + 1]) + 269;
                offset += 2;
            } else if (length === 15) {
                throw new Error('Invalid option length 15');
            }
            
            // Get option value
            const optionNumber = lastOption + delta;
            const optionValue = bytes.slice(offset, offset + length);
            offset += length;
            
            // Store option
            if (!options[optionNumber]) {
                options[optionNumber] = [];
            }
            options[optionNumber].push(optionValue);
            
            lastOption = optionNumber;
        }
        
        // Parse payload
        let payload = null;
        if (offset < bytes.length && bytes[offset] === 0xFF) {
            offset++; // Skip payload marker
            payload = bytes.slice(offset);
        }
        
        return {
            version,
            type,
            tokenLength,
            code: (codeClass << 5) | codeDetail,
            codeClass,
            codeDetail,
            messageId,
            token,
            options,
            payload,
            // Helper methods
            isRequest: () => codeClass === 0,
            isResponse: () => codeClass >= 2,
            isSuccess: () => codeClass === 2,
            isClientError: () => codeClass === 4,
            isServerError: () => codeClass === 5
        };
    }
    
    /**
     * Handle block-wise transfer
     */
    async handleBlockWiseTransfer(method, path, payload, options) {
        const request = {
            method,
            path,
            payload,
            options,
            requestBlockNum: 0,
            requestBlockAcked: -1,
            responseBlocks: [],
            responseMore: true,
            retryCount: 0,
            state: 'sending'
        };
        
        // Handle large request payload with Block1
        if (payload && payload.length > this.DEFAULT_BLOCK_SIZE) {
            request.totalBlocks = Math.ceil(payload.length / this.DEFAULT_BLOCK_SIZE);
        }
        
        return new Promise((resolve, reject) => {
            const messageId = this.getNextMessageId();
            this.activeRequests.set(messageId, {
                request,
                resolve,
                reject,
                timer: null
            });
            
            // Send first block
            this.sendNextBlock(messageId);
        });
    }
    
    /**
     * Send next block in sequence
     */
    sendNextBlock(messageId) {
        const active = this.activeRequests.get(messageId);
        if (!active) return;
        
        const { request } = active;
        
        // Prepare options
        const opts = { ...request.options };
        
        // Add Block2 to request response blocks
        opts.block2 = {
            num: request.responseBlocks.length,
            more: false,
            size: this.DEFAULT_BLOCK_SIZE
        };
        
        // Handle Block1 for large requests
        let blockPayload = request.payload;
        if (request.totalBlocks) {
            const start = request.requestBlockNum * this.DEFAULT_BLOCK_SIZE;
            const end = Math.min(start + this.DEFAULT_BLOCK_SIZE, request.payload.length);
            blockPayload = request.payload.slice(start, end);
            
            opts.block1 = {
                num: request.requestBlockNum,
                more: request.requestBlockNum < request.totalBlocks - 1,
                size: this.DEFAULT_BLOCK_SIZE
            };
        }
        
        // Create and send message
        const message = this.createRequest(
            request.method,
            request.path,
            blockPayload,
            opts
        );
        
        // Set retry timer
        if (active.timer) {
            clearTimeout(active.timer);
        }
        
        active.timer = setTimeout(() => {
            this.handleTimeout(messageId);
        }, this.RETRANSMIT_TIME_SEC * 1000);
        
        // Return message for sending
        return message;
    }
    
    /**
     * Handle timeout
     */
    handleTimeout(messageId) {
        const active = this.activeRequests.get(messageId);
        if (!active) return;
        
        active.request.retryCount++;
        
        if (active.request.retryCount >= this.MAX_RETRANSMIT) {
            active.reject(new Error('Request timeout after max retries'));
            this.activeRequests.delete(messageId);
        } else {
            console.log(`Retrying request ${messageId} (attempt ${active.request.retryCount})`);
            this.sendNextBlock(messageId);
        }
    }
    
    /**
     * Process incoming response
     */
    processResponse(response) {
        const active = this.activeRequests.get(response.messageId);
        if (!active) {
            console.log('No active request for message ID:', response.messageId);
            return;
        }
        
        // Clear retry timer
        if (active.timer) {
            clearTimeout(active.timer);
            active.timer = null;
        }
        
        const { request } = active;
        
        // Handle error responses
        if (response.isClientError() || response.isServerError()) {
            active.reject(new Error(`CoAP error ${response.codeClass}.${response.codeDetail}`));
            this.activeRequests.delete(response.messageId);
            return;
        }
        
        // Handle Block1 ACK (request acknowledged)
        if (response.options[this.OPTION.BLOCK1]) {
            const block1 = this.decodeBlockOption(response.options[this.OPTION.BLOCK1][0]);
            request.requestBlockAcked = block1.num;
            
            if (request.requestBlockNum < request.totalBlocks - 1) {
                request.requestBlockNum++;
                this.sendNextBlock(response.messageId);
                return;
            }
        }
        
        // Handle Block2 (response blocks)
        if (response.options[this.OPTION.BLOCK2]) {
            const block2 = this.decodeBlockOption(response.options[this.OPTION.BLOCK2][0]);
            
            // Store response block
            if (response.payload) {
                request.responseBlocks[block2.num] = response.payload;
            }
            
            // Check if more blocks needed
            if (block2.more) {
                // Request next block
                this.sendNextBlock(response.messageId);
                return;
            }
        } else if (response.payload) {
            // Single block response
            request.responseBlocks[0] = response.payload;
        }
        
        // All blocks received, combine and return
        const fullPayload = this.combineBlocks(request.responseBlocks);
        active.resolve({
            code: response.code,
            codeClass: response.codeClass,
            codeDetail: response.codeDetail,
            options: response.options,
            payload: fullPayload
        });
        
        this.activeRequests.delete(response.messageId);
    }
    
    /**
     * Combine blocks into single payload
     */
    combineBlocks(blocks) {
        const totalLength = blocks.reduce((sum, block) => sum + block.length, 0);
        const combined = new Uint8Array(totalLength);
        
        let offset = 0;
        for (const block of blocks) {
            combined.set(block, offset);
            offset += block.length;
        }
        
        return combined;
    }
    
    /**
     * High-level request methods
     */
    async get(path, options = {}) {
        return this.handleBlockWiseTransfer(this.METHOD.GET, path, null, options);
    }
    
    async post(path, payload, options = {}) {
        return this.handleBlockWiseTransfer(this.METHOD.POST, path, payload, options);
    }
    
    async put(path, payload, options = {}) {
        return this.handleBlockWiseTransfer(this.METHOD.PUT, path, payload, options);
    }
    
    async delete(path, options = {}) {
        return this.handleBlockWiseTransfer(this.METHOD.DELETE, path, null, options);
    }
    
    async fetch(path, payload, options = {}) {
        options.contentFormat = options.contentFormat || this.CONTENT_FORMAT.APPLICATION_YANG_IDENTIFIERS_CBOR;
        return this.handleBlockWiseTransfer(this.METHOD.FETCH, path, payload, options);
    }
    
    async ipatch(path, payload, options = {}) {
        options.contentFormat = options.contentFormat || this.CONTENT_FORMAT.APPLICATION_YANG_INSTANCES_CBOR;
        return this.handleBlockWiseTransfer(this.METHOD.IPATCH, path, payload, options);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedCoAPClient;
}