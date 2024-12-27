import json
import boto3
import requests

# Initialize the DynamoDB client
dynamodb = boto3.resource('dynamodb')

table = dynamodb.Table('dp2-logs')

# Function to post token and get the email
def get_email_from_token(token):
    url = "https://c06677dwsl.execute-api.us-east-1.amazonaws.com/dev/extracttoken"  # email extraction endpoint
    # Add the token in the Authorization header
    print(token)
    trimtoken= token.strip()
    print(trimtoken)
    headers = {
        'Authorization': f'{trimtoken}'
    }
    response = requests.post(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        return data.get('userEmail', None)
        
def lambda_handler(event, context):
    # Parse the incoming request body
    body = json.loads(event['body'])
    token = body['token']  # Extract email from the body
    # Get the email associated with the token
    email = get_email_from_token(token)
    # Query DynamoDB for all records with the given email
    response = table.scan(  
        FilterExpression=boto3.dynamodb.conditions.Attr('email').eq(email)
    )

    # Check if records were found
    if 'Items' in response and len(response['Items']) > 0:
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Records found',
                'data': response['Items']  # Return all matching records
            })
        }