#!/bin/bash

# Deploy routing fix for TESConnections
# This script updates the CloudFormation stack with better routing configuration

set -e

echo "🚀 Deploying routing fix for TESConnections..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if stack name is provided
if [ -z "$1" ]; then
    echo "❌ Please provide the CloudFormation stack name as an argument"
    echo "Usage: ./deploy-routing-fix.sh <stack-name>"
    exit 1
fi

STACK_NAME=$1
TEMPLATE_FILE="cloudformation-template.yaml"
REGION="us-west-1"

echo "📋 Stack Name: $STACK_NAME"
echo "📋 Region: $REGION"
echo "📋 Template: $TEMPLATE_FILE"

# Validate template
echo "🔍 Validating CloudFormation template..."
aws cloudformation validate-template \
    --template-body file://$TEMPLATE_FILE \
    --region $REGION

if [ $? -ne 0 ]; then
    echo "❌ Template validation failed"
    exit 1
fi

echo "✅ Template validation successful"

# Deploy the stack
echo "🚀 Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file $TEMPLATE_FILE \
    --stack-name $STACK_NAME \
    --region $REGION \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides Environment=prod

if [ $? -ne 0 ]; then
    echo "❌ Stack deployment failed"
    exit 1
fi

echo "✅ Stack deployment successful"

# Get the outputs
echo "📊 Getting stack outputs..."
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs' \
    --output table

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Wait 5-10 minutes for CloudFront distribution to propagate"
echo "2. Use the CloudFront URL (WebsiteUrl) instead of the S3 URL"
echo "3. Test your /meetings route"
echo ""
echo "💡 The CloudFront distribution will handle routing properly for your SPA"
