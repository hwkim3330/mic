/**
 * WebSerial API Handler for VelocityDRIVE-SP
 * Provides direct serial communication with devices
 */

class WebSerialHandler {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.keepReading = false;
        // MUP1Protocol will be loaded from velocitydrive-protocol.js
        this.mup1 = typeof MUP1Protocol !== 'undefined' ? new MUP1Protocol() : null;
        this.callbacks = {
            onConnect: null,
            onDisconnect: null,
            onData: null,
            onError: null
        };
    }
    
    /**
     * Check if WebSerial is supported
     */
    isSupported() {
        return 'serial' in navigator;
    }
    
    /**
     * Request and connect to serial port
     */
    async connect() {
        if (!this.isSupported()) {
            throw new Error('WebSerial API is not supported in this browser');
        }
        
        try {
            // Request port access
            this.port = await navigator.serial.requestPort();
            
            // Open port with VelocityDRIVE settings (115200 8N1)
            await this.port.open({
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none'
            });
            
            // Get reader and writer
            this.reader = this.port.readable.getReader();
            this.writer = this.port.writable.getWriter();
            
            // Start reading
            this.keepReading = true;
            this.readLoop();
            
            // Get port info
            const info = this.port.getInfo();
            
            if (this.callbacks.onConnect) {
                this.callbacks.onConnect({
                    usbVendorId: info.usbVendorId,
                    usbProductId: info.usbProductId
                });
            }
            
            // Send initial ping to test connection
            await this.sendPing();
            
            return true;
        } catch (error) {
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            throw error;
        }
    }
    
    /**
     * Disconnect from serial port
     */
    async disconnect() {
        this.keepReading = false;
        
        try {
            if (this.reader) {
                await this.reader.cancel();
                await this.reader.releaseLock();
                this.reader = null;
            }
            
            if (this.writer) {
                await this.writer.releaseLock();
                this.writer = null;
            }
            
            if (this.port) {
                await this.port.close();
                this.port = null;
            }
            
            if (this.callbacks.onDisconnect) {
                this.callbacks.onDisconnect();
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    }
    
    /**
     * Read data continuously
     */
    async readLoop() {
        while (this.keepReading) {
            try {
                const { value, done } = await this.reader.read();
                
                if (done) {
                    break;
                }
                
                // Process each byte through MUP1 protocol
                for (let byte of value) {
                    const frame = this.mup1.processByte(byte);
                    if (frame) {
                        const parsed = this.mup1.parseFrame(frame);
                        if (this.callbacks.onData) {
                            this.callbacks.onData(parsed);
                        }
                    }
                }
            } catch (error) {
                if (this.keepReading && this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
                break;
            }
        }
    }
    
    /**
     * Send raw data
     */
    async sendRaw(data) {
        if (!this.writer) {
            throw new Error('Not connected to serial port');
        }
        
        try {
            await this.writer.write(data);
        } catch (error) {
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            throw error;
        }
    }
    
    /**
     * Send MUP1 frame
     */
    async sendFrame(msgType, data) {
        const frame = this.mup1.encodeFrame(msgType, data);
        await this.sendRaw(frame);
    }
    
    /**
     * Send PING message
     */
    async sendPing() {
        const ping = this.mup1.createPing();
        await this.sendRaw(ping);
    }
    
    /**
     * Send CoAP message
     */
    async sendCoap(coapData) {
        const frame = this.mup1.createCoapMessage(coapData);
        await this.sendRaw(frame);
    }
    
    /**
     * Send System Request
     */
    async sendSystemRequest(requestData) {
        const frame = this.mup1.createSystemRequest(requestData);
        await this.sendRaw(frame);
    }
    
    /**
     * Get list of available ports (if permitted)
     */
    async getAvailablePorts() {
        if (!this.isSupported()) {
            return [];
        }
        
        try {
            const ports = await navigator.serial.getPorts();
            return ports.map(port => {
                const info = port.getInfo();
                return {
                    port: port,
                    usbVendorId: info.usbVendorId,
                    usbProductId: info.usbProductId
                };
            });
        } catch (error) {
            console.error('Error getting ports:', error);
            return [];
        }
    }
    
    /**
     * Set callback handlers
     */
    setCallbacks(callbacks) {
        Object.assign(this.callbacks, callbacks);
    }
    
    /**
     * Check if connected
     */
    isConnected() {
        return this.port !== null && this.reader !== null && this.writer !== null;
    }
}

// Create global instance
const webSerial = new WebSerialHandler();