#!/bin/bash

# TESConnections Security Fixes Deployment Script
# This script deploys the high-priority security fixes

set -e

echo "🔒 TESConnections Security Fixes Deployment"
echo "=========================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

# Set variables
STACK_NAME="tes-connections-stack"
REGION="us-west-1"
TEMPLATE_FILE="cloudformation-template.yaml"

echo "📋 Deployment Configuration:"
echo "  Stack Name: $STACK_NAME"
echo "  Region: $REGION"
echo "  Template: $TEMPLATE_FILE"
echo ""

# Check if stack exists
if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
    echo "❌ Stack '$STACK_NAME' not found. Please check the stack name."
    exit 1
fi

echo "🔍 Current stack status:"
aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query 'Stacks[0].StackStatus' --output text

echo ""
echo "🚀 Deploying security fixes..."
echo "  - Admin PIN: 1954 (changed from 1234)"
echo "  - Strong session secret: Generated"
echo "  - CORS origins: Restricted to production domains only"
echo ""

# Deploy the updated stack
aws cloudformation update-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://$TEMPLATE_FILE" \
    --parameters \
        ParameterKey=Environment,ParameterValue=prod \
        ParameterKey=AdminPin,ParameterValue=1954 \
        ParameterKey=PinSessionSecret,ParameterValue=nhacN0t9q78INslG3r0eg6aa2URUQO2gIpxda4IZOmU= \
    --capabilities CAPABILITY_IAM \
    --region "$REGION"

echo ""
echo "⏳ Waiting for stack update to complete..."

# Wait for stack update to complete
aws cloudformation wait stack-update-complete \
    --stack-name "$STACK_NAME" \
    --region "$REGION"

echo ""
echo "✅ Security fixes deployed successfully!"
echo ""
echo "📊 Updated Configuration:"
echo "  - Admin PIN: 1954"
echo "  - Session Secret: Updated with strong key"
echo "  - CORS Origins: Restricted to production domains"
echo "  - Debug Logging: Reduced"
echo ""
echo "🔐 Security Improvements Applied:"
echo "  ✅ Strong authentication credentials"
echo "  ✅ Restricted CORS policy"
echo "  ✅ Reduced information disclosure"
echo "  ✅ Updated Lambda environment variables"
echo ""
echo "⚠️  Important Next Steps:"
echo "  1. Test admin login with new PIN: 1954"
echo "  2. Verify CORS restrictions are working"
echo "  3. Monitor logs for any unauthorized access attempts"
echo "  4. Consider implementing additional security measures"
echo ""
echo "🎉 Deployment complete!"
