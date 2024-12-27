import json
import boto3
import spacy
import en_core_web_sm
import random
import string
import requests
from datetime import datetime

# Initialize spaCy and S3 client
nlp = en_core_web_sm.load()
s3 = boto3.client('s3')

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('dp2-logs')

# Function to generate a random referenceCode starting with 'dp2'
def generate_reference_code():
    random_string = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))  # Generate random 8-character string
    return f"jb_2{random_string}"  # Prepend 'dp2' to the random string

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
    # else:
    #     raise Exception("Failed to retrieve email")

# Function to store analytics to an external endpoint
def post_to_analytics(end_time, reference_code, start_time, result_url, email):
    analytics_url = "https://us-central1-serverless-project-gp3.cloudfunctions.net/storeDataProcessingDetails"
    analytics_data = {
        "end_time": end_time,
        "processing_id": reference_code,
        "processing_type": "named-entity-extraction",
        "result_url": result_url,
        "start_time": start_time,
        "status": "completed",
        "user_id": email
    }
    response = requests.post(analytics_url, json=analytics_data)
    if response.status_code != 200:
        print(f"Failed to post analytics data. Status Code: {response.status_code}")

def lambda_handler(event, context):
    # Get the token and content from the HTTP request body
    body = json.loads(event['body']) # comment these 3 lines while testing
    token = body['token']
    content = body['content']
    
    # For local testing only
    # token = event['token']
    # content = event['content']

    # Get the current timestamp for start_time
    start_time = datetime.utcnow().isoformat()

    # Get the email associated with the token
    email = get_email_from_token(token)
    
    # Process the content with spaCy
    doc = nlp(content)
    
    # Extract named entities
    entities = [(ent.text, ent.label_) for ent in doc.ents]
    print("Named Entities:", entities)
    
    # Generate the referenceCode
    reference_code = generate_reference_code()

    # Store original content in the "original" folder in S3
    bucket = 'qdp-dp2-bucket' 
    original_file_key = f"original/{reference_code}.txt"
    s3.put_object(Bucket=bucket, Key=original_file_key, Body=content)

    # Create processed content (example: extracting named entities into a processed format)
    processed_content = "\n".join([f"{ent[0]} ({ent[1]})" for ent in entities])

    # Store the processed content in the "processed" folder in S3
    processed_file_key = f"processed/{reference_code}.txt"
    s3.put_object(Bucket=bucket, Key=processed_file_key, Body=processed_content)

    # Get the current timestamp for end_time
    end_time = datetime.utcnow().isoformat()

    # Post analytics data to the analytics endpoint
    result_url = f"s3://{bucket}/{processed_file_key}"
    resulthttp_url = f"https://{bucket}.s3.us-east-1.amazonaws.com/{processed_file_key}"
    post_to_analytics(end_time, reference_code, start_time, resulthttp_url, email)

    # Prepare the item to store in DynamoDB
    item = {
        'referenceCode': reference_code,
        'originalFileDownloadLink': f"https://{bucket}.s3.us-east-1.amazonaws.com/{original_file_key}",
        'processedFileDownloadLink': f"https://{bucket}.s3.us-east-1.amazonaws.com/{processed_file_key}",
        'email': email,
        'start_time': start_time,
        'end_time': end_time
    }

    # Store the item in DynamoDB
    response = table.put_item(Item=item)

    # Return the named entities and processing details
    return {
        'statusCode': 200,
        'body': json.dumps({
            'entities': entities,
            'originalFileDownloadLink': f"https://{bucket}.s3.us-east-1.amazonaws.com/{original_file_key}",
            'processedFileDownloadLink': f"https://{bucket}.s3.us-east-1.amazonaws.com/{processed_file_key}",
            'email': email,
            'start_time': start_time,
            'end_time': end_time,
            'reference_code': reference_code
        })
    }
