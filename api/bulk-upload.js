import { Client } from 'pg';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;

  try {
    const { celebrities } = req.body;
    
    if (!celebrities || !Array.isArray(celebrities)) {
      return res.status(400).json({ error: 'Invalid celebrities data' });
    }

    if (celebrities.length === 0) {
      return res.status(400).json({ error: 'No celebrities to upload' });
    }

    if (celebrities.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 celebrities per upload' });
    }

    client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const celebrity of celebrities) {
      try {
        const { name, subtitle, image_url, approved } = celebrity;
        
        if (!name || !image_url) {
          results.failed++;
          results.errors.push(`${name || 'Unknown'}: Name and image URL are required`);
          continue;
        }

        // Generate ID from name
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        
        // Check if celebrity already exists
        const existingCheck = await client.query(
          'SELECT id FROM celebrities WHERE id = $1',
          [id]
        );

        if (existingCheck.rows.length > 0) {
          results.failed++;
          results.errors.push(`${name}: Celebrity already exists with ID ${id}`);
          continue;
        }

        // Insert celebrity
        await client.query(`
          INSERT INTO celebrities (id, name, subtitle, image_url, submitted_by, approved, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          id,
          name,
          subtitle || '',
          image_url,
          'bulk-upload',
          approved !== false && approved !== 'false' // Default to true unless explicitly false
        ]);

        results.successful++;

      } catch (error) {
        results.failed++;
        results.errors.push(`${celebrity.name || 'Unknown'}: ${error.message}`);
      }
    }

    await client.end();

    return res.status(200).json({
      success: true,
      message: `Bulk upload completed: ${results.successful} successful, ${results.failed} failed`,
      results: results
    });

  } catch (error) {
    if (client) {
      try {
        await client.end();
      } catch (e) {
        console.error('Error closing client:', e);
      }
    }
    
    console.error('Bulk upload error:', error);
    return res.status(500).json({ 
      error: 'Bulk upload failed', 
      details: error.message 
    });
  }
}
