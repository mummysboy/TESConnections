import json
import boto3
import uuid
import re
import html
from datetime import datetime, timedelta
from botocore.exceptions import ClientError
import os
import hashlib
import time
import jwt
import requests
from urllib.parse import urlparse
import secrets

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

# Cognito configuration
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID', '')
COGNITO_REGION = os.environ.get('AWS_REGION', 'us-west-1')

# PIN Authentication configuration
ADMIN_PIN = os.environ.get('ADMIN_PIN', '1234')  # Set this in Lambda environment variables
PIN_SESSION_SECRET = os.environ.get('PIN_SESSION_SECRET', 'your-secret-key-change-this')
PIN_SESSION_DURATION = 24 * 60 * 60  # 24 hours in seconds

def get_cognito_public_keys():
    """
    Get Cognito public keys for JWT verification
    """
    try:
        url = f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json'
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching Cognito public keys: {e}")
        return None

def verify_jwt_token(token):
    """
    Verify JWT token from Cognito
    """
    try:
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
        
        # Get public keys
        public_keys = get_cognito_public_keys()
        if not public_keys:
            return False, "Unable to verify token"
        
        # Decode token header to get key ID
        unverified_header = jwt.get_unverified_header(token)
        key_id = unverified_header.get('kid')
        
        if not key_id:
            return False, "Invalid token header"
        
        # Find the correct public key
        public_key = None
        for key in public_keys['keys']:
            if key['kid'] == key_id:
                public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
                break
        
        if not public_key:
            return False, "Public key not found"
        
        # Verify and decode the token
        decoded_token = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            audience=None,  # Cognito doesn't use audience
            issuer=f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}',
            options={"verify_exp": True}
        )
        
        return True, decoded_token
        
    except jwt.ExpiredSignatureError:
        return False, "Token has expired"
    except jwt.InvalidTokenError as e:
        return False, f"Invalid token: {str(e)}"
    except Exception as e:
        print(f"JWT verification error: {e}")
        return False, "Token verification failed"

def verify_pin_token(token):
    """
    Verify PIN-based session token
    """
    try:
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
        
        # Decode the token
        decoded_token = jwt.decode(
            token,
            PIN_SESSION_SECRET,
            algorithms=['HS256'],
            options={"verify_exp": True}
        )
        
        # Check if token is still valid
        if decoded_token.get('type') != 'pin_session':
            return False, "Invalid token type"
        
        return True, decoded_token
        
    except jwt.ExpiredSignatureError:
        return False, "PIN session has expired"
    except jwt.InvalidTokenError as e:
        return False, f"Invalid PIN token: {str(e)}"
    except Exception as e:
        print(f"PIN token verification error: {e}")
        return False, "PIN token verification failed"

def generate_pin_session_token():
    """
    Generate a PIN-based session token
    """
    payload = {
        'type': 'pin_session',
        'user': 'admin',
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(seconds=PIN_SESSION_DURATION),
        'jti': str(uuid.uuid4())  # Unique token ID
    }
    
    token = jwt.encode(payload, PIN_SESSION_SECRET, algorithm='HS256')
    return token

def authenticate_pin(pin):
    """
    Authenticate PIN and return session token
    """
    if pin == ADMIN_PIN:
        return True, generate_pin_session_token()
    else:
        return False, "Invalid PIN"

def is_admin_endpoint(path):
    """
    Check if the request is for an admin endpoint
    """
    admin_paths = ['/admin-data', '/delete-submission']
    return any(path.endswith(admin_path) for admin_path in admin_paths)

def validate_admin_access(event):
    """
    Validate admin access for protected endpoints
    """
    if not is_admin_endpoint(event.get('path', '')):
        return True, None
    
    # Check for Authorization header
    headers = event.get('headers', {})
    auth_header = headers.get('Authorization') or headers.get('authorization')
    
    if not auth_header:
        return False, "Authorization header missing"
    
    # Try PIN authentication first
    is_valid, result = verify_pin_token(auth_header)
    if is_valid:
        return True, result
    
    # Fallback to Cognito JWT verification
    is_valid, result = verify_jwt_token(auth_header)
    if is_valid:
        return True, result
    
    return False, "Invalid authentication token"

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
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Max-Age': '86400'
        }
    else:
        return {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'null',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        }

def get_admin_data():
    """
    Retrieve all form submissions for admin dashboard
    """
    try:
        # Scan DynamoDB table to get all items
        response = table.scan()
        items = response.get('Items', [])
        
        # Process items to match admin dashboard format
        submissions = []
        for item in items:
            # Skip rate limit entries
            item_id = item.get('id', '')
            if item_id.startswith('rate_limit'):
                continue
                
            # Determine type based on whether it has a meeting time
            time_slot = item.get('timeSlot')
            submission_type = 'meeting' if time_slot else 'connection'
            
            submission = {
                'id': item_id,
                'name': item['name'],
                'communication': item['communication'],
                'info': item.get('info', ''),
                'comments': item.get('comments', ''),
                'timeSlot': time_slot,
                'timestamp': item['createdAt'],
                'type': submission_type
            }
            submissions.append(submission)
        
        # Sort by creation date (newest first)
        submissions.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return submissions
        
    except Exception as e:
        print(f"Error retrieving admin data: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return []

def delete_submission(submission_id):
    """
    Delete a submission from DynamoDB
    """
    try:
        table.delete_item(Key={'id': submission_id})
        return True
    except Exception as e:
        print(f"Error deleting submission: {e}")
        return False

def lambda_handler(event, context):
    """
    AWS Lambda function to handle form submissions, admin data, and store data in DynamoDB
    Enhanced with security measures and Cognito authentication
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
    
    # Validate admin access for protected endpoints
    admin_access_valid, admin_error = validate_admin_access(event)
    if not admin_access_valid:
        return {
            'statusCode': 401,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Unauthorized',
                'message': admin_error
            })
        }
    
    # Handle PIN authentication requests
    if event['httpMethod'] == 'POST' and '/pin-auth' in event.get('path', ''):
        try:
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
            
            pin = body.get('pin')
            if not pin:
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'success': False,
                        'message': 'PIN is required'
                    })
                }
            
            # Authenticate PIN
            is_valid, result = authenticate_pin(pin)
            
            if is_valid:
                return {
                    'statusCode': 200,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'success': True,
                        'sessionToken': result,
                        'message': 'PIN authentication successful'
                    })
                }
            else:
                return {
                    'statusCode': 401,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'success': False,
                        'message': result
                    })
                }
                
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'Authentication failed'
                })
            }
    
    # Handle OPTIONS requests for CORS preflight
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': ''
        }
    
    # Handle admin data requests
    if event['httpMethod'] == 'GET' and '/admin-data' in event.get('path', ''):
        try:
            submissions = get_admin_data()
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'submissions': submissions,
                    'count': len(submissions)
                })
            }
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Failed to retrieve admin data',
                    'message': str(e)
                })
            }
    
    # Handle delete requests
    if event['httpMethod'] == 'DELETE' and '/delete-submission' in event.get('path', ''):
        try:
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
            
            submission_id = body.get('id')
            if not submission_id:
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'error': 'Missing submission ID',
                        'message': 'Submission ID is required'
                    })
                }
            
            success = delete_submission(submission_id)
            if success:
                return {
                    'statusCode': 200,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'message': 'Submission deleted successfully',
                        'id': submission_id
                    })
                }
            else:
                return {
                    'statusCode': 500,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'error': 'Failed to delete submission',
                        'message': 'Could not delete the submission'
                    })
                }
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Delete request failed',
                    'message': str(e)
                })
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
            'timeSlot': body.get('timeSlot'),  # Add timeSlot for meetings
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