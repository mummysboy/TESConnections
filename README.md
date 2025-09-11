# DMEXCOConnections Landing Page

A mobile-first responsive landing page with Hinge-style UX and masculine theme for collecting contact information with AWS backend integration.

## Features

- 📱 **Mobile-First Design**: Optimized for mobile devices with responsive design
- 🎨 **Masculine Theme**: Dark, bold design with confident styling
- 🔥 **Hinge-Style UX**: Card-based interface with smooth animations and interactions
- ✅ **Form Validation**: Client-side validation with real-time feedback
- 🔒 **Secure**: Data stored securely in AWS DynamoDB
- ⚡ **Fast**: Optimized for performance with minimal dependencies
- 🌐 **Accessible**: WCAG compliant with keyboard navigation support

## Form Fields

- **Name**: Required field with validation
- **Preferred Communication**: Interactive card selection (Telegram, Email, Teams, WhatsApp)
- **Additional Information**: Optional text field
- **Comments**: Optional textarea for longer messages

## Architecture

```
Frontend (S3) → API Gateway → Lambda → DynamoDB
```

- **Frontend**: Static HTML/CSS/JS hosted on S3
- **API Gateway**: RESTful API endpoint for form submissions
- **Lambda**: Serverless function for data processing
- **DynamoDB**: NoSQL database for storing submissions

## Quick Start

### Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js (optional, for local development)

### 1. Deploy AWS Infrastructure

```bash
# Deploy CloudFormation stack
aws cloudformation deploy \
  --template-file cloudformation-template.yaml \
  --stack-name tes-connections-prod \
  --parameter-overrides Environment=prod \
  --capabilities CAPABILITY_IAM
```

### 2. Update API Endpoint

After deployment, update the API endpoint in `script.js`:

```javascript
const CONFIG = {
    API_ENDPOINT: 'https://your-api-gateway-url.amazonaws.com/prod/submit-contact',
    TIMEOUT: 10000
};
```

### 3. Deploy Frontend

```bash
# Get your S3 bucket name from CloudFormation outputs
aws s3 sync . s3://tes-connections-website-prod-YOUR-ACCOUNT-ID \
  --exclude '*.md' \
  --exclude 'node_modules/*' \
  --exclude '.git/*' \
  --exclude 'cloudformation-template.yaml'
```

### 4. Access Your Site

Visit the S3 website URL from the CloudFormation outputs.

## Local Development

### Option 1: Python HTTP Server

```bash
python -m http.server 8000
```

### Option 2: Node.js HTTP Server

```bash
npm install
npm start
```

Then visit `http://localhost:8000`

## Design Philosophy

### Masculine Theme
- **Dark Color Palette**: Deep blacks and grays with electric blue accents
- **Bold Typography**: Space Grotesk and Inter fonts for strong, confident appearance
- **Confident Interactions**: Smooth animations with haptic feedback
- **Minimalist Layout**: Clean, focused design without unnecessary elements

### Hinge-Style UX
- **Card-Based Interface**: Information presented in digestible cards
- **Interactive Elements**: Tap-to-select communication options
- **Smooth Transitions**: Fluid animations between states
- **Engaging Copy**: Direct, confident messaging

## Configuration

### Environment Variables

The Lambda function uses these environment variables:

- `DYNAMODB_TABLE`: DynamoDB table name (set automatically by CloudFormation)

### Customization

#### Styling
- Modify `styles.css` to change colors, fonts, and layout
- Update CSS custom properties for easy theming

#### Form Fields
- Add/remove fields in `index.html`
- Update validation rules in `script.js`
- Modify Lambda function for new fields

#### AWS Resources
- Update `cloudformation-template.yaml` for additional resources
- Add SNS notifications, SES emails, etc.

## Security Considerations

- ✅ CORS properly configured
- ✅ Input validation on both client and server
- ✅ No sensitive data in client-side code
- ✅ DynamoDB access restricted to Lambda function
- ✅ API Gateway rate limiting (can be added)

## Monitoring

### CloudWatch Logs
- Lambda function logs automatically sent to CloudWatch
- Set up log retention policies as needed

### Metrics
- API Gateway metrics for request count, latency
- Lambda metrics for invocations, errors, duration
- DynamoDB metrics for read/write capacity

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Review AWS CloudWatch logs for backend issues# Test deployment trigger
