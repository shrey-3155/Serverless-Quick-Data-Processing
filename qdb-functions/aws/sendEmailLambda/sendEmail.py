import json
import boto3
from botocore.exceptions import ClientError

# Initialize the SQS client
sqs = boto3.client('sqs')

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        # Extract email and message from the event payload
        email = body['email']
        message = body['message']

        # Prepare the message for SQS
        sqs_message = {
            'email': email,
            'message': message
        }

        # SQS queue URL
        queue_url = 'https://sqs.us-east-1.amazonaws.com/054439588002/RegistrarionQueue'  

        # Send the message to the SQS queue
        response = sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(sqs_message)
        )

        # Return success response
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Message successfully sent to SQS',
                'messageId': response['MessageId']
            })
        }

    except ClientError as e:
        # Handle SQS client errors
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Failed to send message to SQS',
                'error': str(e)
            })
        }
    except KeyError as e:
        # Handle case where the expected keys are not found in the event
        return {
            'statusCode': 400,
            'body': json.dumps({
                'message': 'Invalid payload format. Missing keys.',
                'error': str(e)
            })
        }
