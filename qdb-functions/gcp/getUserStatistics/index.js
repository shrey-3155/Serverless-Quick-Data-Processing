const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
const firestore = new Firestore({
	projectId: 'serverless-project-gp3',
});

functions.http('getUserStatistics', async (req, res) => {
	// Enhanced CORS headers
	res.set({
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '3600',
	});

	// Handle OPTIONS request
	if (req.method === 'OPTIONS') {
		res.status(204).send('');
		return;
	}

	// Verify it's a GET request
	if (req.method !== 'GET') {
		return res.status(405).json({
			statusCode: 405,
			message: 'Method Not Allowed',
		});
	}

	try {
		// Extract user_id from query parameters
		const { user_id } = req.query;

		// Validate user_id
		if (!user_id) {
			return res.status(400).json({
				statusCode: 400,
				message: 'Missing required parameter: user_id',
			});
		}

		// Retrieve document from Firestore
		const docRef = firestore.collection('user_statistics').doc(user_id);
		const doc = await docRef.get();

		// Check if the document exists
		if (!doc.exists) {
			return res.status(404).json({
				statusCode: 404,
				message: `No user statistics found for user_id: ${user_id}`,
			});
		}

		// Send the retrieved document data
		res.status(200).json({
			statusCode: 200,
			message: 'User statistics retrieved successfully',
			data: doc.data(),
		});
	} catch (error) {
		console.error('Error retrieving user statistics:', error);
		res.status(500).json({
			statusCode: 500,
			message: 'Internal Server Error',
		});
	}
});

