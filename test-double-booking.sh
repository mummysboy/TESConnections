#!/bin/bash

# Test script specifically for double-booking prevention
# This script tests that the same time slot cannot be booked twice

echo "🔄 Testing Double-Booking Prevention"
echo "====================================="

API_ENDPOINT="https://dkmogwhqc8.execute-api.us-west-1.amazonaws.com/prod/submit-contact"
TEST_TIME_SLOT="2025-09-12-14:00"  # Friday Sept 12 at 2:00 PM

echo "Test time slot: $TEST_TIME_SLOT"
echo ""

# First booking attempt
echo "📝 Attempting first booking..."
first_response=$(curl -s -X POST "$API_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"Alice Johnson\",
        \"communication\": \"email\",
        \"info\": \"alice@example.com\",
        \"timeSlot\": \"$TEST_TIME_SLOT\",
        \"comments\": \"First booking for this time slot\"
    }")

echo "First booking response:"
echo "$first_response" | jq '.' 2>/dev/null || echo "$first_response"
echo ""

# Check if first booking was successful
if echo "$first_response" | grep -q "Form submitted successfully"; then
    echo "✅ First booking successful!"
    echo ""
    
    # Second booking attempt (same time slot)
    echo "📝 Attempting second booking (same time slot)..."
    second_response=$(curl -s -X POST "$API_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"Bob Smith\",
            \"communication\": \"telegram\",
            \"info\": \"@bobsmith\",
            \"timeSlot\": \"$TEST_TIME_SLOT\",
            \"comments\": \"Second booking for same time slot\"
        }")
    
    echo "Second booking response:"
    echo "$second_response" | jq '.' 2>/dev/null || echo "$second_response"
    echo ""
    
    # Check if second booking was rejected
    if echo "$second_response" | grep -q "Time slot unavailable"; then
        echo "✅ SUCCESS: Double-booking prevented!"
        echo "   The system correctly rejected the second booking attempt."
    elif echo "$second_response" | grep -q "Form submitted successfully"; then
        echo "❌ FAILURE: Double-booking allowed!"
        echo "   The system incorrectly allowed the same time slot to be booked twice."
    else
        echo "⚠️  UNKNOWN: Unexpected response"
        echo "   The response doesn't match expected patterns."
    fi
else
    echo "❌ First booking failed - cannot test double-booking prevention"
    echo "   Response: $first_response"
fi

echo ""
echo "🏁 Test complete!"
echo ""
echo "Expected behavior:"
echo "  ✅ First booking should succeed"
echo "  ❌ Second booking (same time slot) should be rejected with 'Time slot unavailable'"
