#!/bin/bash

# Deploy Lambda function with date validation fix
# This script updates the Lambda function to prevent unauthorized bookings

echo "🚀 Deploying Lambda function with date validation fix..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "lambda_function.py" ]; then
    echo "❌ lambda_function.py not found. Please run this script from the project root."
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package..."
zip -r lambda-deployment.zip lambda_function.py

# Get the Lambda function name (assuming it follows the naming convention)
FUNCTION_NAME="tes-connections-form-handler-prod"

# Check if function exists
if ! aws lambda get-function --function-name "$FUNCTION_NAME" &> /dev/null; then
    echo "❌ Lambda function '$FUNCTION_NAME' not found."
    echo "Available functions:"
    aws lambda list-functions --query 'Functions[?contains(FunctionName, `tes-connections`)].FunctionName' --output table
    exit 1
fi

# Update the Lambda function
echo "🔄 Updating Lambda function: $FUNCTION_NAME"
aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://lambda-deployment.zip

if [ $? -eq 0 ]; then
    echo "✅ Lambda function updated successfully!"
    echo ""
    echo "🔒 Security fixes applied:"
    echo "   - Date validation now enforced on backend"
    echo "   - Only September 12-15, 2025 bookings allowed"
    echo "   - Business hours: 9:00 AM - 5:00 PM"
    echo "   - 15-minute time intervals enforced"
    echo "   - Double-booking prevention (time slots can only be booked once)"
    echo ""
    echo "🧪 Test the fixes:"
    echo "   # Test invalid date:"
    echo "   curl -X POST https://dkmogwhqc8.execute-api.us-west-1.amazonaws.com/prod/submit-contact \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"name\":\"Test\",\"communication\":\"email\",\"info\":\"test@example.com\",\"timeSlot\":\"2025-09-11-15:30\"}'"
    echo ""
    echo "   # Test double-booking:"
    echo "   curl -X POST https://dkmogwhqc8.execute-api.us-west-1.amazonaws.com/prod/submit-contact \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"name\":\"Test\",\"communication\":\"email\",\"info\":\"test@example.com\",\"timeSlot\":\"2025-09-12-10:00\"}'"
    echo ""
    echo "   Run './test-validation-fix.sh' for comprehensive testing"
else
    echo "❌ Failed to update Lambda function"
    exit 1
fi

# Clean up
rm lambda-deployment.zip

echo "🎉 Deployment complete!"
