'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { WebhookClient } = require('dialogflow-fulfillment');
const { Card, Suggestion } = require('dialogflow-fulfillment');

// Initialize Firebase Admin with default credentials
admin.initializeApp();

const db = admin.firestore();

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(async (request, response) => {
	const agent = new WebhookClient({ request, response });
	console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
	console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

	async function welcome(agent) {
		agent.add('Welcome! I can help you retrieve file results. Please provide a reference code.');
	}

	async function fallback(agent) {
		agent.add('I didn\'t understand your request. Could you please rephrase that?');
		agent.add('You can ask me to check file results by providing a reference code.');
	}

	async function fileRetrieveResults(agent) {
		try {
			// Extract reference code from parameters
			const referenceCode = agent.parameters.reference_code;

			// Validate reference code
			if (!referenceCode) {
				agent.add('Please provide a reference code to retrieve your file results.');
				return;
			}

			// Query Firestore
			const querySnapshot = await db
				.collection('file_results')
				.where('referenceCode', '==', referenceCode)
				.limit(1)
				.get();

			// Check if results exist
			if (querySnapshot.empty) {
				agent.add(`No results found for reference code: ${referenceCode}. Please check the code and try again.`);
				return;
			}

			// Process the results
			const fileResult = querySnapshot.docs[0].data();

			// Create response message
			const card = new Card({
				title: `File Results for ${referenceCode}`,
				text: `
File Name: ${fileResult.fileName || 'N/A'}\n
Status: ${fileResult.status || 'N/A'}\n
Processing Date: ${fileResult.processingDate ? new Date(fileResult.processingDate).toLocaleString() + '\n' : 'N/A\n'}
${fileResult.additionalInfo ? `Additional Info: ${fileResult.additionalInfo}\n` : ''}
                `.trim()
			});

			if (fileResult.downloadUrl) {
				card.setButton({
					text: 'Download File',
					url: fileResult.downloadUrl
				});
			}

			agent.add(card);
			agent.add('Is there anything else you would like to know?');

		} catch (error) {
			console.error('Error retrieving file results:', error);
			agent.add('I apologize, but I encountered an error while retrieving your file results. Please try again later or contact support if the problem persists.');
		}
	}

	let intentMap = new Map();
	intentMap.set('Default Welcome Intent', welcome);
	intentMap.set('Default Fallback Intent', fallback);
	intentMap.set('file.retrieve_results', fileRetrieveResults);

	await agent.handleRequest(intentMap);
});
