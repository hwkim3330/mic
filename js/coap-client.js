/**
 * CoAP Client Implementation for VelocityDRIVE-SP
 * RFC 7252 compliant CoAP protocol handler
 */

class CoapClient {
    constructor() {
        // CoAP constants
        this.VERSION = 1;
        this.HEADER_SIZE = 4;
        
        // Message types
        this.TYPE = {
            CONFIRMABLE: 0,
            NON_CONFIRMABLE: 1,
            ACKNOWLEDGEMENT: 2,
            RESET: 3
        };
        
        // Method codes (0.XX)
        this.METHOD = {
            GET: 1,
            POST: 2,
            PUT: 3,
            DELETE: 4
        };
        
        // Response codes
        this.RESPONSE_CODE = {
            // 2.XX Success
            CREATED: 65,      // 2.01
            DELETED: 66,      // 2.02
            VALID: 67,        // 2.03
            CHANGED: 68,      // 2.04
            CONTENT: 69,      // 2.05
            
            // 4.XX Client Error
            BAD_REQUEST: 128,         // 4.00
            UNAUTHORIZED: 129,        // 4.01
            BAD_OPTION: 130,         // 4.02
            FORBIDDEN: 131,          // 4.03
            NOT_FOUND: 132,          // 4.04
            METHOD_NOT_ALLOWED: 133,  // 4.05
            NOT_ACCEPTABLE: 134,     // 4.06
            
            // 5.XX Server Error
            INTERNAL_SERVER_ERROR: 160,  // 5.00
            NOT_IMPLEMENTED: 161,        // 5.01
            BAD_GATEWAY: 162,           // 5.02
            SERVICE_UNAVAILABLE: 163,   // 5.03
            GATEWAY_TIMEOUT: 164        // 5.04
        };
        
        // Option numbers
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
            SIZE2: 28,
            PROXY_URI: 35,
            PROXY_SCHEME: 39,
            SIZE1: 60
        };
        
        // Content formats
        this.CONTENT_FORMAT = {
            TEXT: 0,
            LINK_FORMAT: 40,
            XML: 41,
            OCTET_STREAM: 42,
            EXI: 47,
            JSON: 50,
            CBOR: 60
        };
        
        this.messageId = Math.floor(Math.random() * 0xFFFF);
        this.tokens = new Map();
    }
    
    /**
     * Create CoAP message
     */
    createMessage(type, code, token = null, options = [], payload = null) {
        const message = [];
        
        // Generate token if not provided
        if (token === null) {
            token = this.generateToken();
        }
        
        // Header (4 bytes)
        // Byte 0: Version (2 bits) | Type (2 bits) | Token Length (4 bits)
        const tokenLength = token.length;
        message.push((this.VERSION << 6) | (type << 4) | tokenLength);
        
        // Byte 1: Code (3 bits class | 5 bits detail)
        message.push(code);
        
        // Bytes 2-3: Message ID
        this.messageId = (this.messageId + 1) & 0xFFFF;
        message.push((this.messageId >> 8) & 0xFF);
        message.push(this.messageId & 0xFF);
        
        // Token (if present)
        for (let byte of token) {
            message.push(byte);
        }
        
        // Options (sorted by option number)
        if (options.length > 0) {
            options.sort((a, b) => a.number - b.number);
            
            let previousOption = 0;
            for (let option of options) {
                const delta = option.number - previousOption;
                const length = option.value.length;
                
                // Option delta and length encoding
                let optionByte = 0;
                let extendedDelta = [];
                let extendedLength = [];
                
                // Delta encoding
                if (delta < 13) {
                    optionByte |= delta << 4;
                } else if (delta < 269) {
                    optionByte |= 13 << 4;
                    extendedDelta.push(delta - 13);
                } else {
                    optionByte |= 14 << 4;
                    extendedDelta.push((delta - 269) >> 8);
                    extendedDelta.push((delta - 269) & 0xFF);
                }
                
                // Length encoding
                if (length < 13) {
                    optionByte |= length;
                } else if (length < 269) {
                    optionByte |= 13;
                    extendedLength.push(length - 13);
                } else {
                    optionByte |= 14;
                    extendedLength.push((length - 269) >> 8);
                    extendedLength.push((length - 269) & 0xFF);
                }
                
                message.push(optionByte);
                message.push(...extendedDelta);
                message.push(...extendedLength);
                message.push(...option.value);
                
                previousOption = option.number;
            }
        }
        
        // Payload marker and payload
        if (payload !== null && payload.length > 0) {
            message.push(0xFF); // Payload marker
            message.push(...payload);
        }
        
        return new Uint8Array(message);
    }
    
    /**
     * Parse CoAP message
     */
    parseMessage(data) {
        const message = {
            version: (data[0] >> 6) & 0x03,
            type: (data[0] >> 4) & 0x03,
            tokenLength: data[0] & 0x0F,
            code: data[1],
            messageId: (data[2] << 8) | data[3],
            token: [],
            options: [],
            payload: null
        };
        
        // Extract token
        let offset = 4;
        if (message.tokenLength > 0) {
            message.token = Array.from(data.slice(offset, offset + message.tokenLength));
            offset += message.tokenLength;
        }
        
        // Parse options
        let previousOption = 0;
        while (offset < data.length && data[offset] !== 0xFF) {
            const optionByte = data[offset++];
            
            // Parse delta
            let delta = (optionByte >> 4) & 0x0F;
            if (delta === 13) {
                delta = data[offset++] + 13;
            } else if (delta === 14) {
                delta = ((data[offset] << 8) | data[offset + 1]) + 269;
                offset += 2;
            } else if (delta === 15) {
                break; // Reserved, stop parsing
            }
            
            // Parse length
            let length = optionByte & 0x0F;
            if (length === 13) {
                length = data[offset++] + 13;
            } else if (length === 14) {
                length = ((data[offset] << 8) | data[offset + 1]) + 269;
                offset += 2;
            } else if (length === 15) {
                break; // Reserved, stop parsing
            }
            
            const optionNumber = previousOption + delta;
            const optionValue = Array.from(data.slice(offset, offset + length));
            
            message.options.push({
                number: optionNumber,
                value: optionValue
            });
            
            offset += length;
            previousOption = optionNumber;
        }
        
        // Parse payload
        if (offset < data.length && data[offset] === 0xFF) {
            offset++; // Skip payload marker
            message.payload = data.slice(offset);
        }
        
        // Decode code
        message.codeClass = (message.code >> 5) & 0x07;
        message.codeDetail = message.code & 0x1F;
        message.codeString = `${message.codeClass}.${message.codeDetail.toString().padStart(2, '0')}`;
        
        return message;
    }
    
    /**
     * Create GET request
     */
    createGetRequest(path, accept = this.CONTENT_FORMAT.JSON) {
        const options = [];
        
        // Add URI path options
        const pathSegments = path.split('/').filter(s => s);
        for (let segment of pathSegments) {
            options.push({
                number: this.OPTION.URI_PATH,
                value: Array.from(new TextEncoder().encode(segment))
            });
        }
        
        // Add accept option
        if (accept !== null) {
            options.push({
                number: this.OPTION.ACCEPT,
                value: [accept]
            });
        }
        
        return this.createMessage(
            this.TYPE.CONFIRMABLE,
            this.METHOD.GET,
            null,
            options,
            null
        );
    }
    
    /**
     * Create POST request
     */
    createPostRequest(path, payload, contentFormat = this.CONTENT_FORMAT.JSON) {
        const options = [];
        
        // Add URI path options
        const pathSegments = path.split('/').filter(s => s);
        for (let segment of pathSegments) {
            options.push({
                number: this.OPTION.URI_PATH,
                value: Array.from(new TextEncoder().encode(segment))
            });
        }
        
        // Add content format
        options.push({
            number: this.OPTION.CONTENT_FORMAT,
            value: [contentFormat]
        });
        
        // Convert payload to bytes if needed
        let payloadBytes = payload;
        if (typeof payload === 'string') {
            payloadBytes = Array.from(new TextEncoder().encode(payload));
        } else if (payload instanceof Object) {
            payloadBytes = Array.from(new TextEncoder().encode(JSON.stringify(payload)));
        }
        
        return this.createMessage(
            this.TYPE.CONFIRMABLE,
            this.METHOD.POST,
            null,
            options,
            payloadBytes
        );
    }
    
    /**
     * Create PUT request
     */
    createPutRequest(path, payload, contentFormat = this.CONTENT_FORMAT.JSON) {
        const options = [];
        
        // Add URI path options
        const pathSegments = path.split('/').filter(s => s);
        for (let segment of pathSegments) {
            options.push({
                number: this.OPTION.URI_PATH,
                value: Array.from(new TextEncoder().encode(segment))
            });
        }
        
        // Add content format
        options.push({
            number: this.OPTION.CONTENT_FORMAT,
            value: [contentFormat]
        });
        
        // Convert payload to bytes if needed
        let payloadBytes = payload;
        if (typeof payload === 'string') {
            payloadBytes = Array.from(new TextEncoder().encode(payload));
        } else if (payload instanceof Object) {
            payloadBytes = Array.from(new TextEncoder().encode(JSON.stringify(payload)));
        }
        
        return this.createMessage(
            this.TYPE.CONFIRMABLE,
            this.METHOD.PUT,
            null,
            options,
            payloadBytes
        );
    }
    
    /**
     * Create DELETE request
     */
    createDeleteRequest(path) {
        const options = [];
        
        // Add URI path options
        const pathSegments = path.split('/').filter(s => s);
        for (let segment of pathSegments) {
            options.push({
                number: this.OPTION.URI_PATH,
                value: Array.from(new TextEncoder().encode(segment))
            });
        }
        
        return this.createMessage(
            this.TYPE.CONFIRMABLE,
            this.METHOD.DELETE,
            null,
            options,
            null
        );
    }
    
    /**
     * Generate random token
     */
    generateToken() {
        const token = [];
        const length = 4; // 4 bytes token
        for (let i = 0; i < length; i++) {
            token.push(Math.floor(Math.random() * 256));
        }
        return token;
    }
    
    /**
     * Get response code name
     */
    getResponseCodeName(code) {
        for (let [name, value] of Object.entries(this.RESPONSE_CODE)) {
            if (value === code) {
                return name.replace(/_/g, ' ');
            }
        }
        return `Unknown (${code})`;
    }
    
    /**
     * Extract URI path from options
     */
    extractPath(options) {
        const pathSegments = [];
        for (let option of options) {
            if (option.number === this.OPTION.URI_PATH) {
                pathSegments.push(new TextDecoder().decode(new Uint8Array(option.value)));
            }
        }
        return '/' + pathSegments.join('/');
    }
    
    /**
     * Extract content format from options
     */
    extractContentFormat(options) {
        for (let option of options) {
            if (option.number === this.OPTION.CONTENT_FORMAT && option.value.length > 0) {
                return option.value[0];
            }
        }
        return null;
    }
}

// Create global instance
const coapClient = new CoapClient();