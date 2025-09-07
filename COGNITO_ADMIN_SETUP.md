# TESConnections Admin Dashboard - Cognito Authentication Setup

This guide explains how to set up secure admin authentication for the TESConnections admin dashboard using AWS Cognito.

## Overview

The admin dashboard is now protected with AWS Cognito authentication, ensuring that only authorized users can access sensitive data and administrative functions.

## Security Features

- **AWS Cognito User Pool**: Secure user management and authentication
- **JWT Token Validation**: All admin API requests are validated with JWT tokens
- **API Gateway Authorization**: Protected endpoints require valid authentication
- **Hosted Login UI**: Professional login interface provided by AWS Cognito
- **Session Management**: Automatic token refresh and secure logout

## Architecture

```
User → Cognito Login → JWT Token → API Gateway (Authorizer) → Lambda (JWT Validation) → DynamoDB
```

## Deployment Steps

### 1. Deploy Infrastructure

Run the deployment script to set up Cognito and update your infrastructure:

```bash
./deploy-cognito-admin.sh
```

This script will:
- Deploy the updated CloudFormation stack with Cognito resources
- Create an admin user account
- Update configuration files with actual Cognito IDs
- Set up API Gateway authorizers

### 2. Manual Configuration (Alternative)

If you prefer to configure manually:

#### A. Deploy CloudFormation Stack

```bash
aws cloudformation deploy \
    --template-file cloudformation-template.yaml \
    --stack-name tes-connections-stack \
    --parameter-overrides Environment=prod \
    --capabilities CAPABILITY_IAM \
    --region us-west-1
```

#### B. Get Stack Outputs

```bash
aws cloudformation describe-stacks \
    --stack-name tes-connections-stack \
    --region us-west-1 \
    --query 'Stacks[0].Outputs'
```

#### C. Update admin.js Configuration

Update the `COGNITO_CONFIG` object in `admin.js`:

```javascript
const COGNITO_CONFIG = {
    userPoolId: 'us-west-1_XXXXXXXXX', // From CloudFormation output
    userPoolClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX', // From CloudFormation output
    region: 'us-west-1'
};
```

#### D. Create Admin User

```bash
# Create user
aws cognito-idp admin-create-user \
    --user-pool-id YOUR_USER_POOL_ID \
    --username admin@yourcompany.com \
    --user-attributes Name=email,Value=admin@yourcompany.com Name=email_verified,Value=true \
    --temporary-password TempPass123! \
    --message-action SUPPRESS \
    --region us-west-1

# Set permanent password
aws cognito-idp admin-set-user-password \
    --user-pool-id YOUR_USER_POOL_ID \
    --username admin@yourcompany.com \
    --password YourSecurePassword123! \
    --permanent \
    --region us-west-1
```

## Usage

### Accessing the Admin Dashboard

1. Navigate to your admin dashboard URL: `https://yourdomain.com/admin.html`
2. Click "Sign In with Cognito"
3. Enter your admin credentials
4. You'll be redirected back to the dashboard after successful authentication

### Admin Functions

Once authenticated, you can:
- View all form submissions (meetings and connections)
- Export data to CSV
- Delete submissions
- View detailed submission information
- Monitor statistics and metrics

### Logout

Click the logout button in the header to securely sign out and clear your session.

## Security Considerations

### Password Requirements

Admin passwords must meet these requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Security

- JWT tokens are automatically validated on every API request
- Tokens expire after 1 hour and are automatically refreshed
- All admin API endpoints require valid authentication
- Tokens are stored securely in browser memory

### Access Control

- Only users created in the Cognito User Pool can access the admin dashboard
- Each user must have a verified email address
- Users can be managed through the AWS Cognito console

## Managing Users

### Adding New Admin Users

```bash
aws cognito-idp admin-create-user \
    --user-pool-id YOUR_USER_POOL_ID \
    --username newadmin@yourcompany.com \
    --user-attributes Name=email,Value=newadmin@yourcompany.com Name=email_verified,Value=true \
    --temporary-password TempPass123! \
    --message-action SUPPRESS \
    --region us-west-1
```

### Removing Users

```bash
aws cognito-idp admin-delete-user \
    --user-pool-id YOUR_USER_POOL_ID \
    --username user@yourcompany.com \
    --region us-west-1
```

### Resetting Passwords

```bash
aws cognito-idp admin-reset-user-password \
    --user-pool-id YOUR_USER_POOL_ID \
    --username user@yourcompany.com \
    --region us-west-1
```

## Troubleshooting

### Common Issues

1. **"Authentication system initialization failed"**
   - Check that Cognito configuration in admin.js is correct
   - Verify User Pool ID and Client ID are valid

2. **"Authorization header missing"**
   - User is not properly authenticated
   - Try logging out and logging back in

3. **"Token has expired"**
   - Session has expired, user needs to log in again
   - This is normal behavior for security

4. **"Invalid token"**
   - Token is corrupted or invalid
   - Clear browser storage and log in again

### Debug Mode

Enable debug logging by opening browser developer tools and checking the console for detailed error messages.

## API Endpoints

### Public Endpoints (No Authentication Required)
- `POST /submit-contact` - Submit new form data

### Protected Endpoints (Authentication Required)
- `GET /admin-data` - Retrieve all submissions
- `DELETE /delete-submission` - Delete a submission

## Monitoring

### CloudWatch Logs

Monitor authentication and API usage through CloudWatch:
- Lambda function logs
- API Gateway logs
- Cognito authentication logs

### Metrics

Key metrics to monitor:
- Authentication success/failure rates
- API request volumes
- Error rates
- User session durations

## Backup and Recovery

### User Data Backup

User accounts and authentication data are stored in AWS Cognito and are automatically backed up by AWS.

### Configuration Backup

Keep backups of:
- CloudFormation template
- admin.js configuration
- Deployment scripts

## Support

For technical support or questions about the admin authentication system, refer to:
- AWS Cognito documentation
- AWS API Gateway documentation
- AWS Lambda documentation

## Security Best Practices

1. **Regular Password Updates**: Encourage admin users to update passwords regularly
2. **Monitor Access Logs**: Regularly review authentication logs for suspicious activity
3. **Principle of Least Privilege**: Only create admin accounts for users who need access
4. **Secure Communication**: Always use HTTPS for admin dashboard access
5. **Regular Updates**: Keep AWS services updated to latest versions
6. **Backup Strategy**: Maintain backups of critical configuration and data
