# LAN966x VelocityDRIVE-SP Control Interface

Web-based control interface for Microchip LAN9662/LAN9692 Ethernet switches using the VelocityDRIVE-SP platform.

## Overview

This project provides a browser-based interface for controlling and monitoring Microchip's LAN966x series switches (LAN9662, LAN9668, LAN9692) through the WebSerial API. It implements the MUP1 (Microchip UART Protocol #1) protocol for direct serial communication with devices running VelocityDRIVE-SP firmware.

## Supported Devices

- **LAN9662**: 2-port Gigabit Ethernet switch
- **LAN9668**: 8-port Gigabit Ethernet switch  
- **LAN9692**: 12-port Multi-Gigabit Ethernet switch (up to 10G)

## Features

### Core Functionality
- ✅ WebSerial API integration for browser-based serial communication
- ✅ MUP1 protocol implementation with proper framing and checksums
- ✅ CoAP/CORECONF support for device configuration (RFC 7252, RFC 9254)
- ✅ YANG data model browser with CBOR encoding
- ✅ Real-time device monitoring and statistics

### Network Configuration
- Port configuration (speed, duplex, auto-negotiation)
- VLAN management (creation, port assignment, tagging)
- Bridge configuration
- MAC address table management

### TSN (Time-Sensitive Networking) Features
- IEEE 1588 PTP (Precision Time Protocol) configuration
- IEEE 802.1Qbv TAS (Time Aware Scheduler) setup
- IEEE 802.1Qav CBS (Credit Based Shaper) configuration
- IEEE 802.1CB FRER (Frame Replication and Elimination)

### Advanced Features
- YANG schema browser with SID support
- CoAP console for direct protocol testing
- Configuration backup/restore
- Real-time performance monitoring

## Protocol Implementation

### MUP1 (Microchip UART Protocol #1)

The MUP1 protocol is a proprietary framing protocol used by VelocityDRIVE-SP devices for UART communication.

#### Frame Structure
```
>TYPE[DATA]<[<]CHECKSUM
```

- **SOF (Start of Frame)**: `0x3E` (`>`)
- **TYPE**: Single byte command character
  - `A` (0x41): Announcement
  - `C` (0x43): CoAP message
  - `P` (0x50): Ping/Pong
  - `T` (0x54): Trace/Debug
  - `S` (0x53): System Request
- **DATA**: Variable length payload with escape sequences
- **EOF (End of Frame)**: `0x3C` (`<`)
  - Single EOF for odd-sized messages
  - Double EOF for even-sized messages (alignment)
- **CHECKSUM**: 4-byte ASCII hex representation of 16-bit checksum

#### Escape Sequences
Special bytes are escaped with `0x5C` (`\`):
- `0x00` → `\0` (0x5C 0x30)
- `0xFF` → `\F` (0x5C 0x46)
- `0x3E` → `\>` (0x5C 0x3E)
- `0x3C` → `\<` (0x5C 0x3C)
- `0x5C` → `\\` (0x5C 0x5C)

#### Checksum Calculation
1. Sum all frame bytes (before checksum) as 16-bit values
2. Add carry bits twice to handle overflow
3. Take one's complement
4. Convert to 4-character ASCII hex string

### CoAP Integration

The interface uses CoAP (Constrained Application Protocol) for device management:
- **GET**: Retrieve configuration and status
- **PUT**: Update configuration
- **POST**: Create new resources
- **DELETE**: Remove resources
- **FETCH**: Query with CBOR-encoded filters

### YANG/CBOR Encoding

Configuration data uses YANG models with CBOR encoding:
- SID (Structure IDentifier) based addressing
- Compact binary representation
- Schema validation support

## Installation

### Prerequisites
- Modern web browser with WebSerial API support (Chrome/Edge 89+)
- USB or serial connection to LAN966x device
- Device running VelocityDRIVE-SP firmware

### Setup
1. Clone the repository:
```bash
git clone https://github.com/hwkim3330/lan966x-control.git
cd lan966x-control
```

2. Serve the files using any web server:
```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx http-server
```

3. Open in browser:
```
http://localhost:8000
```

## Usage

### Connecting to Device

1. Open the web interface in a supported browser
2. Click "Connect" in the Connection page
3. Select the serial port for your LAN966x device
4. The interface will automatically detect the device model

### Basic Configuration

#### Configure Port Speed
```javascript
// Example: Set port 1 to 1Gbps, full duplex
controller.configurePort(1, {
    speed: '1000',
    duplex: 'full',
    autoNeg: false
});
```

#### Create VLAN
```javascript
// Create VLAN 100 with ports 1-4
controller.createVlan(100, 'Production', [1, 2, 3, 4]);
```

#### Configure PTP
```javascript
// Enable PTP with automotive profile
controller.configurePTP({
    profile: 'automotive',
    ports: [
        { index: 1, state: 'master' },
        { index: 2, state: 'slave' }
    ]
});
```

## Architecture

```
┌─────────────────┐
│   Web Browser   │
│                 │
│  ┌───────────┐  │
│  │    UI     │  │     
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │Controller │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │WebSerial  │  │
│  └─────┬─────┘  │
└────────┼────────┘
         │
    Serial/USB
         │
┌────────▼────────┐
│  LAN966x Device │
│                 │
│ ┌─────────────┐ │
│ │    MUP1     │ │
│ └──────┬──────┘ │
│        │        │
│ ┌──────▼──────┐ │
│ │CoAP/CORECONF│ │
│ └──────┬──────┘ │
│        │        │
│ ┌──────▼──────┐ │
│ │ YANG Models │ │
│ └─────────────┘ │
└─────────────────┘
```

## Development

### Project Structure
```
lan966x-control/
├── index.html              # Main HTML file
├── styles.css              # UI styles
├── js/
│   ├── velocitydrive-protocol.js  # MUP1 protocol implementation
│   ├── lan966x-controller.js      # Device controller
│   ├── coap-client.js            # CoAP protocol handler
│   ├── webserial.js              # WebSerial API wrapper
│   ├── yang-browser.js           # YANG model browser
│   ├── pages.js                  # Page templates
│   └── app.js                    # Main application
└── README.md
```

### Protocol Reverse Engineering Notes

The MUP1 protocol was reverse-engineered from:
1. Ruby implementation in `velocitydrivesp-support/support/libeasy/handler/mup1.rb`
2. mup1cc script showing practical usage
3. YAML configuration examples demonstrating data structures

Key findings:
- Checksum is one's complement of 16-bit sum, not CRC
- Even-sized messages require double EOF for alignment
- Escape sequences use specific byte values (0x30 for 0x00, 0x46 for 0xFF)
- CoAP integration uses CBOR encoding with SID-based addressing

## References

### Standards
- [RFC 7252](https://datatracker.ietf.org/doc/html/rfc7252) - The Constrained Application Protocol (CoAP)
- [RFC 9254](https://datatracker.ietf.org/doc/html/rfc9254) - YANG to CBOR Mapping
- [RFC 8040](https://datatracker.ietf.org/doc/html/rfc8040) - RESTCONF Protocol
- IEEE 802.1Q - Virtual LANs
- IEEE 1588 - Precision Time Protocol
- IEEE 802.1Qbv - Time Aware Scheduler
- IEEE 802.1CB - Frame Replication and Elimination

### Microchip Documentation
- [LAN9662 Product Page](https://www.microchip.com/en-us/product/lan9662)
- [LAN9692 Product Page](https://www.microchip.com/en-us/product/lan9692)
- [VelocityDRIVE-SP Platform](https://www.microchip.com/velocitydrive)

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please submit pull requests or open issues for bugs and feature requests.

## Acknowledgments

- Based on analysis of Microchip's VelocityDRIVE-SP support tools
- WebSerial API for enabling browser-based serial communication
- CoAP/CORECONF community for protocol specifications