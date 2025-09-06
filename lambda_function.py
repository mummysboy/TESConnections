import json
import boto3
import uuid
from datetime import datetime
from botocore.exceptions import ClientError
import os

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('DYNAMODB_TABLE', 'tes-connections')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    """
    AWS Lambda function to handle form submissions and store data in DynamoDB
    """
    
    # Set CORS headers for all responses
    cors_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }
    
    # Handle preflight OPTIONS request
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }
    
    try:
        # Parse request body
        if isinstance(event['body'], str):
            body = json.loads(event['body'])
        else:
            body = event['body']
        
        # Validate required fields
        required_fields = ['name', 'communication']
        for field in required_fields:
            if field not in body or not body[field].strip():
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'error': f'Missing required field: {field}',
                        'message': 'Please fill in all required fields'
                    })
                }
        
        # Validate communication method
        valid_communication_methods = ['telegram', 'email', 'teams', 'whatsapp']
        if body['communication'] not in valid_communication_methods:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Invalid communication method',
                    'message': 'Please select a valid communication method'
                })
            }
        
        # Generate unique ID
        submission_id = str(uuid.uuid4())
        
        # Prepare data for DynamoDB
        item = {
            'id': submission_id,
            'name': body['name'].strip(),
            'communication': body['communication'],
            'info': body.get('info', '').strip(),
            'comments': body.get('comments', '').strip(),
            'timestamp': body.get('timestamp', datetime.utcnow().isoformat()),
            'userAgent': body.get('userAgent', ''),
            'referrer': body.get('referrer', ''),
            'ipAddress': event.get('requestContext', {}).get('identity', {}).get('sourceIp', ''),
            'createdAt': datetime.utcnow().isoformat(),
            'status': 'new'
        }
        
        # Store in DynamoDB
        table.put_item(Item=item)
        
        # Log successful submission (optional)
        print(f"Form submission stored successfully: {submission_id}")
        
        # Optional: Send notification (SNS, SES, etc.)
        # await send_notification(item)
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'message': 'Form submitted successfully',
                'submissionId': submission_id,
                'timestamp': item['createdAt']
            })
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Invalid JSON',
                'message': 'Please check your form data'
            })
        }
    
    except ClientError as e:
        print(f"DynamoDB error: {e}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Database error',
                'message': 'Unable to save your information. Please try again.'
            })
        }
    
    except Exception as e:
        print(f"Unexpected error: {e}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': 'Something went wrong. Please try again later.'
            })
        }

# Optional: Function to send notifications
async def send_notification(item):
    """
    Send notification about new form submission
    This is optional and can be configured based on your needs
    """
    try:
        # Example: Send SNS notification
        sns = boto3.client('sns')
        topic_arn = os.environ.get('SNS_TOPIC_ARN')
        
        if topic_arn:
            message = f"""
            New TESConnections Form Submission:
            
            Name: {item['name']}
            Communication: {item['communication']}
            Info: {item['info']}
            Comments: {item['comments']}
            Submitted: {item['createdAt']}
            """
            
            sns.publish(
                TopicArn=topic_arn,
                Message=message,
                Subject='New TESConnections Form Submission'
            )
            
    except Exception as e:
        print(f"Notification error: {e}")
        # Don't fail the main function if notification fails