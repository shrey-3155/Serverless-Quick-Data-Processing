const functions = require('@google-cloud/functions-framework');
const {PubSub} = require('@google-cloud/pubsub');
const pubsub = new PubSub();

// Replace with your Pub/Sub topic name
const TOPIC_NAME = 'projects/qdp-pubsub/topics/customer-concerns';

functions.http('helloHttp', async (req, res) => {
  //res.send(`Hello ${req.query.name || req.body.name || 'World'}!`);
    try{
        if (req.method !== 'POST') {
        return res.status(405).send('Only POST requests are allowed.');
        }

        // Publish the message to Pub/Sub topic
        const referenceCode = req.body.referenceCode;
        const concernMessage = req.body.concernMessage;
        const userEmail = req.body.userEmail;
        const message = JSON.stringify({ referenceCode, concernMessage, userEmail });
        
        const dataBuffer = Buffer.from(message);

        try {
            const messageId = await pubsub.topic(TOPIC_NAME).publish(dataBuffer);
            console.log(`Message ${messageId} published.`);
        } catch (error) {
            console.error('Error publishing message:', error);
        }
        res.status(200).send(`Message Published`)
    }
    catch(error){
        console.error('Error processing the request:', error);
        res.status(500).send('Internal Server Error');
    }
    
});
