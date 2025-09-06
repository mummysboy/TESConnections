# TESConnections - Contact Form Data Structure

## DynamoDB Table Schema

### Primary Key
- `id` (String): Unique identifier for each submission (UUID)

### Attributes
- `name` (String): Full name of the person
- `communication` (String): Preferred communication method
  - Values: "telegram", "email", "teams", "whatsapp"
- `info` (String): Additional information (optional)
- `comments` (String): Comments section (optional)
- `timestamp` (String): ISO timestamp from client
- `userAgent` (String): Browser user agent
- `referrer` (String): Page referrer
- `ipAddress` (String): Client IP address
- `createdAt` (String): Server timestamp
- `status` (String): Processing status ("new", "processed", "contacted")

### Global Secondary Index
- `StatusCreatedAtIndex`: Query by status and creation date

## API Request Format

```json
{
  "name": "John Doe",
  "communication": "email",
  "info": "Additional details",
  "comments": "Comments here",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "userAgent": "Mozilla/5.0...",
  "referrer": "https://example.com"
}
```

## API Response Format

### Success Response
```json
{
  "message": "Form submitted successfully",
  "submissionId": "uuid-here",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Human readable error message"
}
```