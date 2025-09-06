#!/bin/bash

# TESConnections Deployment and Configuration Script
# This script deploys the CloudFormation stack and updates the API endpoint

set -e

echo "🚀 TESConnections Deployment Script"
echo "=================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Not logged in to AWS. Please run 'aws configure' first."
    exit 1
fi

STACK_NAME="tes-connections"
ENVIRONMENT="prod"

echo "📦 Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file cloudformation-template.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides Environment=$ENVIRONMENT \
    --capabilities CAPABILITY_NAMED_IAM

echo "✅ Stack deployed successfully!"

echo "🔍 Getting API Gateway URL..."
API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
    --output text)

if [ -z "$API_URL" ]; then
    echo "❌ Could not retrieve API Gateway URL from stack outputs"
    exit 1
fi

echo "🌐 API Gateway URL: $API_URL"

echo "📝 Updating script.js with the correct API endpoint..."
# Create a backup
cp script.js script.js.backup

# Update the API endpoint in script.js
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|API_ENDPOINT: 'https://your-api-gateway-url.amazonaws.com/prod/submit-contact'|API_ENDPOINT: '$API_URL'|g" script.js
else
    # Linux
    sed -i "s|API_ENDPOINT: 'https://your-api-gateway-url.amazonaws.com/prod/submit-contact'|API_ENDPOINT: '$API_URL'|g" script.js
fi

echo "✅ script.js updated with API endpoint: $API_URL"

echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test your form submission"
echo "2. If you need to revert changes: cp script.js.backup script.js"
echo "3. Your API endpoint is now: $API_URL"
