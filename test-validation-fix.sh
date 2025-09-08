#!/bin/bash

# Test script to verify the date validation fix
# This script tests various invalid time slots to ensure they're rejected

echo "🧪 Testing Lambda function date validation..."

API_ENDPOINT="https://dkmogwhqc8.execute-api.us-west-1.amazonaws.com/prod/submit-contact"

# Test function
test_time_slot() {
    local time_slot="$1"
    local expected_result="$2"
    local description="$3"
    
    echo "Testing: $description"
    echo "Time slot: $time_slot"
    
    response=$(curl -s -X POST "$API_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"Test User\",
            \"communication\": \"email\",
            \"info\": \"test@example.com\",
            \"timeSlot\": \"$time_slot\",
            \"comments\": \"Test booking\"
        }")
    
    if echo "$response" | grep -q "$expected_result"; then
        echo "✅ PASS: $description"
    else
        echo "❌ FAIL: $description"
        echo "Response: $response"
    fi
    echo ""
}

echo "🔒 Testing invalid dates (should be rejected):"
test_time_slot "2025-09-11-15:30" "Booking date not available" "Thursday Sept 11 (before allowed range)"
test_time_slot "2025-09-16-15:30" "Booking date not available" "Monday Sept 16 (after allowed range)"
test_time_slot "2025-08-15-15:30" "Booking date not available" "August 15 (wrong month)"
test_time_slot "2024-09-12-15:30" "Booking date not available" "2024 (wrong year)"

echo "🕐 Testing invalid times (should be rejected):"
test_time_slot "2025-09-12-08:30" "Booking time must be between 9:00 AM and 5:00 PM" "8:30 AM (before business hours)"
test_time_slot "2025-09-12-18:00" "Booking time must be between 9:00 AM and 5:00 PM" "6:00 PM (after business hours)"
test_time_slot "2025-09-12-12:05" "Booking time must be in 15-minute intervals" "12:05 PM (invalid interval)"
test_time_slot "2025-09-12-12:22" "Booking time must be in 15-minute intervals" "12:22 PM (invalid interval)"

echo "✅ Testing valid time slots (should be accepted):"
test_time_slot "2025-09-12-09:00" "Form submitted successfully" "Valid: Friday Sept 12 at 9:00 AM"
test_time_slot "2025-09-13-15:30" "Form submitted successfully" "Valid: Saturday Sept 13 at 3:30 PM"
test_time_slot "2025-09-14-12:45" "Form submitted successfully" "Valid: Sunday Sept 14 at 12:45 PM"
test_time_slot "2025-09-15-16:30" "Form submitted successfully" "Valid: Monday Sept 15 at 4:30 PM"

echo "🔄 Testing double-booking prevention:"
echo "First booking attempt..."
first_response=$(curl -s -X POST "$API_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "First User",
        "communication": "email",
        "info": "first@example.com",
        "timeSlot": "2025-09-12-10:00",
        "comments": "First booking"
    }')

if echo "$first_response" | grep -q "Form submitted successfully"; then
    echo "✅ First booking successful"
    
    echo "Second booking attempt (same time slot)..."
    second_response=$(curl -s -X POST "$API_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Second User",
            "communication": "email",
            "info": "second@example.com",
            "timeSlot": "2025-09-12-10:00",
            "comments": "Second booking"
        }')
    
    if echo "$second_response" | grep -q "Time slot unavailable"; then
        echo "✅ Double-booking prevented successfully"
    else
        echo "❌ Double-booking prevention failed"
        echo "Response: $second_response"
    fi
else
    echo "❌ First booking failed - cannot test double-booking"
    echo "Response: $first_response"
fi

echo "🎯 Testing edge cases:"
test_time_slot "" "Form submitted successfully" "Empty time slot (should be allowed)"
test_time_slot "invalid-format" "Invalid time slot format" "Invalid format"
test_time_slot "2025-13-12-15:30" "Invalid time slot format" "Invalid month (13)"

echo "🏁 Test complete!"
echo ""
echo "If all tests pass, the date validation fix is working correctly."
echo "Unauthorized bookings outside September 12-15, 2025 will now be rejected."
