import json
import boto3
import uuid
import re
import html
from datetime import datetime
from botocore.exceptions import ClientError
import os
import hashlib
import time

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('DYNAMODB_TABLE', 'tes-connections')
table = dynamodb.Table(table_name)

# Security configuration
MAX_REQUEST_SIZE = 1024 * 10  # 10KB max request size
RATE_LIMIT_WINDOW = 300  # 5 minutes
MAX_REQUESTS_PER_WINDOW = 5  # Max 5 requests per 5 minutes
ALLOWED_ORIGINS = [
    'https://main.dbovg7p76124l.amplifyapp.com',
    'https://tesconnections.com',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
]

def sanitize_input(text, max_length=1000):
    """
    Sanitize user input to prevent XSS and injection attacks
    """
    if not text:
        return ""
    
    # Limit length
    text = text[:max_length]
    
    # Remove HTML tags and escape special characters
    text = html.escape(text.strip())
    
    # Remove potentially dangerous characters
    text = re.sub(r'[<>"\']', '', text)
    
    # Remove control characters
    text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    
    return text

def validate_name(name):
    """
    Validate name field with strict rules
    """
    if not name or len(name.strip()) < 2:
        return False, "Name must be at least 2 characters"
    
    if len(name) > 100:
        return False, "Name must be less than 100 characters"
    
    # Only allow letters, spaces, hyphens, apostrophes, and periods
    if not re.match(r"^[a-zA-Z\s\-'\.]+$", name):
        return False, "Name contains invalid characters"
    
    return True, ""

def validate_communication(method):
    """
    Validate communication method
    """
    valid_methods = ['telegram', 'email', 'teams', 'whatsapp']
    return method in valid_methods, "Invalid communication method"

def get_client_ip(event):
    """
    Extract client IP address from event
    """
    try:
        return event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
    except:
        return 'unknown'

def check_rate_limit(ip_address):
    """
    Simple rate limiting using DynamoDB
    """
    try:
        # Create a simple rate limit key
        rate_key = f"rate_limit_{ip_address}_{int(time.time() // RATE_LIMIT_WINDOW)}"
        
        # Check if this IP has exceeded the limit
        response = table.get_item(Key={'id': rate_key})
        
        if 'Item' in response:
            request_count = response['Item'].get('count', 0)
            if request_count >= MAX_REQUESTS_PER_WINDOW:
                return False, "Rate limit exceeded. Please try again later."
            
            # Increment counter
            table.update_item(
                Key={'id': rate_key},
                UpdateExpression='SET #count = #count + :inc',
                ExpressionAttributeNames={'#count': 'count'},
                ExpressionAttributeValues={':inc': 1}
            )
        else:
            # First request in this window
            table.put_item(Item={
                'id': rate_key,
                'count': 1,
                'ttl': int(time.time()) + (RATE_LIMIT_WINDOW * 2)  # Auto-delete after 2 windows
            })
        
        return True, ""
    except Exception as e:
        print(f"Rate limit check failed: {e}")
        # Allow request if rate limiting fails
        return True, ""

def get_cors_headers(origin):
    """
    Get CORS headers based on origin
    """
    if origin in ALLOWED_ORIGINS:
        return {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
            'Access-Control-Max-Age': '86400'
        }
    else:
        return {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'null',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        }

def lambda_handler(event, context):
    """
    AWS Lambda function to handle form submissions and store data in DynamoDB
    Enhanced with security measures
    """
    
    # Get origin for CORS
    origin = event.get('headers', {}).get('origin', '')
    cors_headers = get_cors_headers(origin)
    
    # Handle preflight OPTIONS request
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }
    
    try:
        # Security: Check request size
        request_size = len(str(event.get('body', '')))
        if request_size > MAX_REQUEST_SIZE:
            return {
                'statusCode': 413,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Request too large',
                    'message': 'Request size exceeds maximum allowed'
                })
            }
        
        # Get client IP for rate limiting
        client_ip = get_client_ip(event)
        
        # Security: Rate limiting
        rate_ok, rate_message = check_rate_limit(client_ip)
        if not rate_ok:
            return {
                'statusCode': 429,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Rate limit exceeded',
                    'message': rate_message
                })
            }
        
        # Parse request body
        if isinstance(event['body'], str):
            body = json.loads(event['body'])
        else:
            body = event['body']
        
        # Security: Validate required fields with sanitization
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
        
        # Security: Validate and sanitize name
        name_valid, name_error = validate_name(body['name'])
        if not name_valid:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Invalid name',
                    'message': name_error
                })
            }
        
        # Security: Validate communication method
        comm_valid, comm_error = validate_communication(body['communication'])
        if not comm_valid:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Invalid communication method',
                    'message': comm_error
                })
            }
        
        # Security: Sanitize all text inputs
        sanitized_name = sanitize_input(body['name'], 100)
        sanitized_info = sanitize_input(body.get('info', ''), 500)
        sanitized_comments = sanitize_input(body.get('comments', ''), 1000)
        
        # Generate unique ID
        submission_id = str(uuid.uuid4())
        
        # Security: Prepare sanitized data for DynamoDB
        item = {
            'id': submission_id,
            'name': sanitized_name,
            'communication': body['communication'],
            'info': sanitized_info,
            'comments': sanitized_comments,
            'timestamp': body.get('timestamp', datetime.utcnow().isoformat()),
            'userAgent': sanitize_input(body.get('userAgent', ''), 200),
            'referrer': sanitize_input(body.get('referrer', ''), 200),
            'ipAddress': client_ip,
            'createdAt': datetime.utcnow().isoformat(),
            'status': 'new',
            'ttl': int(time.time()) + (365 * 24 * 60 * 60)  # Auto-delete after 1 year
        }
        
        # Store in DynamoDB
        table.put_item(Item=item)
        
        # Log successful submission (without sensitive data)
        print(f"Form submission stored successfully: {submission_id} from IP: {client_ip}")
        
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