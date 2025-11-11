#!/usr/bin/env node
/**
 * Test script for Anthropic Proxy Connection
 * Tests various scenarios to ensure proper error handling and connectivity
 */

const proxyUrl = process.env.REACT_APP_ANTHROPIC_PROXY_URL || 'http://localhost:3001';

async function testHealthCheck() {
  console.log('🔍 Testing health check endpoint...');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${proxyUrl}/health`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health check passed:', data);
      return true;
    } else {
      console.log('❌ Health check failed with status:', response.status);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('❌ Health check timeout - proxy may not be running');
    } else {
      console.log('❌ Health check failed:', error.message);
    }
    return false;
  }
}

async function testMissingAPIKey() {
  console.log('\n🔍 Testing API endpoint with missing API key...');
  try {
    const response = await fetch(`${proxyUrl}/anthropic-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        prompt: 'Test'
      })
    });
    
    const result = await response.json();
    
    if (!result.success && result.error === 'API key is required') {
      console.log('✅ Correctly validates missing API key');
      return true;
    } else {
      console.log('❌ Unexpected response:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

async function testMissingModel() {
  console.log('\n🔍 Testing API endpoint with missing model...');
  try {
    const response = await fetch(`${proxyUrl}/anthropic-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: 'test-key',
        prompt: 'Test'
      })
    });
    
    const result = await response.json();
    
    if (!result.success && result.error === 'Model is required') {
      console.log('✅ Correctly validates missing model');
      return true;
    } else {
      console.log('❌ Unexpected response:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

async function testMissingPrompt() {
  console.log('\n🔍 Testing API endpoint with missing prompt...');
  try {
    const response = await fetch(`${proxyUrl}/anthropic-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: 'test-key',
        model: 'claude-3-5-sonnet-20241022'
      })
    });
    
    const result = await response.json();
    
    if (!result.success && result.error === 'Prompt is required') {
      console.log('✅ Correctly validates missing prompt');
      return true;
    } else {
      console.log('❌ Unexpected response:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Anthropic Proxy Connection Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Proxy URL: ${proxyUrl}\n`);
  
  const results = [];
  
  // Test 1: Health Check
  results.push(await testHealthCheck());
  
  // Only run other tests if health check passed
  if (results[0]) {
    results.push(await testMissingAPIKey());
    results.push(await testMissingModel());
    results.push(await testMissingPrompt());
  } else {
    console.log('\n⚠️  Skipping further tests - proxy is not running');
    console.log('To start the proxy: npm run proxy');
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total && total > 1) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else if (passed === 0) {
    console.log('❌ Proxy server is not running');
    console.log('Start it with: npm run proxy');
    process.exit(1);
  } else {
    console.log('⚠️  Some tests failed');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
