/**
 * Complete MUP1 Protocol Implementation
 * Based on VelocityDRIVE-SP specifications
 */

class MUP1Handler {
    constructor() {
        this.SOF = 0x3E; // '>'
        this.EOF = 0x3C; // '<'
        this.sequence = 0;
        this.rxBuffer = [];
        this.callbacks = new Map();
        
        // Message types from protocol analysis
        this.MSG_TYPES = {
            PING: 0x01,
            PONG: 0x02,
            SYSREQ: 0x10,
            SYSRESP: 0x11,
            TRACE: 0x20,
            TRACE_RESP: 0x21,
            COAP: 0x30,
            COAP_RESP: 0x31,
            ERROR: 0xFF
        };
        
        // System request commands
        this.SYS_COMMANDS = {
            GET_VERSION: 0x01,
            GET_SERIAL: 0x02,
            GET_MAC: 0x03,
            GET_STATUS: 0x04,
            RESET: 0x10,
            SAVE_CONFIG: 0x20,
            LOAD_CONFIG: 0x21
        };
    }
    
    /**
     * Create MUP1 frame
     */
    createFrame(type, payload = []) {
        const seq = this.sequence++ & 0xFF;
        const length = payload.length;
        
        const frame = [
            this.SOF,
            type,
            seq,
            length & 0xFF,
            (length >> 8) & 0xFF,
            ...payload,
            this.EOF
        ];
        
        return new Uint8Array(frame);
    }
    
    /**
     * Parse incoming MUP1 frame
     */
    parseFrame(data) {
        // Add to buffer
        if (data instanceof ArrayBuffer) {
            this.rxBuffer.push(...new Uint8Array(data));
        } else if (data instanceof Uint8Array) {
            this.rxBuffer.push(...data);
        }
        
        // Look for complete frames
        const frames = [];
        
        while (this.rxBuffer.length > 0) {
            // Find SOF
            const sofIndex = this.rxBuffer.indexOf(this.SOF);
            if (sofIndex === -1) {
                this.rxBuffer = [];
                break;
            }
            
            // Remove data before SOF
            if (sofIndex > 0) {
                this.rxBuffer.splice(0, sofIndex);
            }
            
            // Check minimum frame size
            if (this.rxBuffer.length < 6) {
                break; // Wait for more data
            }
            
            // Get length
            const length = this.rxBuffer[3] | (this.rxBuffer[4] << 8);
            const frameSize = 6 + length; // SOF + Type + Seq + Length(2) + Payload + EOF
            
            // Check if we have complete frame
            if (this.rxBuffer.length < frameSize) {
                break; // Wait for more data
            }
            
            // Check EOF
            if (this.rxBuffer[frameSize - 1] !== this.EOF) {
                // Invalid frame, skip SOF and continue
                this.rxBuffer.shift();
                continue;
            }
            
            // Extract frame
            const frame = {
                type: this.rxBuffer[1],
                sequence: this.rxBuffer[2],
                payload: this.rxBuffer.slice(5, frameSize - 1)
            };
            
            frames.push(frame);
            
            // Remove frame from buffer
            this.rxBuffer.splice(0, frameSize);
        }
        
        return frames;
    }
    
    /**
     * Send PING message
     */
    ping() {
        return this.createFrame(this.MSG_TYPES.PING);
    }
    
    /**
     * Send SYSREQ message
     */
    sysreq(command, data = []) {
        const payload = [command, ...data];
        return this.createFrame(this.MSG_TYPES.SYSREQ, payload);
    }
    
    /**
     * Send TRACE message
     */
    trace(message) {
        const encoder = new TextEncoder();
        const payload = encoder.encode(message);
        return this.createFrame(this.MSG_TYPES.TRACE, Array.from(payload));
    }
    
    /**
     * Send CoAP message
     */
    coap(coapMessage) {
        return this.createFrame(this.MSG_TYPES.COAP, Array.from(coapMessage));
    }
    
    /**
     * Get device version
     */
    getVersion() {
        return this.sysreq(this.SYS_COMMANDS.GET_VERSION);
    }
    
    /**
     * Get device MAC address
     */
    getMacAddress() {
        return this.sysreq(this.SYS_COMMANDS.GET_MAC);
    }
    
    /**
     * Get device status
     */
    getStatus() {
        return this.sysreq(this.SYS_COMMANDS.GET_STATUS);
    }
    
    /**
     * Save configuration
     */
    saveConfig() {
        return this.sysreq(this.SYS_COMMANDS.SAVE_CONFIG);
    }
    
    /**
     * Reset device
     */
    resetDevice() {
        return this.sysreq(this.SYS_COMMANDS.RESET);
    }
    
    /**
     * Process response frame
     */
    processResponse(frame) {
        const result = {
            type: frame.type,
            sequence: frame.sequence,
            data: null,
            error: null
        };
        
        switch (frame.type) {
            case this.MSG_TYPES.PONG:
                result.data = 'PONG received';
                break;
                
            case this.MSG_TYPES.SYSRESP:
                if (frame.payload.length > 0) {
                    const status = frame.payload[0];
                    if (status === 0) {
                        // Success
                        result.data = this.parseSysResponse(frame.payload.slice(1));
                    } else {
                        // Error
                        result.error = `System error: ${status}`;
                    }
                }
                break;
                
            case this.MSG_TYPES.TRACE_RESP:
                const decoder = new TextDecoder();
                result.data = decoder.decode(new Uint8Array(frame.payload));
                break;
                
            case this.MSG_TYPES.COAP_RESP:
                result.data = new Uint8Array(frame.payload);
                break;
                
            case this.MSG_TYPES.ERROR:
                result.error = `Device error: ${frame.payload[0] || 'Unknown'}`;
                break;
                
            default:
                result.error = `Unknown message type: ${frame.type}`;
        }
        
        return result;
    }
    
    /**
     * Parse system response payload
     */
    parseSysResponse(payload) {
        if (payload.length === 0) return null;
        
        // Try to decode as string
        try {
            const decoder = new TextDecoder();
            return decoder.decode(new Uint8Array(payload));
        } catch (e) {
            // Return as hex string
            return Array.from(payload)
                .map(b => b.toString(16).padStart(2, '0'))
                .join(' ');
        }
    }
    
    /**
     * Calculate simple checksum (optional, not in standard MUP1)
     */
    calculateChecksum(data) {
        let sum = 0;
        for (let byte of data) {
            sum = (sum + byte) & 0xFF;
        }
        return sum;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MUP1Handler;
}