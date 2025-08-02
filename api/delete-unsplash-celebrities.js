// Create /api/delete-unsplash-celebrities.js
// This will delete the 4 Unsplash celebrities for you

import { Client } from 'pg';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    // IDs to delete (the ones with Unsplash images)
    const idsToDelete = ['tina-fey', 'rebel-wilson', 'rosie-odonnell', 'amy-schumer'];

    // First, get the celebrities we're about to delete for confirmation
    const selectQuery = `SELECT id, name, image_url FROM celebrities WHERE id = ANY($1)`;
    const selectResult = await client.query(selectQuery, [idsToDelete]);
    const celebritiesToDelete = selectResult.rows;

    if (celebritiesToDelete.length === 0) {
      await client.end();
      return res.status(200).json({
        success: true,
        message: 'No Unsplash celebrities found to delete',
        deleted: []
      });
    }

    // Delete the celebrities
    const deleteQuery = `DELETE FROM celebrities WHERE id = ANY($1)`;
    const deleteResult = await client.query(deleteQuery, [idsToDelete]);

    // Get the remaining count
    const countResult = await client.query('SELECT COUNT(*) as total FROM celebrities');
    const remainingCount = countResult.rows[0].total;

    // Verify no Unsplash URLs remain
    const unsplashCheck = await client.query(`SELECT COUNT(*) as unsplash_count FROM celebrities WHERE image_url LIKE '%unsplash%'`);
    const remainingUnsplash = unsplashCheck.rows[0].unsplash_count;

    await client.end();

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${deleteResult.rowCount} celebrities with Unsplash images`,
      deleted: celebritiesToDelete,
      remainingCelebrities: parseInt(remainingCount),
      remainingUnsplashImages: parseInt(remainingUnsplash)
    });

  } catch (error) {
    if (client) {
      try {
        await client.end();
      } catch (e) {
        console.error('Error closing client:', e);
      }
    }
    
    console.error('Delete error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete celebrities', 
      details: error.message 
    });
  }
}
