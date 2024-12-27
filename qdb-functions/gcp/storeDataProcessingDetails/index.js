const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore with specific database
const firestore = new Firestore({
	projectId: 'serverless-project-gp3',
});

// Enum values for validation
const validStatuses = ["completed", "failed", "in-progress"];
const validProcessingTypes = ["json-to-csv", "named-entity-extraction", "word-cloud"];

functions.http('storeDataProcessingDetails', async (req, res) => {
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
		const {
			end_time,
			processing_id,
			processing_type,
			result_url,
			start_time,
			status,
			user_id,
		} = req.body;

		// Validate required fields
		if (
			!end_time ||
			!processing_id ||
			!processing_type ||
			!result_url ||
			!start_time ||
			!status ||
			!user_id
		) {
			return res.status(400).json({
				statusCode: 400,
				message: 'Missing required fields',
			});
		}

		// Validate enum fields
		if (!validStatuses.includes(status)) {
			return res.status(400).json({
				statusCode: 400,
				message: `Invalid status. Allowed values are: ${validStatuses.join(', ')}`,
			});
		}

		if (!validProcessingTypes.includes(processing_type)) {
			return res.status(400).json({
				statusCode: 400,
				message: `Invalid processing type. Allowed values are: ${validProcessingTypes.join(', ')}`,
			});
		}

		// Prepare data processing document
		const dataProcessingDocument = {
			end_time: new Date(end_time),
			processing_id,
			processing_type,
			result_url,
			start_time: new Date(start_time),
			status,
			user_id: user_id.toString(), // Ensure user_id is a string
		};

		// Store in Firestore
		const docRef = await firestore
			.collection('data_processing_statistics')
			.add(dataProcessingDocument);

		// Send success response
		res.status(200).json({
			statusCode: 200,
			message: 'Data processing details stored successfully',
			documentId: docRef.id,
		});
	} catch (error) {
		console.error('Error storing data processing details:', error);
		res.status(500).json({
			statusCode: 500,
			message: 'Internal Server Error',
		});
	}
});

