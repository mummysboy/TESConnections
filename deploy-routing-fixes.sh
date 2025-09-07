#!/bin/bash

# Deploy routing fixes for TESConnections
# This script rebuilds and deploys the application with proper routing

set -e

echo "🚀 Deploying TESConnections routing fixes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if stack name is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Please provide the CloudFormation stack name as an argument${NC}"
    echo "Usage: ./deploy-routing-fixes.sh <stack-name>"
    exit 1
fi

STACK_NAME=$1
REGION="us-west-1"

echo -e "${YELLOW}📋 Stack Name: $STACK_NAME${NC}"
echo -e "${YELLOW}📋 Region: $REGION${NC}"

# Step 1: Build the application with all required files
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Step 2: Verify all required files are in dist/
echo -e "${YELLOW}🔍 Verifying build output...${NC}"

REQUIRED_FILES=("index.html" "admin.html" "meetings.html" "admin.js" "meetings.js" "styles.css" "_redirects")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "dist/$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required files in dist/:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo -e "${RED}  - $file${NC}"
    done
    exit 1
fi

echo -e "${GREEN}✅ All required files present in dist/${NC}"

# Step 3: Get the S3 bucket name from CloudFormation stack
echo -e "${YELLOW}🔍 Getting S3 bucket name from stack...${NC}"

BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`S3WebsiteUrl`].OutputValue' \
    --output text | sed 's|http://||' | sed 's|.s3-website.*||')

if [ -z "$BUCKET_NAME" ]; then
    echo -e "${RED}❌ Could not get S3 bucket name from stack${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found S3 bucket: $BUCKET_NAME${NC}"

# Step 4: Deploy files to S3
echo -e "${YELLOW}📤 Deploying files to S3...${NC}"

aws s3 sync dist/ s3://$BUCKET_NAME/ \
    --region $REGION \
    --delete \
    --cache-control "public, max-age=0, must-revalidate" \
    --metadata-directive REPLACE

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ S3 deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Files deployed to S3 successfully${NC}"

# Step 5: Update CloudFormation stack with improved routing
echo -e "${YELLOW}🔄 Updating CloudFormation stack with improved routing...${NC}"

aws cloudformation deploy \
    --template-file cloudformation-template.yaml \
    --stack-name $STACK_NAME \
    --region $REGION \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides Environment=prod

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ CloudFormation stack update failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CloudFormation stack updated successfully${NC}"

# Step 6: Get CloudFront distribution ID and invalidate cache
echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"

CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteUrl`].OutputValue' \
    --output text | sed 's|https://||' | sed 's|.cloudfront.net||')

if [ ! -z "$CLOUDFRONT_ID" ]; then
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_ID \
        --paths "/*" \
        --region $REGION > /dev/null
    
    echo -e "${GREEN}✅ CloudFront cache invalidation initiated${NC}"
else
    echo -e "${YELLOW}⚠️  Could not find CloudFront distribution ID${NC}"
fi

# Step 7: Display final information
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📊 Getting stack outputs...${NC}"
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs' \
    --output table

echo ""
echo -e "${GREEN}📝 Next steps:${NC}"
echo "1. Wait 5-10 minutes for CloudFront distribution to propagate"
echo "2. Test your routes:"
echo "   - /meetings (should load meetings.html)"
echo "   - /admin (should load admin.html)"
echo "3. Use the CloudFront URL (WebsiteUrl) for testing"
echo ""
echo -e "${GREEN}💡 The routing fixes include:${NC}"
echo "   - Updated build process to include all required files"
echo "   - Improved _redirects configuration"
echo "   - Enhanced CloudFront cache behaviors for /admin and /meetings"
echo "   - Better S3 routing rules"