const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
const firestore = new Firestore({
	projectId: 'serverless-project-gp3',
});

// Enum values for user type
const validUserTypes = ["Guest", "Registered Customer", "QDP Agent"];

functions.http('storeUserStatistics', async (req, res) => {
	// Enhanced CORS headers
	res.set({
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '3600',
	});

	// Handle OPTIONS request
	if (req.method === 'OPTIONS') {
		res.status(204).send('');
		return;
	}

	// Verify it's a POST request
	if (req.method !== 'POST') {
		return res.status(405).json({
			statusCode: 405,
			message: 'Method Not Allowed',
		});
	}

	try {
		// Extract required fields from request body
		const { last_login, login_count, registration_date, user_id, user_type } = req.body;

		// Validate required fields
		if (!last_login || login_count === undefined || !registration_date || !user_id || !user_type) {
			return res.status(400).json({
				statusCode: 400,
				message: 'Missing required fields',
			});
		}

		// Validate user_type enum
		if (!validUserTypes.includes(user_type)) {
			return res.status(400).json({
				statusCode: 400,
				message: `Invalid user_type. Allowed values are: ${validUserTypes.join(', ')}`,
			});
		}

		// Prepare user statistics document
		const userStatisticsDocument = {
			last_login: new Date(last_login),
			login_count: Number(login_count),
			registration_date: new Date(registration_date),
			user_id: user_id.toString(), // Ensure user_id is a string (email)
			user_type,
		};

		// Store in Firestore
		const docRef = await firestore
			.collection('user_statistics')
			.doc(user_id) // Use user_id (email) as document ID
			.set(userStatisticsDocument);

		// Send success response
		res.status(200).json({
			statusCode: 200,
			message: 'User statistics stored successfully',
			documentId: docRef.id || user_id,
		});
	} catch (error) {
		console.error('Error storing user statistics:', error);
		res.status(500).json({
			statusCode: 500,
			message: 'Internal Server Error',
		});
	}
});

