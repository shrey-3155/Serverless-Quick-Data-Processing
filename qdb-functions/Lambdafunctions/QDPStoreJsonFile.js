import AWS from 'aws-sdk';

const cognito = new AWS.CognitoIdentityServiceProvider();
const s3 = new AWS.S3();
import axios from 'axios';
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const INPUT_BUCKET_NAME = 'qdpinputjsonfile';
const OUTPUT_BUCKET_NAME = 'qdpoutputcsvfile';
const FOLDER_PATH = 'inputJson/';
const OUTPUT_FOLDER_PATH = 'outputCsv/';
const DYNAMODB_TABLE = 'QDPFileProcessingRecords';

export const handler = async (event) => {

  const token = event.headers['Authorization'];
  const fileName = event.queryStringParameters['filename'];
  const jsonContent = JSON.parse(event.body).content;

  console.log("ss"+jsonContent);

  let userEmail;
  try {
    const user = await cognito.getUser({
      "AccessToken": token.toString()
    }).promise();

    userEmail = user.UserAttributes.find(attr => attr.Name === 'email').Value;
  } catch (error) {
    return {
      statusCode: 403,
      body: JSON.stringify("Invalid or expired token")
    };
  }

  const timestamp = Date.now();
  const fileId = `${timestamp}-${fileName.replace('.json', '')}`;  // Unique ID for record
  const jobName = "jb_";
  const referenceId = jobName.concat(timestamp);
  const inputS3Key = `${FOLDER_PATH}${fileId}.json`;
  try {
    await s3.putObject({
      Bucket: INPUT_BUCKET_NAME,
      Key: inputS3Key,
      Body: jsonContent,
      ContentType: 'application/json'
    }).promise();
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(`Error uploading input file: ${error.message}`)
    };
  }

  const inputFileLocation = `s3://${INPUT_BUCKET_NAME}/${inputS3Key}`;
  const outputS3Key = `${OUTPUT_FOLDER_PATH}${fileId}.csv`;
  const outputFileLocation = `s3://${OUTPUT_BUCKET_NAME}/${outputS3Key}`;

  const outputFileDownloadUrl = s3.getSignedUrl('getObject', {
    Bucket: OUTPUT_BUCKET_NAME,
    Key: outputS3Key,
    Expires: 3600, // URL validity (in seconds)
  });

  const record = {
    fileId: fileId,
    fileName: fileName,
    inputFileLocation: inputFileLocation,
    outputFileLocation: outputFileLocation,
    outputFileDownloadUrl: outputFileDownloadUrl, // Add the download URL to the record
    status: 'in-progress',
    userEmail: userEmail,
    timestamp: new Date().toISOString(),
    referenceId: referenceId,
  };

  try {
    await dynamoDB.put({
      TableName: DYNAMODB_TABLE,
      Item: record
    }).promise();
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(`Error saving to DynamoDB: ${error.message}`)
    };
  }

  try{
    await axios.post(
        `https://us-central1-serverless-project-gp3.cloudfunctions.net/storeDataProcessingDetails`,
        {
          end_time: new Date().toISOString(),
          processing_id: referenceId,
          processing_type: "json-to-csv",
          result_url: outputFileDownloadUrl,
          start_time: new Date().toISOString(),
          status:"completed",
          user_id : email
        },
        { headers: { 'Content-Type': 'application/json' } }
    );

  }
  catch(error){
    throw new Error(`Error adding job details: ${error.message}`);
  }

  return {
    statusCode: 200,
    headers:{
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify({
      message: "File uploaded successfully and details saved to DynamoDB",
      record: record
    })
  };
};
