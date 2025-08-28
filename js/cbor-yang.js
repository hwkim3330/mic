/**
 * CBOR Encoder/Decoder for YANG Data
 * Based on RFC 9254 - YANG to CBOR Mapping
 * Supports SID-based encoding for VelocityDRIVE-SP
 */

class CBORYANGCodec {
    constructor() {
        // CBOR Major Types
        this.MAJOR_TYPE = {
            UNSIGNED_INT: 0,
            NEGATIVE_INT: 1,
            BYTE_STRING: 2,
            TEXT_STRING: 3,
            ARRAY: 4,
            MAP: 5,
            TAG: 6,
            SIMPLE: 7
        };
        
        // CBOR Simple Values
        this.SIMPLE = {
            FALSE: 20,
            TRUE: 21,
            NULL: 22,
            UNDEFINED: 23
        };
        
        // YANG-CBOR Tags (RFC 9254)
        this.TAG = {
            YANG_BITS: 44,          // Bits datatype
            YANG_ENUMERATION: 45,   // Enumeration datatype
            YANG_IDENTITYREF: 46,   // Identityref datatype
            YANG_INSTANCE_ID: 47,   // Instance-identifier datatype
            YANG_SID: 256,          // SID-based identifier
            YANG_DELTA_SID: 257     // Delta SID encoding
        };
        
        // Common SIDs for VelocityDRIVE-SP
        this.KNOWN_SIDS = {
            // ietf-interfaces
            '/ietf-interfaces:interfaces': 1000,
            '/ietf-interfaces:interfaces/interface': 1001,
            '/ietf-interfaces:interfaces/interface/name': 1002,
            '/ietf-interfaces:interfaces/interface/type': 1003,
            '/ietf-interfaces:interfaces/interface/enabled': 1004,
            
            // ieee802-dot1q-bridge
            '/ieee802-dot1q-bridge:bridges': 2000,
            '/ieee802-dot1q-bridge:bridges/bridge': 2001,
            '/ieee802-dot1q-bridge:bridges/bridge/name': 2002,
            '/ieee802-dot1q-bridge:bridges/bridge/ports': 2003,
            
            // ieee1588-ptp
            '/ieee1588-ptp:ptp': 3000,
            '/ieee1588-ptp:ptp/instances': 3001,
            '/ieee1588-ptp:ptp/instances/instance': 3002,
            '/ieee1588-ptp:ptp/instances/instance/instance-index': 3003,
            
            // mchp-velocitysp specific
            '/mchp-velocitysp-port:eth-port': 4000,
            '/mchp-velocitysp-port:eth-qos': 4001,
            '/mchp-velocitysp-ptp:automotive': 4002,
            '/mchp-velocitysp-system:save-config': 4003,
            
            // ietf-constrained-yang-library
            '/ietf-constrained-yang-library:yang-library': 29300,
            '/ietf-constrained-yang-library:yang-library/checksum': 29304
        };
    }
    
    /**
     * Encode JavaScript value to CBOR
     */
    encode(value) {
        const bytes = [];
        this.encodeValue(value, bytes);
        return new Uint8Array(bytes);
    }
    
    /**
     * Encode a single value
     */
    encodeValue(value, bytes) {
        if (value === null || value === undefined) {
            bytes.push(0xF6); // null
        } else if (value === false) {
            bytes.push(0xF4); // false
        } else if (value === true) {
            bytes.push(0xF5); // true
        } else if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                if (value >= 0) {
                    this.encodeUnsignedInt(value, bytes);
                } else {
                    this.encodeNegativeInt(-value - 1, bytes);
                }
            } else {
                this.encodeFloat(value, bytes);
            }
        } else if (typeof value === 'string') {
            this.encodeString(value, bytes);
        } else if (value instanceof Uint8Array) {
            this.encodeByteString(value, bytes);
        } else if (Array.isArray(value)) {
            this.encodeArray(value, bytes);
        } else if (typeof value === 'object') {
            this.encodeMap(value, bytes);
        } else {
            throw new Error(`Cannot encode value of type ${typeof value}`);
        }
    }
    
    /**
     * Encode unsigned integer
     */
    encodeUnsignedInt(value, bytes) {
        if (value < 24) {
            bytes.push(value);
        } else if (value < 256) {
            bytes.push(24, value);
        } else if (value < 65536) {
            bytes.push(25, (value >> 8) & 0xFF, value & 0xFF);
        } else if (value < 4294967296) {
            bytes.push(26,
                (value >> 24) & 0xFF,
                (value >> 16) & 0xFF,
                (value >> 8) & 0xFF,
                value & 0xFF
            );
        } else {
            // For larger numbers, use 64-bit encoding
            const high = Math.floor(value / 4294967296);
            const low = value % 4294967296;
            bytes.push(27,
                (high >> 24) & 0xFF,
                (high >> 16) & 0xFF,
                (high >> 8) & 0xFF,
                high & 0xFF,
                (low >> 24) & 0xFF,
                (low >> 16) & 0xFF,
                (low >> 8) & 0xFF,
                low & 0xFF
            );
        }
    }
    
    /**
     * Encode negative integer
     */
    encodeNegativeInt(value, bytes) {
        const majorType = this.MAJOR_TYPE.NEGATIVE_INT << 5;
        if (value < 24) {
            bytes.push(majorType | value);
        } else if (value < 256) {
            bytes.push(majorType | 24, value);
        } else if (value < 65536) {
            bytes.push(majorType | 25, (value >> 8) & 0xFF, value & 0xFF);
        } else if (value < 4294967296) {
            bytes.push(majorType | 26,
                (value >> 24) & 0xFF,
                (value >> 16) & 0xFF,
                (value >> 8) & 0xFF,
                value & 0xFF
            );
        }
    }
    
    /**
     * Encode string
     */
    encodeString(str, bytes) {
        const encoded = new TextEncoder().encode(str);
        const majorType = this.MAJOR_TYPE.TEXT_STRING << 5;
        
        if (encoded.length < 24) {
            bytes.push(majorType | encoded.length);
        } else if (encoded.length < 256) {
            bytes.push(majorType | 24, encoded.length);
        } else if (encoded.length < 65536) {
            bytes.push(majorType | 25, 
                (encoded.length >> 8) & 0xFF, 
                encoded.length & 0xFF
            );
        } else {
            bytes.push(majorType | 26,
                (encoded.length >> 24) & 0xFF,
                (encoded.length >> 16) & 0xFF,
                (encoded.length >> 8) & 0xFF,
                encoded.length & 0xFF
            );
        }
        
        bytes.push(...encoded);
    }
    
    /**
     * Encode byte string
     */
    encodeByteString(data, bytes) {
        const majorType = this.MAJOR_TYPE.BYTE_STRING << 5;
        
        if (data.length < 24) {
            bytes.push(majorType | data.length);
        } else if (data.length < 256) {
            bytes.push(majorType | 24, data.length);
        } else if (data.length < 65536) {
            bytes.push(majorType | 25, 
                (data.length >> 8) & 0xFF, 
                data.length & 0xFF
            );
        } else {
            bytes.push(majorType | 26,
                (data.length >> 24) & 0xFF,
                (data.length >> 16) & 0xFF,
                (data.length >> 8) & 0xFF,
                data.length & 0xFF
            );
        }
        
        bytes.push(...data);
    }
    
    /**
     * Encode array
     */
    encodeArray(arr, bytes) {
        const majorType = this.MAJOR_TYPE.ARRAY << 5;
        
        if (arr.length < 24) {
            bytes.push(majorType | arr.length);
        } else if (arr.length < 256) {
            bytes.push(majorType | 24, arr.length);
        } else if (arr.length < 65536) {
            bytes.push(majorType | 25, 
                (arr.length >> 8) & 0xFF, 
                arr.length & 0xFF
            );
        }
        
        for (const item of arr) {
            this.encodeValue(item, bytes);
        }
    }
    
    /**
     * Encode map
     */
    encodeMap(obj, bytes) {
        const keys = Object.keys(obj);
        const majorType = this.MAJOR_TYPE.MAP << 5;
        
        if (keys.length < 24) {
            bytes.push(majorType | keys.length);
        } else if (keys.length < 256) {
            bytes.push(majorType | 24, keys.length);
        } else if (keys.length < 65516) {
            bytes.push(majorType | 25, 
                (keys.length >> 8) & 0xFF, 
                keys.length & 0xFF
            );
        }
        
        // Sort keys for canonical encoding
        keys.sort();
        
        for (const key of keys) {
            // Check if key is a YANG path that should be SID-encoded
            if (key.startsWith('/') && this.KNOWN_SIDS[key]) {
                this.encodeSID(this.KNOWN_SIDS[key], bytes);
            } else {
                this.encodeValue(key, bytes);
            }
            this.encodeValue(obj[key], bytes);
        }
    }
    
    /**
     * Encode SID
     */
    encodeSID(sid, bytes) {
        // Use tagged SID encoding
        bytes.push(0xD9, 0x01, 0x00); // Tag 256 (YANG_SID)
        this.encodeUnsignedInt(sid, bytes);
    }
    
    /**
     * Encode float
     */
    encodeFloat(value, bytes) {
        // Use 64-bit float encoding
        bytes.push(0xFB); // Float64
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setFloat64(0, value, false); // big-endian
        bytes.push(...new Uint8Array(buffer));
    }
    
    /**
     * Decode CBOR to JavaScript value
     */
    decode(data) {
        const bytes = new Uint8Array(data);
        const result = this.decodeValue(bytes, 0);
        return result.value;
    }
    
    /**
     * Decode a single value
     */
    decodeValue(bytes, offset) {
        if (offset >= bytes.length) {
            throw new Error('Unexpected end of CBOR data');
        }
        
        const initialByte = bytes[offset];
        const majorType = (initialByte >> 5) & 0x07;
        const additionalInfo = initialByte & 0x1F;
        
        switch (majorType) {
            case this.MAJOR_TYPE.UNSIGNED_INT:
                return this.decodeUnsignedInt(bytes, offset);
                
            case this.MAJOR_TYPE.NEGATIVE_INT:
                const result = this.decodeUnsignedInt(bytes, offset);
                return { value: -1 - result.value, offset: result.offset };
                
            case this.MAJOR_TYPE.BYTE_STRING:
                return this.decodeByteString(bytes, offset);
                
            case this.MAJOR_TYPE.TEXT_STRING:
                return this.decodeTextString(bytes, offset);
                
            case this.MAJOR_TYPE.ARRAY:
                return this.decodeArray(bytes, offset);
                
            case this.MAJOR_TYPE.MAP:
                return this.decodeMap(bytes, offset);
                
            case this.MAJOR_TYPE.TAG:
                return this.decodeTagged(bytes, offset);
                
            case this.MAJOR_TYPE.SIMPLE:
                return this.decodeSimple(bytes, offset);
                
            default:
                throw new Error(`Unknown CBOR major type: ${majorType}`);
        }
    }
    
    /**
     * Decode unsigned integer
     */
    decodeUnsignedInt(bytes, offset) {
        const additionalInfo = bytes[offset] & 0x1F;
        
        if (additionalInfo < 24) {
            return { value: additionalInfo, offset: offset + 1 };
        } else if (additionalInfo === 24) {
            return { value: bytes[offset + 1], offset: offset + 2 };
        } else if (additionalInfo === 25) {
            const value = (bytes[offset + 1] << 8) | bytes[offset + 2];
            return { value, offset: offset + 3 };
        } else if (additionalInfo === 26) {
            const value = (bytes[offset + 1] << 24) |
                         (bytes[offset + 2] << 16) |
                         (bytes[offset + 3] << 8) |
                         bytes[offset + 4];
            return { value, offset: offset + 5 };
        } else if (additionalInfo === 27) {
            // 64-bit integer - convert to JavaScript number (may lose precision)
            let value = 0;
            for (let i = 0; i < 8; i++) {
                value = value * 256 + bytes[offset + 1 + i];
            }
            return { value, offset: offset + 9 };
        } else {
            throw new Error(`Invalid additional info for integer: ${additionalInfo}`);
        }
    }
    
    /**
     * Decode byte string
     */
    decodeByteString(bytes, offset) {
        const lengthResult = this.decodeLength(bytes, offset);
        const start = lengthResult.offset;
        const end = start + lengthResult.length;
        
        if (end > bytes.length) {
            throw new Error('Byte string extends beyond CBOR data');
        }
        
        return {
            value: bytes.slice(start, end),
            offset: end
        };
    }
    
    /**
     * Decode text string
     */
    decodeTextString(bytes, offset) {
        const lengthResult = this.decodeLength(bytes, offset);
        const start = lengthResult.offset;
        const end = start + lengthResult.length;
        
        if (end > bytes.length) {
            throw new Error('Text string extends beyond CBOR data');
        }
        
        const decoder = new TextDecoder();
        return {
            value: decoder.decode(bytes.slice(start, end)),
            offset: end
        };
    }
    
    /**
     * Decode array
     */
    decodeArray(bytes, offset) {
        const lengthResult = this.decodeLength(bytes, offset);
        const arr = [];
        let currentOffset = lengthResult.offset;
        
        for (let i = 0; i < lengthResult.length; i++) {
            const result = this.decodeValue(bytes, currentOffset);
            arr.push(result.value);
            currentOffset = result.offset;
        }
        
        return { value: arr, offset: currentOffset };
    }
    
    /**
     * Decode map
     */
    decodeMap(bytes, offset) {
        const lengthResult = this.decodeLength(bytes, offset);
        const map = {};
        let currentOffset = lengthResult.offset;
        
        for (let i = 0; i < lengthResult.length; i++) {
            // Decode key
            const keyResult = this.decodeValue(bytes, currentOffset);
            currentOffset = keyResult.offset;
            
            // Decode value
            const valueResult = this.decodeValue(bytes, currentOffset);
            currentOffset = valueResult.offset;
            
            // Handle SID keys
            let key = keyResult.value;
            if (typeof key === 'object' && key.tag === 256) {
                // Look up SID
                for (const [path, sid] of Object.entries(this.KNOWN_SIDS)) {
                    if (sid === key.value) {
                        key = path;
                        break;
                    }
                }
                if (typeof key === 'object') {
                    key = `SID:${key.value}`;
                }
            }
            
            map[key] = valueResult.value;
        }
        
        return { value: map, offset: currentOffset };
    }
    
    /**
     * Decode tagged value
     */
    decodeTagged(bytes, offset) {
        const tagResult = this.decodeUnsignedInt(bytes, offset);
        const valueResult = this.decodeValue(bytes, tagResult.offset);
        
        // Handle specific tags
        if (tagResult.value === 256 || tagResult.value === 257) {
            // SID or Delta SID
            return {
                value: { tag: tagResult.value, value: valueResult.value },
                offset: valueResult.offset
            };
        }
        
        return {
            value: { tag: tagResult.value, value: valueResult.value },
            offset: valueResult.offset
        };
    }
    
    /**
     * Decode simple value
     */
    decodeSimple(bytes, offset) {
        const additionalInfo = bytes[offset] & 0x1F;
        
        if (additionalInfo === 20) {
            return { value: false, offset: offset + 1 };
        } else if (additionalInfo === 21) {
            return { value: true, offset: offset + 1 };
        } else if (additionalInfo === 22) {
            return { value: null, offset: offset + 1 };
        } else if (additionalInfo === 23) {
            return { value: undefined, offset: offset + 1 };
        } else if (additionalInfo === 27) {
            // 64-bit float
            const buffer = bytes.slice(offset + 1, offset + 9);
            const view = new DataView(buffer.buffer, buffer.byteOffset, 8);
            return { value: view.getFloat64(0, false), offset: offset + 9 };
        } else {
            throw new Error(`Unknown simple value: ${additionalInfo}`);
        }
    }
    
    /**
     * Decode length
     */
    decodeLength(bytes, offset) {
        const additionalInfo = bytes[offset] & 0x1F;
        
        if (additionalInfo < 24) {
            return { length: additionalInfo, offset: offset + 1 };
        } else if (additionalInfo === 24) {
            return { length: bytes[offset + 1], offset: offset + 2 };
        } else if (additionalInfo === 25) {
            const length = (bytes[offset + 1] << 8) | bytes[offset + 2];
            return { length, offset: offset + 3 };
        } else if (additionalInfo === 26) {
            const length = (bytes[offset + 1] << 24) |
                          (bytes[offset + 2] << 16) |
                          (bytes[offset + 3] << 8) |
                          bytes[offset + 4];
            return { length, offset: offset + 5 };
        } else {
            throw new Error(`Invalid length encoding: ${additionalInfo}`);
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CBORYANGCodec;
}