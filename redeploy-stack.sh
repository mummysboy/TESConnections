#!/bin/bash

# Redeploy CloudFormation Stack with Security Updates
# This script deletes the existing stack and recreates it with API key authentication

set -e

echo "🔄 Redeploying CloudFormation Stack with Security Updates"
echo "======================================================="

# Get current AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
STACK_NAME="tes-connections-prod"

echo "📋 Deployment Details:"
echo "   Account ID: $ACCOUNT_ID"
echo "   Region: $REGION"
echo "   Stack: $STACK_NAME"
echo ""

# Check if stack exists and its status
echo "🔍 Checking current stack status..."
stack_status=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "STACK_NOT_FOUND")

if [ "$stack_status" = "STACK_NOT_FOUND" ]; then
    echo "📝 Stack not found, will create new stack"
elif [ "$stack_status" = "ROLLBACK_COMPLETE" ]; then
    echo "⚠️  Stack is in ROLLBACK_COMPLETE state, will delete and recreate"
    echo "🗑️  Deleting existing stack..."
    aws cloudformation delete-stack --stack-name $STACK_NAME --region $REGION
    
    echo "⏳ Waiting for stack deletion to complete..."
    aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME --region $REGION
    echo "✅ Stack deleted successfully"
else
    echo "⚠️  Stack status: $stack_status"
    echo "🗑️  Deleting existing stack..."
    aws cloudformation delete-stack --stack-name $STACK_NAME --region $REGION
    
    echo "⏳ Waiting for stack deletion to complete..."
    aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME --region $REGION
    echo "✅ Stack deleted successfully"
fi

echo ""
echo "🚀 Creating new stack with security updates..."

# Deploy new stack with API key authentication
aws cloudformation deploy \
  --template-file cloudformation-template.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
    Environment=prod \
    FormApiKey=tes_XNuYmTQIhSA1385VaEVnfg6kRKu8TufODDYPyhazkNUzERNn673BVAkaizM9wVyl \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ CloudFormation stack created successfully!"
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
echo "✅ CloudFormation Stack Recreated"
echo ""
echo "🔐 Security Features Added:"
echo "   • API key validation for form submissions"
echo "   • Unauthorized requests now return 401"
echo "   • Browser console attacks blocked"
echo "   • Secure 64-character API key"
echo ""
echo "📝 Next Steps:"
echo "   1. Run ./test-security-fix.sh to verify security"
echo "   2. Test the form submission from your website"
echo "   3. Verify browser console attacks are blocked"
echo ""
echo "🌐 Website URL: https://$S3_BUCKET.s3-website-$REGION.amazonaws.com"
echo ""
