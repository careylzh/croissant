#!/usr/bin/env node

/**
 * Test script for SonarQube integration
 * Run with: node test-sonarqube-integration.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Test functions
async function testSonarQubeStatus() {
  console.log('🔍 Testing SonarQube status endpoint...');
  
  try {
    const response = await makeRequest('/sonarqube-status', 'GET');
    console.log('✅ SonarQube status:', response);
    return response.running;
  } catch (error) {
    console.log('❌ SonarQube status check failed:', error.message);
    return false;
  }
}

async function testSecurityScan() {
  console.log('🔍 Testing security scan endpoint...');
  
  try {
    const scanData = {
      repoPath: process.cwd(),
      branchName: 'main'
    };
    
    const response = await makeRequest('/security-scan', 'POST', scanData);
    console.log('✅ Security scan response:', response);
    return true;
  } catch (error) {
    console.log('❌ Security scan test failed:', error.message);
    return false;
  }
}

async function testScanHistory() {
  console.log('🔍 Testing scan history endpoint...');
  
  try {
    const response = await makeRequest('/security-scan-history', 'GET');
    console.log('✅ Scan history:', response);
    return true;
  } catch (error) {
    console.log('❌ Scan history test failed:', error.message);
    return false;
  }
}

// Helper function to make HTTP requests
function makeRequest(path, method, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (error) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting SonarQube integration tests...\n');
  
  const tests = [
    { name: 'SonarQube Status', fn: testSonarQubeStatus },
    { name: 'Security Scan', fn: testSecurityScan },
    { name: 'Scan History', fn: testScanHistory }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    try {
      const result = await test.fn();
      if (result) {
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAILED`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! SonarQube integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the server logs and SonarQube setup.');
  }
}

// Check if server is running before running tests
async function checkServer() {
  try {
    await makeRequest('/sonarqube-status', 'GET');
    console.log('✅ Server is running, starting tests...\n');
    await runTests();
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   npm start');
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  checkServer();
}

module.exports = {
  testSonarQubeStatus,
  testSecurityScan,
  testScanHistory,
  runTests
};

