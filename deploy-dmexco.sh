#!/bin/bash

# DMEXCOConnections Deployment Script
# Usage: ./deploy-dmexco.sh [environment] 
# Example: ./deploy-dmexco.sh prod

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-prod}
AWS_REGION=${AWS_REGION:-us-west-1}
STACK_PREFIX=${STACK_PREFIX:-dmexco-connections}
STACK_NAME="${STACK_PREFIX}-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

log_info "Starting DMEXCOConnections deployment for environment: $ENVIRONMENT"
log_info "Stack name: $STACK_NAME"
log_info "AWS Region: $AWS_REGION"

# Deploy CloudFormation stack
log_info "Deploying CloudFormation stack..."

aws cloudformation deploy \
    --template-file cloudformation-template.yaml \
    --stack-name "$STACK_NAME" \
    --parameter-overrides Environment="$ENVIRONMENT" \
    --capabilities CAPABILITY_IAM \
    --region "$AWS_REGION"

if [ $? -eq 0 ]; then
    log_success "CloudFormation stack deployed successfully!"
else
    log_error "CloudFormation deployment failed!"
    exit 1
fi

# Get stack outputs
log_info "Getting stack outputs..."

API_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
    --output text)

WEBSITE_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteUrl`].OutputValue' \
    --output text)

TABLE_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`DynamoDBTableName`].OutputValue' \
    --output text)

log_success "Deployment completed successfully!"
echo ""
log_info "Stack Outputs:"
echo "  API Gateway URL: $API_URL"
echo "  Website URL: $WEBSITE_URL"
echo "  DynamoDB Table: $TABLE_NAME"
echo ""

# Update JavaScript files with new API endpoint
log_info "Updating JavaScript files with new API endpoint..."

# Update script.js
if [ -f "script.js" ]; then
    sed -i.bak "s|API_ENDPOINT: '.*'|API_ENDPOINT: '$API_URL'|g" script.js
    log_success "Updated script.js"
fi

# Update meetings.js
if [ -f "meetings.js" ]; then
    sed -i.bak "s|API_ENDPOINT: '.*'|API_ENDPOINT: '$API_URL'|g" meetings.js
    log_success "Updated meetings.js"
fi

# Update admin.js
if [ -f "admin.js" ]; then
    ADMIN_API_URL="${API_URL%/submit-contact}"
    sed -i.bak "s|API_ENDPOINT: '.*'|API_ENDPOINT: '$API_URL'|g" admin.js
    sed -i.bak "s|ADMIN_ENDPOINT: '.*'|ADMIN_ENDPOINT: '$ADMIN_API_URL/admin-data'|g" admin.js
    sed -i.bak "s|DELETE_ENDPOINT: '.*'|DELETE_ENDPOINT: '$ADMIN_API_URL/delete-submission'|g" admin.js
    sed -i.bak "s|PIN_AUTH_ENDPOINT: '.*'|PIN_AUTH_ENDPOINT: '$ADMIN_API_URL/pin-auth'|g" admin.js
    log_success "Updated admin.js"
fi

# Build and deploy website
log_info "Building website..."

# Create dist directory
mkdir -p dist

# Copy files to dist
cp index.html styles.css script.js meetings.html meetings.js admin.html admin.js admin-sample.json _redirects favicon.ico dmexco-banner.png dist/

# Create subdirectories
mkdir -p dist/meetings dist/admin

# Copy files to subdirectories
cp meetings.html dist/meetings/index.html
cp admin.html dist/admin/index.html

log_success "Website built successfully!"

# Deploy to S3
log_info "Deploying website to S3..."

# Get S3 bucket name from CloudFormation
S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`S3WebsiteUrl`].OutputValue' \
    --output text | sed 's|https://||' | sed 's|\.s3-website.*||')

if [ -n "$S3_BUCKET" ]; then
    aws s3 sync dist/ "s3://$S3_BUCKET" --delete --exclude "*.md" --exclude "node_modules/*" --exclude ".git/*"
    
    if [ $? -eq 0 ]; then
        log_success "Website deployed to S3 successfully!"
    else
        log_error "S3 deployment failed!"
        exit 1
    fi
else
    log_warning "Could not determine S3 bucket name. Please deploy manually."
fi

echo ""
log_success "🎉 DMEXCOConnections deployment completed successfully!"
echo ""
log_info "Next steps:"
echo "  1. Visit your website: $WEBSITE_URL"
echo "  2. Test the contact form"
echo "  3. Access admin panel: $WEBSITE_URL/admin"
echo "  4. Check DynamoDB table: $TABLE_NAME"
echo ""
log_info "Admin PIN: 1954 (change this in production!)"
echo ""
