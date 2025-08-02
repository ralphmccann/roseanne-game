// Create a new API file: /api/test-images.js
// This will help you verify which images are loading correctly

import { Client } from 'pg';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;

  try {
    client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();

    // Get all celebrities
    const result = await client.query('SELECT id, name, image_url FROM celebrities ORDER BY name');
    const celebrities = result.rows;

    // Test each image URL
    const imageTests = await Promise.all(
      celebrities.map(async (celebrity) => {
        try {
          const response = await fetch(celebrity.image_url, { 
            method: 'HEAD',
            timeout: 5000 
          });
          
          return {
            id: celebrity.id,
            name: celebrity.name,
            url: celebrity.image_url,
            status: response.ok ? 'OK' : 'FAILED',
            statusCode: response.status
          };
        } catch (error) {
          return {
            id: celebrity.id,
            name: celebrity.name,
            url: celebrity.image_url,
            status: 'ERROR',
            error: error.message
          };
        }
      })
    );

    await client.end();

    const working = imageTests.filter(test => test.status === 'OK');
    const broken = imageTests.filter(test => test.status !== 'OK');

    return res.status(200).json({
      summary: {
        total: imageTests.length,
        working: working.length,
        broken: broken.length
      },
      results: imageTests,
      brokenImages: broken
    });

  } catch (error) {
    if (client) {
      try {
        await client.end();
      } catch (e) {
        console.error('Error closing client:', e);
      }
    }
    
    console.error('Image test error:', error);
    return res.status(500).json({ 
      error: 'Failed to test images', 
      details: error.message 
    });
  }
}
