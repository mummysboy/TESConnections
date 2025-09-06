#!/bin/bash

# TESConnections Deployment Script
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh prod

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-prod}
AWS_REGION=${AWS_REGION:-us-east-1}
STACK_PREFIX=${STACK_PREFIX:-tes-connections}
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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if AWS CLI is configured
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed. Some features may not work properly."
    fi
    
    log_success "Prerequisites check passed"
}

# Deploy CloudFormation stack
deploy_infrastructure() {
    log_info "Deploying CloudFormation stack: $STACK_NAME"
    
    aws cloudformation deploy \
        --template-file cloudformation-template.yaml \
        --stack-name "$STACK_NAME" \
        --parameter-overrides Environment="$ENVIRONMENT" \
        --capabilities CAPABILITY_IAM \
        --region "$AWS_REGION"
    
    log_success "CloudFormation stack deployed successfully"
}

# Get stack outputs
get_stack_outputs() {
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
    
    if [ -z "$API_URL" ] || [ -z "$WEBSITE_URL" ] || [ -z "$TABLE_NAME" ]; then
        log_error "Failed to get stack outputs. Please check the CloudFormation stack."
        exit 1
    fi
    
    log_success "Stack outputs retrieved"
}

# Update frontend with API endpoint
update_frontend() {
    log_info "Updating frontend with API endpoint..."
    
    # Create backup of original file
    cp script.js script.js.bak
    
    # Update API endpoint
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|https://your-api-gateway-url.amazonaws.com/prod/submit-contact|$API_URL|g" script.js
    else
        # Linux
        sed -i "s|https://your-api-gateway-url.amazonaws.com/prod/submit-contact|$API_URL|g" script.js
    fi
    
    log_success "Frontend updated with API endpoint: $API_URL"
}

# Deploy frontend to S3
deploy_frontend() {
    log_info "Deploying frontend to S3..."
    
    # Extract bucket name from website URL
    BUCKET_NAME=$(echo "$WEBSITE_URL" | sed 's|https://||' | sed 's|\.s3-website.*||')
    
    if [ -z "$BUCKET_NAME" ]; then
        log_error "Could not extract bucket name from website URL"
        exit 1
    fi
    
    # Sync files to S3
    aws s3 sync . "s3://$BUCKET_NAME" \
        --exclude '*.md' \
        --exclude 'node_modules/*' \
        --exclude '.git/*' \
        --exclude 'cloudformation-template.yaml' \
        --exclude 'deploy.sh' \
        --exclude '*.bak' \
        --region "$AWS_REGION"
    
    log_success "Frontend deployed to S3 bucket: $BUCKET_NAME"
}

# Restore original frontend file
restore_frontend() {
    log_info "Restoring original frontend file..."
    
    if [ -f "script.js.bak" ]; then
        mv script.js.bak script.js
        log_success "Original frontend file restored"
    fi
}

# Display deployment summary
show_summary() {
    echo ""
    log_success "Deployment complete!"
    echo ""
    echo -e "${BLUE}📋 Deployment Summary:${NC}"
    echo -e "   Environment: ${GREEN}$ENVIRONMENT${NC}"
    echo -e "   Region: ${GREEN}$AWS_REGION${NC}"
    echo -e "   Stack Name: ${GREEN}$STACK_NAME${NC}"
    echo ""
    echo -e "${BLUE}🔗 Important URLs:${NC}"
    echo -e "   Website: ${GREEN}$WEBSITE_URL${NC}"
    echo -e "   API Endpoint: ${GREEN}$API_URL${NC}"
    echo ""
    echo -e "${BLUE}📊 AWS Console Links:${NC}"
    echo -e "   CloudFormation: ${GREEN}https://console.aws.amazon.com/cloudformation/home?region=$AWS_REGION#/stacks${NC}"
    echo -e "   S3 Bucket: ${GREEN}https://console.aws.amazon.com/s3/buckets/$BUCKET_NAME${NC}"
    echo -e "   DynamoDB: ${GREEN}https://console.aws.amazon.com/dynamodb/home?region=$AWS_REGION#tables:selected=$TABLE_NAME${NC}"
    echo -e "   Lambda: ${GREEN}https://console.aws.amazon.com/lambda/home?region=$AWS_REGION#/functions${NC}"
    echo ""
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo -e "   1. Test the form submission on your website"
    echo -e "   2. Check DynamoDB for stored submissions"
    echo -e "   3. Monitor CloudWatch logs for any issues"
    echo -e "   4. Set up monitoring and alerts as needed"
    echo ""
}

# Main deployment function
main() {
    echo -e "${BLUE}🚀 Starting TESConnections deployment to $ENVIRONMENT${NC}"
    echo ""
    
    # Run deployment steps
    check_prerequisites
    deploy_infrastructure
    get_stack_outputs
    update_frontend
    deploy_frontend
    restore_frontend
    show_summary
}

# Handle script interruption
trap 'log_error "Deployment interrupted. Restoring original files..."; restore_frontend; exit 1' INT TERM

# Run main function
main "$@"