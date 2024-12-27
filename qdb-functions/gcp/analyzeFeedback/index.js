const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');
const language = require('@google-cloud/language');

const firestore = new Firestore({
	projectId: 'serverless-project-gp3',
});

const languageClient = new language.LanguageServiceClient();

functions.http('analyzeFeedback', async (req, res) => {
	res.set({
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '3600'
	});

	if (req.method === 'OPTIONS') {
		res.status(204).send('');
		return;
	}

	if (req.method !== 'GET') {
		return res.status(405).json({
			statusCode: 405,
			message: 'Method Not Allowed'
		});
	}

	try {
		const feedbackRef = firestore.collection('user_feedback');
		const snapshot = await feedbackRef.where('sentiment_analyzed', '==', false).get();

		for (const doc of snapshot.docs) {
			const data = doc.data();
			const text = data.feedback_text;

			const document = {
				content: text,
				type: 'PLAIN_TEXT',
			};

			const [result] = await languageClient.analyzeSentiment({ document });
			const sentiment = result.documentSentiment;

			await doc.ref.update({
				sentiment_score: sentiment.score,
				sentiment_magnitude: sentiment.magnitude,
				sentiment_analyzed: true
			});
		}

		res.status(200).json({
			statusCode: 200,
			message: 'Feedback analysis completed and stored successfully'
		});

	} catch (error) {
		console.error('Error analyzing feedback:', error);
		res.status(500).json({
			statusCode: 500,
			message: 'Internal Server Error'
		});
	}
});
