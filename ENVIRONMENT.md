# TESConnections - Environment Configuration

## Development Environment

For local development, you can use any of these methods:

### Python HTTP Server
```bash
python -m http.server 8000
```

### Node.js HTTP Server
```bash
npm install
npm start
```

### Live Server (VS Code Extension)
Install the "Live Server" extension and right-click on `index.html` → "Open with Live Server"

## Production Environment

The production environment consists of:

- **Frontend**: S3 static website hosting
- **Backend**: AWS Lambda function
- **API**: API Gateway REST API
- **Database**: DynamoDB table
- **Infrastructure**: CloudFormation stack

## Environment Variables

### Frontend (script.js)
- `API_ENDPOINT`: API Gateway URL for form submissions
- `TIMEOUT`: Request timeout in milliseconds

### Backend (Lambda)
- `DYNAMODB_TABLE`: DynamoDB table name
- `SNS_TOPIC_ARN`: Optional SNS topic for notifications

## Configuration Files

- `cloudformation-template.yaml`: AWS infrastructure definition
- `deploy.sh`: Automated deployment script
- `package.json`: Node.js dependencies and scripts

## Monitoring

### CloudWatch Metrics
- API Gateway: Request count, latency, error rate
- Lambda: Invocations, errors, duration
- DynamoDB: Read/write capacity, throttling

### Logs
- Lambda logs: `/aws/lambda/tes-connections-form-handler-{environment}`
- API Gateway logs: Enable access logging if needed

## Security

### CORS Configuration
- Frontend domain must be whitelisted
- API Gateway configured for specific origins

### IAM Permissions
- Lambda execution role has minimal required permissions
- DynamoDB access restricted to specific table
- S3 bucket policy allows public read access

## Troubleshooting

### Common Issues
1. **CORS errors**: Check API Gateway CORS configuration
2. **Form not submitting**: Verify API endpoint URL
3. **Data not stored**: Check Lambda permissions and DynamoDB table
4. **Website not loading**: Verify S3 bucket policy and website configuration

### Debug Steps
1. Check browser console for JavaScript errors
2. Review CloudWatch logs for Lambda errors
3. Verify API Gateway configuration
4. Test API endpoint directly with curl/Postman