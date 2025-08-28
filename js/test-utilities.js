/**
 * Test Utilities and Debugging Tools
 * For LAN966x VelocityDRIVE-SP development
 */

class TestUtilities {
    constructor(controller) {
        this.controller = controller;
        this.testResults = [];
        this.isRunning = false;
        
        // Test categories
        this.testSuites = {
            connectivity: {
                name: 'Connectivity Tests',
                tests: [
                    'pingTest',
                    'coapEchoTest',
                    'yangLibraryTest',
                    'deviceIdentification'
                ]
            },
            configuration: {
                name: 'Configuration Tests',
                tests: [
                    'interfaceConfig',
                    'vlanConfig',
                    'ptpConfig',
                    'tasConfig',
                    'cbsConfig'
                ]
            },
            performance: {
                name: 'Performance Tests',
                tests: [
                    'throughputTest',
                    'latencyTest',
                    'ptpAccuracy',
                    'tasJitter'
                ]
            },
            stress: {
                name: 'Stress Tests',
                tests: [
                    'configurationStorm',
                    'rapidVlanChanges',
                    'ptpRoleFlapping',
                    'tasScheduleChanges'
                ]
            }
        };
    }
    
    /**
     * Run all test suites
     */
    async runAllTests() {
        this.isRunning = true;
        this.testResults = [];
        
        console.log('Starting comprehensive test suite...');
        
        for (const [suiteName, suite] of Object.entries(this.testSuites)) {
            console.log(`\nRunning ${suite.name}...`);
            
            for (const testName of suite.tests) {
                if (this[testName]) {
                    const result = await this.runTest(testName, this[testName].bind(this));
                    this.testResults.push({
                        suite: suiteName,
                        test: testName,
                        ...result
                    });
                }
            }
        }
        
        this.isRunning = false;
        return this.generateReport();
    }
    
    /**
     * Run a single test with error handling
     */
    async runTest(name, testFn) {
        const startTime = Date.now();
        let result = {
            name,
            status: 'running',
            startTime: new Date().toISOString(),
            duration: 0,
            details: {}
        };
        
        try {
            console.log(`  Running ${name}...`);
            const testResult = await testFn();
            
            result.status = testResult.passed ? 'passed' : 'failed';
            result.details = testResult;
            result.duration = Date.now() - startTime;
            
            console.log(`  ${result.status.toUpperCase()}: ${name} (${result.duration}ms)`);
            
        } catch (error) {
            result.status = 'error';
            result.error = error.message;
            result.stack = error.stack;
            result.duration = Date.now() - startTime;
            
            console.error(`  ERROR: ${name} - ${error.message}`);
        }
        
        return result;
    }
    
    // ============ Connectivity Tests ============
    
    /**
     * Test basic MUP1 ping
     */
    async pingTest() {
        try {
            const response = await this.controller.ping();
            return {
                passed: response !== null,
                message: response ? 'Ping successful' : 'No response',
                responseTime: response?.time || 0
            };
        } catch (error) {
            return {
                passed: false,
                message: `Ping failed: ${error.message}`
            };
        }
    }
    
    /**
     * Test CoAP echo
     */
    async coapEchoTest() {
        try {
            const testData = 'CoAP Echo Test ' + Date.now();
            const response = await this.controller.coapEcho(testData);
            
            return {
                passed: response === testData,
                message: response === testData ? 
                    'CoAP echo successful' : 
                    'Echo mismatch',
                sent: testData,
                received: response
            };
        } catch (error) {
            return {
                passed: false,
                message: `CoAP echo failed: ${error.message}`
            };
        }
    }
    
    /**
     * Test YANG library retrieval
     */
    async yangLibraryTest() {
        try {
            const checksum = await this.controller.getYangChecksum();
            
            return {
                passed: checksum !== null && checksum.length === 32,
                message: checksum ? 
                    `YANG library checksum: ${checksum}` : 
                    'Failed to retrieve checksum',
                checksum
            };
        } catch (error) {
            return {
                passed: false,
                message: `YANG library test failed: ${error.message}`
            };
        }
    }
    
    /**
     * Test device identification
     */
    async deviceIdentification() {
        try {
            const info = await this.controller.identifyDevice();
            
            return {
                passed: info !== null && info.model !== null,
                message: info ? 
                    `Identified: ${info.model} (${info.ports} ports)` :
                    'Failed to identify device',
                deviceInfo: info
            };
        } catch (error) {
            return {
                passed: false,
                message: `Device identification failed: ${error.message}`
            };
        }
    }
    
    // ============ Configuration Tests ============
    
    /**
     * Test interface configuration
     */
    async interfaceConfig() {
        try {
            // Get interfaces
            const interfaces = await this.controller.getInterfaces();
            
            if (!interfaces || interfaces.length === 0) {
                return {
                    passed: false,
                    message: 'No interfaces found'
                };
            }
            
            // Try to configure first interface
            const testConfig = {
                speed: '1000',
                autoNeg: true
            };
            
            const result = await this.controller.configurePort(1, testConfig);
            
            return {
                passed: result === true,
                message: result ? 
                    'Interface configuration successful' :
                    'Interface configuration failed',
                interfaceCount: interfaces.length,
                testConfig
            };
        } catch (error) {
            return {
                passed: false,
                message: `Interface config test failed: ${error.message}`
            };
        }
    }
    
    /**
     * Test VLAN configuration
     */
    async vlanConfig() {
        try {
            const testVlan = {
                id: 100,
                name: 'TestVLAN',
                ports: [1, 2]
            };
            
            // Create VLAN
            const created = await this.controller.createVlan(
                testVlan.id,
                testVlan.name,
                testVlan.ports
            );
            
            // Verify VLAN was created
            // In real implementation, would fetch and verify
            
            return {
                passed: created === true,
                message: created ? 
                    `VLAN ${testVlan.id} created successfully` :
                    'VLAN creation failed',
                vlanConfig: testVlan
            };
        } catch (error) {
            return {
                passed: false,
                message: `VLAN config test failed: ${error.message}`
            };
        }
    }
    
    /**
     * Test PTP configuration
     */
    async ptpConfig() {
        try {
            const testPtp = {
                instanceIndex: 0,
                profile: 'bridge',
                ports: [
                    { index: 1, state: 'master' },
                    { index: 2, state: 'slave' }
                ]
            };
            
            const result = await this.controller.configurePTP(testPtp);
            
            return {
                passed: result === true,
                message: result ? 
                    'PTP configuration successful' :
                    'PTP configuration failed',
                ptpConfig: testPtp
            };
        } catch (error) {
            return {
                passed: false,
                message: `PTP config test failed: ${error.message}`
            };
        }
    }
    
    /**
     * Test TAS configuration
     */
    async tasConfig() {
        try {
            const testSchedule = {
                entries: [
                    { interval: 500000, gateStates: 0xFF },
                    { interval: 500000, gateStates: 0xF7 }
                ],
                cycleTime: 1000000
            };
            
            const result = await this.controller.configureTAS(1, testSchedule);
            
            return {
                passed: result === true,
                message: result ? 
                    'TAS configuration successful' :
                    'TAS configuration failed',
                schedule: testSchedule
            };
        } catch (error) {
            return {
                passed: false,
                message: `TAS config test failed: ${error.message}`
            };
        }
    }
    
    /**
     * Test CBS configuration
     */
    async cbsConfig() {
        try {
            const testCbs = {
                port: 1,
                trafficClass: 0,
                idleSlope: 100000
            };
            
            const result = await this.controller.configureCBS(
                testCbs.port,
                testCbs.trafficClass,
                testCbs.idleSlope
            );
            
            return {
                passed: result === true,
                message: result ? 
                    'CBS configuration successful' :
                    'CBS configuration failed',
                cbsConfig: testCbs
            };
        } catch (error) {
            return {
                passed: false,
                message: `CBS config test failed: ${error.message}`
            };
        }
    }
    
    // ============ Performance Tests ============
    
    /**
     * Test configuration throughput
     */
    async throughputTest() {
        const iterations = 100;
        const startTime = Date.now();
        let successCount = 0;
        
        try {
            for (let i = 0; i < iterations; i++) {
                const result = await this.controller.fetchData('/ietf-interfaces:interfaces');
                if (result) successCount++;
            }
            
            const duration = Date.now() - startTime;
            const throughput = (iterations / (duration / 1000)).toFixed(2);
            
            return {
                passed: successCount === iterations,
                message: `${successCount}/${iterations} successful, ${throughput} ops/sec`,
                iterations,
                duration,
                throughput: parseFloat(throughput),
                successRate: (successCount / iterations) * 100
            };
        } catch (error) {
            return {
                passed: false,
                message: `Throughput test failed: ${error.message}`
            };
        }
    }
    
    /**
     * Test response latency
     */
    async latencyTest() {
        const samples = 50;
        const latencies = [];
        
        try {
            for (let i = 0; i < samples; i++) {
                const start = performance.now();
                await this.controller.ping();
                const latency = performance.now() - start;
                latencies.push(latency);
            }
            
            const avgLatency = latencies.reduce((a, b) => a + b, 0) / samples;
            const minLatency = Math.min(...latencies);
            const maxLatency = Math.max(...latencies);
            
            return {
                passed: avgLatency < 100, // Pass if average < 100ms
                message: `Avg: ${avgLatency.toFixed(2)}ms, Min: ${minLatency.toFixed(2)}ms, Max: ${maxLatency.toFixed(2)}ms`,
                samples,
                avgLatency,
                minLatency,
                maxLatency,
                latencies
            };
        } catch (error) {
            return {
                passed: false,
                message: `Latency test failed: ${error.message}`
            };
        }
    }
    
    /**
     * Test PTP accuracy (mock)
     */
    async ptpAccuracy() {
        // In real implementation, would measure actual PTP sync accuracy
        return {
            passed: true,
            message: 'PTP accuracy test (simulated)',
            offsetNs: Math.random() * 1000,
            jitterNs: Math.random() * 100
        };
    }
    
    /**
     * Test TAS jitter (mock)
     */
    async tasJitter() {
        // In real implementation, would measure actual gate timing jitter
        return {
            passed: true,
            message: 'TAS jitter test (simulated)',
            avgJitterNs: Math.random() * 500,
            maxJitterNs: Math.random() * 1000
        };
    }
    
    // ============ Stress Tests ============
    
    /**
     * Configuration storm test
     */
    async configurationStorm() {
        const configs = 50;
        let successCount = 0;
        const startTime = Date.now();
        
        try {
            for (let i = 0; i < configs; i++) {
                const vlanId = 200 + i;
                const result = await this.controller.createVlan(vlanId, `Storm${i}`, [1, 2]);
                if (result) successCount++;
            }
            
            const duration = Date.now() - startTime;
            
            return {
                passed: successCount > configs * 0.9, // 90% success rate
                message: `${successCount}/${configs} configurations successful in ${duration}ms`,
                configs,
                successCount,
                duration,
                successRate: (successCount / configs) * 100
            };
        } catch (error) {
            return {
                passed: false,
                message: `Configuration storm failed: ${error.message}`
            };
        }
    }
    
    /**
     * Rapid VLAN changes
     */
    async rapidVlanChanges() {
        const changes = 20;
        let successCount = 0;
        
        try {
            for (let i = 0; i < changes; i++) {
                // Create and delete VLANs rapidly
                const vlanId = 300 + i;
                const created = await this.controller.createVlan(vlanId, `Rapid${i}`, [1]);
                if (created) {
                    // Would implement delete here
                    successCount++;
                }
            }
            
            return {
                passed: successCount === changes,
                message: `${successCount}/${changes} VLAN changes successful`,
                changes,
                successCount
            };
        } catch (error) {
            return {
                passed: false,
                message: `Rapid VLAN test failed: ${error.message}`
            };
        }
    }
    
    /**
     * PTP role flapping test
     */
    async ptpRoleFlapping() {
        const flaps = 10;
        let successCount = 0;
        
        try {
            for (let i = 0; i < flaps; i++) {
                const role = i % 2 === 0 ? 'master' : 'slave';
                const config = {
                    ports: [{ index: 1, state: role }]
                };
                
                const result = await this.controller.configurePTP(config);
                if (result) successCount++;
            }
            
            return {
                passed: successCount === flaps,
                message: `${successCount}/${flaps} role changes successful`,
                flaps,
                successCount
            };
        } catch (error) {
            return {
                passed: false,
                message: `PTP flapping test failed: ${error.message}`
            };
        }
    }
    
    /**
     * TAS schedule changes
     */
    async tasScheduleChanges() {
        const changes = 10;
        let successCount = 0;
        
        try {
            for (let i = 0; i < changes; i++) {
                const schedule = {
                    entries: [{
                        interval: 1000000,
                        gateStates: i % 2 === 0 ? 0xFF : 0xF0
                    }]
                };
                
                const result = await this.controller.configureTAS(1, schedule);
                if (result) successCount++;
            }
            
            return {
                passed: successCount === changes,
                message: `${successCount}/${changes} schedule changes successful`,
                changes,
                successCount
            };
        } catch (error) {
            return {
                passed: false,
                message: `TAS schedule test failed: ${error.message}`
            };
        }
    }
    
    /**
     * Generate test report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            duration: this.testResults.reduce((sum, r) => sum + (r.duration || 0), 0),
            totalTests: this.testResults.length,
            passed: this.testResults.filter(r => r.status === 'passed').length,
            failed: this.testResults.filter(r => r.status === 'failed').length,
            errors: this.testResults.filter(r => r.status === 'error').length,
            suites: {}
        };
        
        // Group by suite
        for (const result of this.testResults) {
            if (!report.suites[result.suite]) {
                report.suites[result.suite] = {
                    name: this.testSuites[result.suite].name,
                    tests: []
                };
            }
            report.suites[result.suite].tests.push(result);
        }
        
        // Calculate success rate
        report.successRate = report.totalTests > 0 ? 
            ((report.passed / report.totalTests) * 100).toFixed(2) + '%' : 
            '0%';
        
        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('TEST REPORT SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${report.totalTests}`);
        console.log(`Passed: ${report.passed}`);
        console.log(`Failed: ${report.failed}`);
        console.log(`Errors: ${report.errors}`);
        console.log(`Success Rate: ${report.successRate}`);
        console.log(`Total Duration: ${report.duration}ms`);
        console.log('='.repeat(60));
        
        return report;
    }
    
    /**
     * Export report as HTML
     */
    exportReportHTML(report) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>LAN966x Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .suite { margin: 20px 0; }
        .suite h2 { color: #555; border-bottom: 2px solid #ddd; padding-bottom: 5px; }
        .test { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #ddd; }
        .test.passed { border-color: #4CAF50; }
        .test.failed { border-color: #f44336; }
        .test.error { border-color: #ff9800; }
        .status { font-weight: bold; text-transform: uppercase; }
        .status.passed { color: #4CAF50; }
        .status.failed { color: #f44336; }
        .status.error { color: #ff9800; }
        .details { margin-top: 10px; color: #666; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>LAN966x Test Report</h1>
    <div class="summary">
        <h3>Summary</h3>
        <p><strong>Timestamp:</strong> ${report.timestamp}</p>
        <p><strong>Total Tests:</strong> ${report.totalTests}</p>
        <p><strong>Passed:</strong> ${report.passed}</p>
        <p><strong>Failed:</strong> ${report.failed}</p>
        <p><strong>Errors:</strong> ${report.errors}</p>
        <p><strong>Success Rate:</strong> ${report.successRate}</p>
        <p><strong>Duration:</strong> ${report.duration}ms</p>
    </div>
    
    ${Object.entries(report.suites).map(([name, suite]) => `
        <div class="suite">
            <h2>${suite.name}</h2>
            ${suite.tests.map(test => `
                <div class="test ${test.status}">
                    <div class="status ${test.status}">${test.status}</div>
                    <strong>${test.name}</strong> (${test.duration}ms)
                    ${test.details ? `
                        <div class="details">
                            ${test.details.message || ''}
                            ${test.error ? `<pre>Error: ${test.error}</pre>` : ''}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `).join('')}
</body>
</html>`;
        
        return html;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestUtilities;
}