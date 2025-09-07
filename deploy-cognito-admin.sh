#!/bin/bash

# TESConnections - Deploy Cognito Admin Authentication
# This script deploys the updated CloudFormation stack with Cognito authentication

set -e

# Configuration
STACK_NAME="tes-connections-stack"
ENVIRONMENT="prod"
REGION="us-west-1"

echo "🚀 Deploying TESConnections with Cognito Admin Authentication..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Deploy CloudFormation stack
echo "📦 Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file cloudformation-template.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides Environment=$ENVIRONMENT \
    --capabilities CAPABILITY_IAM \
    --region $REGION

echo "✅ CloudFormation stack deployed"

# Get stack outputs
echo "📋 Getting stack outputs..."
USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolId`].OutputValue' \
    --output text)

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolClientId`].OutputValue' \
    --output text)

USER_POOL_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolDomain`].OutputValue' \
    --output text)

API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`AdminApiGatewayUrl`].OutputValue' \
    --output text)

echo "✅ Stack outputs retrieved:"
echo "   User Pool ID: $USER_POOL_ID"
echo "   User Pool Client ID: $USER_POOL_CLIENT_ID"
echo "   User Pool Domain: $USER_POOL_DOMAIN"
echo "   API URL: $API_URL"

# Update admin.js with actual Cognito configuration
echo "🔧 Updating admin.js with Cognito configuration..."
sed -i.bak "s/userPoolId: 'us-west-1_XXXXXXXXX'/userPoolId: '$USER_POOL_ID'/" admin.js
sed -i.bak "s/userPoolClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX'/userPoolClientId: '$USER_POOL_CLIENT_ID'/" admin.js

# Update API endpoints in admin.js
sed -i.bak "s|ADMIN_ENDPOINT: 'https://dkmogwhqc8.execute-api.us-west-1.amazonaws.com/prod/admin-data'|ADMIN_ENDPOINT: '$API_URL/admin-data'|" admin.js
sed -i.bak "s|DELETE_ENDPOINT: 'https://dkmogwhqc8.execute-api.us-west-1.amazonaws.com/prod/delete-submission'|DELETE_ENDPOINT: '$API_URL/delete-submission'|" admin.js

echo "✅ admin.js updated with Cognito configuration"

# Create admin user
echo "👤 Creating admin user..."
read -p "Enter admin email address: " ADMIN_EMAIL
read -s -p "Enter admin password (min 8 chars, must include uppercase, lowercase, number, symbol): " ADMIN_PASSWORD
echo ""

# Create user in Cognito
aws cognito-idp admin-create-user \
    --user-pool-id $USER_POOL_ID \
    --username $ADMIN_EMAIL \
    --user-attributes Name=email,Value=$ADMIN_EMAIL Name=email_verified,Value=true \
    --temporary-password $ADMIN_PASSWORD \
    --message-action SUPPRESS \
    --region $REGION

echo "✅ Admin user created: $ADMIN_EMAIL"

# Set permanent password
echo "🔐 Setting permanent password..."
aws cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username $ADMIN_EMAIL \
    --password $ADMIN_PASSWORD \
    --permanent \
    --region $REGION

echo "✅ Admin password set"

# Deploy updated Lambda function
echo "🔄 Updating Lambda function..."
aws lambda update-function-code \
    --function-name tes-connections-form-handler-$ENVIRONMENT \
    --zip-file fileb://lambda-deployment.zip \
    --region $REGION

echo "✅ Lambda function updated"

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Upload the updated admin.html and admin.js files to your S3 bucket or hosting service"
echo "2. Visit your admin dashboard URL"
echo "3. Click 'Sign In with Cognito' to authenticate"
echo "4. Use the credentials you just created:"
echo "   Email: $ADMIN_EMAIL"
echo "   Password: [the password you entered]"
echo ""
echo "🔗 Admin Dashboard URL: [Your hosting URL]/admin.html"
echo "🔗 Cognito Login URL: $USER_POOL_DOMAIN/login"
echo ""
echo "⚠️  Important Security Notes:"
echo "- Keep the admin credentials secure"
echo "- The admin dashboard is now protected by AWS Cognito"
echo "- Only authenticated users can access admin functions"
echo "- JWT tokens are validated on every API request"
echo ""
echo "🔧 Configuration Summary:"
echo "   User Pool ID: $USER_POOL_ID"
echo "   Client ID: $USER_POOL_CLIENT_ID"
echo "   Domain: $USER_POOL_DOMAIN"
echo "   API Base URL: $API_URL"
