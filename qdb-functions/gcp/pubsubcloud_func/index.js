const functions = require('@google-cloud/functions-framework');
const AWS = require('aws-sdk');
const axios = require('axios'); // Import axios for HTTP requests

// Function to get a random admin email from the endpoint
async function getRandomAdminEmail() {
  const endpointUrl = 'https://ypqctjyde2e6rwyut6oxq7fot40uryaq.lambda-url.us-east-1.on.aws/'; 
  
  try {
    // Make a GET request to the endpoint
    const response = await axios.get(endpointUrl);
    
    // Check if the response is successful and contains data
    if (response.data && response.data.message === 'Admin users retrieved successfully') {
      const adminUsers = response.data.data; // Array of admin users
      
      // If there are admin users, pick a random one
      if (adminUsers.length > 0) {
        const randomIndex = Math.floor(Math.random() * adminUsers.length);
        const randomAdmin = adminUsers[randomIndex];
        return randomAdmin.email; // Return the email of the random admin
      } else {
        throw new Error('No admin users found.');
      }
    } else {
      throw new Error('Failed to fetch admin users from the endpoint.');
    }
  } catch (error) {
    console.error('Error fetching admin email:', error);
    throw error;
  }
}

// Function to send data to an external endpoint as a POST request
async function sendResultsEndpoint(payload) {
  const endpointUrl = 'https://oo42nqfsscpqgaocdn6hm7v36i0frldb.lambda-url.us-east-1.on.aws/'; 
  try {
    const response = await axios.post(endpointUrl, payload);
    console.log('Data sent to endpoint successfully:', response.data);
  } catch (error) {
    console.error('Error sending data to endpoint:', error);
    throw error;
  }
}

// Function to send message to SQS queue
async function sendMessageToQueue(messageBody) {
  const endpointUrl = 'https://dsyitb3oxus5ed7luawlsmxew40hwlvn.lambda-url.us-east-1.on.aws/'; 
  try {
    const response = await axios.post(endpointUrl, messageBody);
    console.log('Data sent to endpoint successfully:', response.data);
  } catch (error) {
    console.error('Error sending data to endpoint:', error);
    throw error;
  }
}

// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
// Message acknowledgement happens automatically after the function trigger
functions.cloudEvent('helloPubSub', async (cloudEvent) => {
  // The Pub/Sub message is passed as the CloudEvent's data payload.
  const pubsubMessage = cloudEvent.data.message.data;
  const messageText = Buffer.from(pubsubMessage,'base64').toString();
  
  // console out put for debugging
  console.log('Message Data:', messageText);
  
  // Parse the message (assuming it's a JSON string)
  let messageData;
  try {
    messageData = JSON.parse(messageText);
  } catch (error) {
    console.error('Error parsing message data:', error);
    return;
  }

  // Extract referenceCode and concernMessage from the parsed data
  const referenceCode = messageData.referenceCode;
  const concernMessage = messageData.concernMessage;
  const userEmail = messageData.userEmail;
  
  //Fetch a random admin email
  let assignedAgent;
  try {
    assignedAgent = await getRandomAdminEmail();
    console.log('Assigned Agent:', assignedAgent); // Log the assigned agent for debugging
  } catch (error) {
    console.error('Error assigning agent:', error);
    return;
  }

  // Prepare the data to send to the external endpoint
  const payload = {
    messageId: `msg-${Date.now()}`, // A unique ID for the message (can be timestamp or UUID)
    referenceCode: referenceCode,
    userEmail: userEmail,
    concernMessage: concernMessage,
    assignedAgent: assignedAgent,
    timestamp: new Date().toISOString(),
  };

  // Send the data to the external endpoint
  try {
    await sendResultsEndpoint(payload);
  } catch (error) {
    console.error('Error sending data to endpoint:', error);
    return;
  }
    // Prepare the message for SQS
  const MessageToCustomer = {
    email: userEmail,
    message: `An agent has been assigned to you against your concern heres the detail \n
    concern: \"${concernMessage}\" \n
    reference code: \"${referenceCode}\" \n 
    assingned agent: \"${assignedAgent}\"`
  };

  const MessageToAgent = {
    email: assignedAgent,
    message: `A request has been raised by the customer below are the details\n
    concern: \"${concernMessage}\" \n
    reference code: \"${referenceCode}\" \n 
    customer email: \"${userEmail}\"`
  };

  // Send the message to customer 
  try {
    await sendMessageToQueue(MessageToCustomer);
  } catch (error) {
    console.error('Error sending message to SQS:', error);
  }

  // Send the message to Agent 
  try {
    await sendMessageToQueue(MessageToAgent);
  } catch (error) {
    console.error('Error sending message to SQS:', error);
  }

});
