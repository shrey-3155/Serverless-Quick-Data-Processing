const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore({
	projectId: 'serverless-project-gp3',
});

functions.http('store-feedback', async (req, res) => {
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.set('Access-Control-Allow-Headers', 'Content-Type');

	// Handle OPTIONS request
	if (req.method === 'OPTIONS') {
		res.status(204).send('');
		return;
	}

	// Verify it's a POST request
	if (req.method !== 'POST') {
		return res.status(405).send('Method Not Allowed');
	}

	try {
		// Extract required fields from request body
		const { feedback_text, processing_type, user_id } = req.body;

		// Validate required fields
		if (!feedback_text || !processing_type || !user_id) {
			return res.status(400).send('Missing required fields');
		}

		// Prepare feedback document
		const feedbackDocument = {
			feedback_text: feedback_text,
			processing_type: processing_type,
			sentiment_magnitude: 0,
			sentiment_score: 0,
			timestamp: new Date(),
			user_id: user_id
		};

		// Store in specific Firestore database and collection
		const docRef = await firestore.collection('user_feedback').add(feedbackDocument);

		// Send success response
		res.status(201).json({
			message: 'Feedback stored successfully',
			documentId: docRef.id
		});

	} catch (error) {
		console.error('Error storing feedback:', error);
		res.status(500).send('Internal Server Error');
	}
});
