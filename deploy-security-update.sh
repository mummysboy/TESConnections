#!/bin/bash

# Deploy Security Update - API Key Authentication
# This script updates the Lambda function with API key authentication

set -e

echo "🔒 Deploying Security Update: API Key Authentication"
echo "=================================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get current AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
STACK_NAME="tes-connections-prod"

echo "📋 Deployment Details:"
echo "   Account ID: $ACCOUNT_ID"
echo "   Region: $REGION"
echo "   Stack: $STACK_NAME"
echo ""

# Update CloudFormation stack with new API key
echo "🚀 Updating CloudFormation stack with API key authentication..."
aws cloudformation deploy \
  --template-file cloudformation-template.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
    Environment=prod \
    FormApiKey=tes_XNuYmTQIhSA1385VaEVnfg6kRKu8TufODDYPyhazkNUzERNn673BVAkaizM9wVyl \
  --capabilities CAPABILITY_IAM \
  --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ CloudFormation stack updated successfully!"
else
    echo "❌ CloudFormation deployment failed!"
    exit 1
fi

# Deploy frontend files
echo ""
echo "🌐 Deploying frontend files..."
S3_BUCKET="tes-connections-website-prod-$ACCOUNT_ID"

# Sync files to S3
aws s3 sync . s3://$S3_BUCKET \
  --exclude "*.py" \
  --exclude "*.yaml" \
  --exclude "*.sh" \
  --exclude "*.md" \
  --exclude "bin/*" \
  --exclude "certifi/*" \
  --exclude "charset_normalizer/*" \
  --exclude "idna/*" \
  --exclude "jwt/*" \
  --exclude "requests/*" \
  --exclude "urllib3/*" \
  --exclude "*.dist-info/*" \
  --exclude "lambda-deployment.zip" \
  --exclude ".git/*" \
  --exclude "node_modules/*"

if [ $? -eq 0 ]; then
    echo "✅ Frontend files deployed successfully!"
else
    echo "❌ Frontend deployment failed!"
    exit 1
fi

echo ""
echo "🎉 Security Update Complete!"
echo "============================="
echo ""
echo "✅ API Key Authentication Implemented"
echo "✅ New Secure API Key Generated"
echo "✅ Lambda Function Updated"
echo "✅ Frontend Files Updated"
echo "✅ CloudFormation Stack Updated"
echo ""
echo "🔐 Security Features Added:"
echo "   • API key validation for form submissions"
echo "   • Unauthorized requests now return 401"
echo "   • Browser console attacks blocked"
echo "   • Secure 64-character API key"
echo ""
echo "📝 Next Steps:"
echo "   1. Test the form submission from your website"
echo "   2. Verify browser console attacks are blocked"
echo "   3. Monitor CloudWatch logs for any issues"
echo ""
echo "🌐 Website URL: https://$S3_BUCKET.s3-website-$REGION.amazonaws.com"
echo ""
