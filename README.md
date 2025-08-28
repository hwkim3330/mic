# VelocityDRIVE Control Panel

Web-based control interface for Microchip VelocityDRIVE-SP devices.

## Features

- **Device Connection**: Connect to VelocityDRIVE devices via serial port
- **Device Information**: View platform, firmware, and device type information
- **YANG Operations**: Get, Set, Delete data and call RPC/Actions
- **CoAP Protocol**: Send CoAP messages to the device
- **Firmware Management**: View version and update firmware
- **Real-time Console**: Monitor all operations and responses

## Installation

### Prerequisites

- Node.js (v14 or higher)
- Microchip VelocityDRIVE CT CLI installed
- VelocityDRIVE device connected via serial port

### Setup

1. Clone the repository:
```bash
git clone https://github.com/hwkim3330/mic.git
cd mic
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

Visit GitHub Pages: https://hwkim3330.github.io/mic/

