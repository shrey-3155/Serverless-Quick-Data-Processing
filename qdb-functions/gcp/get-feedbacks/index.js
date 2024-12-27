const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore({
	projectId: 'serverless-project-gp3',
});

functions.http('getFeedbacks', async (req, res) => {
	res.set({
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '3600'
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
			message: 'Method Not Allowed'
		});
	}

	try {
		// Get pagination parameters from query string
		const pageSize = parseInt(req.query.pageSize) || 10;
		const lastDocId = req.query.lastDocId || null;

		// Base query
		let query = firestore.collection('user_feedback')
			.orderBy('timestamp', 'desc')
			.limit(pageSize + 1); // Get one extra to check if there are more pages

		// If lastDocId is provided, start after that document
		if (lastDocId) {
			const lastDocRef = firestore.collection('user_feedback').doc(lastDocId);
			const lastDocSnapshot = await lastDocRef.get();

			if (!lastDocSnapshot.exists) {
				return res.status(400).json({
					statusCode: 400,
					message: 'Invalid last document ID'
				});
			}

			query = query.startAfter(lastDocSnapshot);
		}

		// Execute query
		const snapshot = await query.get();

		const feedbacks = [];
		let hasNextPage = false;

		// Process results
		snapshot.docs.forEach((doc, index) => {
			// Only add documents up to the requested pageSize
			if (index < pageSize) {
				const feedbackData = doc.data();
				feedbacks.push({
					id: doc.id,
					...feedbackData,
					timestamp: feedbackData.timestamp ?
						feedbackData.timestamp.toDate().toISOString() : null
				});
			} else {
				hasNextPage = true;
			}
		});

		// Send response
		res.status(200).json({
			statusCode: 200,
			data: {
				feedbacks,
				pageInfo: {
					hasNextPage,
					lastDocId: feedbacks.length > 0 ? feedbacks[feedbacks.length - 1].id : null,
					pageSize,
					totalFetched: feedbacks.length
				}
			}
		});
	} catch (error) {
		console.error('Error fetching feedbacks:', error);
		res.status(500).json({
			statusCode: 500,
			message: 'Internal Server Error',
			error: error.message
		});
	}
});
