import json
import boto3
import requests

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Messages')

def lambda_handler(event, context):
    # TODO implement
    body = json.loads(event['body']) # comment these 3 lines while testing
    
    item = {
        'messageId': body['messageId'],
        'referenceCode': body['referenceCode'],
        'userEmail': body['userEmail'],
        'concernMessage': body['concernMessage'],
        'assignedAgent': body['assignedAgent'], 
        'timestamp': body['timestamp']    
    }
    
    # Store the item in DynamoDB
    response = table.put_item(Item=item)

    return {
        'Message': json.dumps(response)
    }
