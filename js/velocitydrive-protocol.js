/**
 * VelocityDRIVE-SP MUP1 Protocol Implementation
 * Based on actual Microchip implementation analysis
 * 
 * MUP1 (Microchip UART Protocol #1) is a proprietary protocol
 * for communicating with VelocityDRIVE-SP devices over UART
 */

class MUP1Protocol {
    constructor() {
        // Protocol constants from Ruby implementation
        this.MUP1_SOF = 0x3E;  // '>' Start of Frame
        this.MUP1_EOF = 0x3C;  // '<' End of Frame  
        this.MUP1_ESC = 0x5C;  // '\' Escape character
        this.MUP1_NL = 0x0D;   // Newline
        this.MUP1_00 = 0x30;   // Escape sequence for 0x00
        this.MUP1_FF = 0x46;   // Escape sequence for 0xFF
        
        // Message types (command characters)
        this.MUP1_CB_ANNOUNCE = 0x41;  // 'A' - Announcement
        this.MUP1_CB_COAP = 0x43;      // 'C' - CoAP message
        this.MUP1_CB_PING = 0x50;      // 'P' - Ping/Pong
        this.MUP1_CB_TRACE = 0x54;     // 'T' - Trace/Debug
        this.MUP1_CB_SYSREQ = 0x53;    // 'S' - System Request
        
        // Parser state
        this.state = 'init';
        this.rxBuffer = [];
        this.mup1Data = [];
        this.mup1Type = 0;
        this.checksum = [];
        
        // For tracking responses
        this.callbacks = new Map();
        this.timeout = 5000; // 5 second default timeout
    }
    
    /**
     * Encode data for MUP1 transmission
     * Handles escape sequences for special bytes
     */
    encodeData(data) {
        const encoded = [];
        
        for (let byte of data) {
            switch (byte) {
                case this.MUP1_SOF:
                case this.MUP1_EOF:
                case this.MUP1_ESC:
                    encoded.push(this.MUP1_ESC);
                    encoded.push(byte);
                    break;
                case 0x00:
                    encoded.push(this.MUP1_ESC);
                    encoded.push(this.MUP1_00);
                    break;
                case 0xFF:
                    encoded.push(this.MUP1_ESC);
                    encoded.push(this.MUP1_FF);
                    break;
                default:
                    encoded.push(byte);
            }
        }
        
        return encoded;
    }
    
    /**
     * Create MUP1 frame with proper formatting and checksum
     */
    createFrame(type, data = []) {
        // Encode the data with escape sequences
        const encodedData = this.encodeData(data);
        
        // Build frame
        const frame = [this.MUP1_SOF, type, ...encodedData];
        
        // Add EOF (double EOF if message size requires padding)
        frame.push(this.MUP1_EOF);
        
        // Odd-sized messages need double EOF for alignment
        if ((encodedData.length % 2) === 0) {
            frame.push(this.MUP1_EOF);
        }
        
        // Calculate and add checksum
        const checksum = this.calculateChecksum(frame);
        frame.push(...checksum);
        
        return new Uint8Array(frame);
    }
    
    /**
     * Calculate MUP1 checksum
     */
    calculateChecksum(data) {
        let sum = 0;
        for (let byte of data) {
            sum = (sum + byte) & 0xFFFF;
        }
        
        // Convert to 2-byte checksum
        const high = (sum >> 8) & 0xFF;
        const low = sum & 0xFF;
        
        // Encode checksum bytes
        const checksum = [];
        checksum.push(...this.encodeNibble(high));
        checksum.push(...this.encodeNibble(low));
        
        return checksum;
    }
    
    /**
     * Encode byte as two ASCII hex characters
     */
    encodeNibble(byte) {
        const hex = byte.toString(16).toUpperCase().padStart(2, '0');
        return [hex.charCodeAt(0), hex.charCodeAt(1)];
    }
    
    /**
     * Parse incoming MUP1 data stream
     */
    parseData(data) {
        const bytes = new Uint8Array(data);
        const frames = [];
        
        for (let byte of bytes) {
            const frame = this.parseStateMachine(byte);
            if (frame) {
                frames.push(frame);
            }
        }
        
        return frames;
    }
    
    /**
     * MUP1 parser state machine (based on Ruby implementation)
     */
    parseStateMachine(c) {
        switch (this.state) {
            case 'init':
                if (c === this.MUP1_SOF) {
                    this.state = 'sof';
                    this.mup1Data = [];
                    this.checksum = [];
                    this.mup1Type = 0;
                }
                break;
                
            case 'sof':
                this.mup1Type = c;
                this.state = 'data';
                break;
                
            case 'data':
                if (this.mup1Data.length > 1024) {
                    console.error('Frame too big!');
                    this.state = 'init';
                } else {
                    switch (c) {
                        case this.MUP1_ESC:
                            this.state = 'esc';
                            break;
                            
                        case this.MUP1_EOF:
                            if (this.mup1Data.length % 2 !== 0) {
                                // Odd sized message, single EOF
                                this.state = 'chk0';
                            } else {
                                // Even sized message, expect double EOF
                                this.state = 'eof2';
                            }
                            break;
                            
                        case this.MUP1_SOF:
                        case 0x00:
                        case 0xFF:
                            console.error(`Invalid data element: ${c}`);
                            this.state = 'init';
                            break;
                            
                        default:
                            this.mup1Data.push(c);
                    }
                }
                break;
                
            case 'esc':
                this.state = 'data';
                switch (c) {
                    case this.MUP1_SOF:
                    case this.MUP1_ESC:
                    case this.MUP1_EOF:
                        this.mup1Data.push(c);
                        break;
                    case this.MUP1_00:
                        this.mup1Data.push(0x00);
                        break;
                    case this.MUP1_FF:
                        this.mup1Data.push(0xFF);
                        break;
                    default:
                        console.error(`Invalid escape sequence: ${c}`);
                        this.state = 'init';
                }
                break;
                
            case 'eof2':
                if (c === this.MUP1_EOF) {
                    this.state = 'chk0';
                } else {
                    console.error(`Expected repeated EOF, got ${c}`);
                    this.state = 'init';
                }
                break;
                
            case 'chk0':
            case 'chk1':
            case 'chk2':
            case 'chk3':
                this.checksum.push(c);
                if (this.checksum.length === 4) {
                    // Frame complete, validate checksum
                    const frame = {
                        type: this.mup1Type,
                        data: this.mup1Data,
                        checksum: this.checksum
                    };
                    this.state = 'init';
                    return frame;
                } else {
                    this.state = `chk${this.checksum.length}`;
                }
                break;
        }
        
        return null;
    }
    
    /**
     * Send PING message
     */
    createPing() {
        return this.createFrame(this.MUP1_CB_PING);
    }
    
    /**
     * Send TRACE message
     */
    createTrace(message) {
        const encoder = new TextEncoder();
        const data = Array.from(encoder.encode(message));
        return this.createFrame(this.MUP1_CB_TRACE, data);
    }
    
    /**
     * Send CoAP message wrapped in MUP1
     */
    createCoAP(coapData) {
        return this.createFrame(this.MUP1_CB_COAP, Array.from(coapData));
    }
    
    /**
     * Send System Request
     */
    createSysReq(command, payload = []) {
        const data = [command, ...payload];
        return this.createFrame(this.MUP1_CB_SYSREQ, data);
    }
    
    /**
     * Process received frame
     */
    processFrame(frame) {
        const result = {
            type: String.fromCharCode(frame.type),
            typeCode: frame.type,
            data: null,
            raw: frame.data
        };
        
        switch (frame.type) {
            case this.MUP1_CB_PING:
                result.data = 'PING/PONG';
                break;
                
            case this.MUP1_CB_ANNOUNCE:
                const decoder = new TextDecoder();
                result.data = decoder.decode(new Uint8Array(frame.data));
                break;
                
            case this.MUP1_CB_TRACE:
                const traceDecoder = new TextDecoder();
                result.data = traceDecoder.decode(new Uint8Array(frame.data));
                break;
                
            case this.MUP1_CB_COAP:
                // CoAP data remains as bytes for further processing
                result.data = new Uint8Array(frame.data);
                break;
                
            default:
                // Unknown type, try to decode as text
                try {
                    const textDecoder = new TextDecoder();
                    result.data = textDecoder.decode(new Uint8Array(frame.data));
                } catch (e) {
                    result.data = frame.data;
                }
        }
        
        return result;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MUP1Protocol;
}