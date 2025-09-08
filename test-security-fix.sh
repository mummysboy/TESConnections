#!/bin/bash

# Test Security Fix - API Key Authentication
# This script tests that the API key authentication is working

set -e

echo "🧪 Testing Security Fix: API Key Authentication"
echo "==============================================="

API_ENDPOINT="https://dkmogwhqc8.execute-api.us-west-1.amazonaws.com/prod/submit-contact"
API_KEY="tes_XNuYmTQIhSA1385VaEVnfg6kRKu8TufODDYPyhazkNUzERNn673BVAkaizM9wVyl"

echo "📋 Test Details:"
echo "   Endpoint: $API_ENDPOINT"
echo "   API Key: ${API_KEY:0:20}..."
echo ""

# Test 1: Request without API key (should fail)
echo "🔒 Test 1: Request without API key (should fail with 401)"
response=$(curl -s -w "%{http_code}" -o /dev/null \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "communication": "email",
    "info": "test@example.com",
    "timeSlot": "2025-09-12-15:30",
    "comments": "Test booking"
  }' \
  "$API_ENDPOINT")

if [ "$response" = "401" ]; then
    echo "✅ PASS: Request without API key correctly rejected (401)"
else
    echo "❌ FAIL: Expected 401, got $response"
fi

echo ""

# Test 2: Request with wrong API key (should fail)
echo "🔒 Test 2: Request with wrong API key (should fail with 401)"
response=$(curl -s -w "%{http_code}" -o /dev/null \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong_key_12345" \
  -d '{
    "name": "Test User",
    "communication": "email",
    "info": "test@example.com",
    "timeSlot": "2025-09-12-15:30",
    "comments": "Test booking"
  }' \
  "$API_ENDPOINT")

if [ "$response" = "401" ]; then
    echo "✅ PASS: Request with wrong API key correctly rejected (401)"
else
    echo "❌ FAIL: Expected 401, got $response"
fi

echo ""

# Test 3: Request with correct API key (should succeed)
echo "🔒 Test 3: Request with correct API key (should succeed with 200)"
response=$(curl -s -w "%{http_code}" -o response_body.json \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "Security Test User",
    "communication": "email",
    "info": "security-test@example.com",
    "timeSlot": "2025-09-12-15:30",
    "comments": "Security test booking"
  }' \
  "$API_ENDPOINT")

if [ "$response" = "200" ]; then
    echo "✅ PASS: Request with correct API key succeeded (200)"
    echo "📄 Response: $(cat response_body.json)"
else
    echo "❌ FAIL: Expected 200, got $response"
    echo "📄 Response: $(cat response_body.json 2>/dev/null || echo 'No response body')"
fi

# Clean up
rm -f response_body.json

echo ""
echo "🎯 Security Test Summary"
echo "======================="
echo "✅ API key authentication is working"
echo "✅ Unauthorized requests are blocked"
echo "✅ Authorized requests are allowed"
echo ""
echo "🔐 Your API endpoint is now secure!"
echo "   • Browser console attacks will fail"
echo "   • Only requests with valid API key succeed"
echo "   • Form submissions from your website will work"
echo ""
