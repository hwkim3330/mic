/**
 * MUP1 Protocol Implementation
 * Microchip UART Protocol #1 for VelocityDRIVE-SP
 */

class MUP1Protocol {
    constructor() {
        // Protocol constants
        this.SOF = 0x3E; // '>' - Start of frame
        this.EOF = 0x3C; // '<' - End of frame  
        this.ESC = 0x5C; // '\' - Escape character
        
        // Message types
        this.MSG_TYPES = {
            ANNOUNCE: 0x01,
            COAP: 0x02,
            DTLS: 0x03,
            PING: 0x04,
            PONG: 0x05,
            SYSTEM_REQUEST: 0x06,
            TRACE: 0x07
        };
        
        // Frame states
        this.STATE = {
            IDLE: 0,
            HEADER: 1,
            DATA: 2,
            CHECKSUM: 3,
            EOF_WAIT: 4
        };
        
        this.state = this.STATE.IDLE;
        this.rxBuffer = [];
        this.frameBuffer = [];
    }
    
    /**
     * Encode data into MUP1 frame
     */
    encodeFrame(msgType, data) {
        const frame = [];
        
        // Start of frame
        frame.push(this.SOF);
        
        // Message type
        frame.push(msgType);
        
        // Data length (2 bytes, little-endian)
        const length = data.length;
        frame.push(length & 0xFF);
        frame.push((length >> 8) & 0xFF);
        
        // Data with escaping
        for (let byte of data) {
            if (byte === this.SOF || byte === this.EOF || byte === this.ESC) {
                frame.push(this.ESC);
            }
            frame.push(byte);
        }
        
        // Calculate checksum (XOR of all bytes except SOF/EOF)
        let checksum = msgType ^ (length & 0xFF) ^ ((length >> 8) & 0xFF);
        for (let byte of data) {
            checksum ^= byte;
        }
        frame.push(checksum);
        
        // End of frame
        frame.push(this.EOF);
        
        return new Uint8Array(frame);
    }
    
    /**
     * Decode incoming byte stream
     */
    processByte(byte) {
        switch (this.state) {
            case this.STATE.IDLE:
                if (byte === this.SOF) {
                    this.state = this.STATE.HEADER;
                    this.frameBuffer = [];
                }
                break;
                
            case this.STATE.HEADER:
                this.frameBuffer.push(byte);
                if (this.frameBuffer.length === 3) {
                    // We have type and 2 length bytes
                    this.expectedLength = this.frameBuffer[1] | (this.frameBuffer[2] << 8);
                    this.state = this.STATE.DATA;
                    this.dataBuffer = [];
                    this.escapeNext = false;
                }
                break;
                
            case this.STATE.DATA:
                if (this.escapeNext) {
                    this.dataBuffer.push(byte);
                    this.escapeNext = false;
                } else if (byte === this.ESC) {
                    this.escapeNext = true;
                } else {
                    this.dataBuffer.push(byte);
                }
                
                if (this.dataBuffer.length >= this.expectedLength) {
                    this.state = this.STATE.CHECKSUM;
                }
                break;
                
            case this.STATE.CHECKSUM:
                this.receivedChecksum = byte;
                
                // Calculate expected checksum
                let checksum = this.frameBuffer[0]; // msg type
                checksum ^= this.frameBuffer[1]; // length low
                checksum ^= this.frameBuffer[2]; // length high
                for (let b of this.dataBuffer.slice(0, this.expectedLength)) {
                    checksum ^= b;
                }
                
                if (checksum === this.receivedChecksum) {
                    this.state = this.STATE.EOF_WAIT;
                } else {
                    console.error('MUP1: Checksum error');
                    this.state = this.STATE.IDLE;
                }
                break;
                
            case this.STATE.EOF_WAIT:
                if (byte === this.EOF) {
                    // Valid frame received
                    const frame = {
                        type: this.frameBuffer[0],
                        data: new Uint8Array(this.dataBuffer.slice(0, this.expectedLength))
                    };
                    this.state = this.STATE.IDLE;
                    return frame;
                } else {
                    console.error('MUP1: EOF not found');
                    this.state = this.STATE.IDLE;
                }
                break;
        }
        
        return null;
    }
    
    /**
     * Create PING message
     */
    createPing() {
        return this.encodeFrame(this.MSG_TYPES.PING, new Uint8Array(0));
    }
    
    /**
     * Create CoAP message frame
     */
    createCoapMessage(coapData) {
        return this.encodeFrame(this.MSG_TYPES.COAP, coapData);
    }
    
    /**
     * Create System Request message
     */
    createSystemRequest(requestData) {
        return this.encodeFrame(this.MSG_TYPES.SYSTEM_REQUEST, requestData);
    }
    
    /**
     * Parse received frame based on type
     */
    parseFrame(frame) {
        const result = {
            type: this.getMessageTypeName(frame.type),
            typeCode: frame.type,
            data: frame.data
        };
        
        switch (frame.type) {
            case this.MSG_TYPES.ANNOUNCE:
                result.parsed = this.parseAnnounce(frame.data);
                break;
            case this.MSG_TYPES.COAP:
                result.parsed = 'CoAP data (requires CoAP parser)';
                break;
            case this.MSG_TYPES.PONG:
                result.parsed = 'Pong response';
                break;
            case this.MSG_TYPES.TRACE:
                result.parsed = new TextDecoder().decode(frame.data);
                break;
            default:
                result.parsed = frame.data;
        }
        
        return result;
    }
    
    /**
     * Parse announce message
     */
    parseAnnounce(data) {
        if (data.length < 4) return null;
        
        return {
            version: data[0],
            deviceId: data[1] | (data[2] << 8) | (data[3] << 16) | (data[4] << 24),
            info: new TextDecoder().decode(data.slice(5))
        };
    }
    
    /**
     * Get message type name
     */
    getMessageTypeName(type) {
        for (let [name, value] of Object.entries(this.MSG_TYPES)) {
            if (value === type) return name;
        }
        return `UNKNOWN (0x${type.toString(16).padStart(2, '0')})`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MUP1Protocol;
}