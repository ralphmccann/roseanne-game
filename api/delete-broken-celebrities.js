// Create /api/delete-broken-celebrities.js
// This will remove the 3 broken celebrities

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

    // First, get the celebrities we're about to delete
    const toDeleteQuery = `
      SELECT id, name, image_url FROM celebrities 
      WHERE name = 'Suzie Izzard' 
         OR name LIKE '%Galifianakis%' 
         OR name LIKE '%Dwayne%'
    `;
    
    const toDeleteResult = await client.query(toDeleteQuery);
    const celebritiesToDelete = toDeleteResult.rows;

    if (celebritiesToDelete.length === 0) {
      await client.end();
      return res.status(200).json({
        success: true,
        message: 'No broken celebrities found to delete',
        deleted: []
      });
    }

    // Delete the celebrities
    const deleteQuery = `
      DELETE FROM celebrities 
      WHERE name = 'Suzie Izzard' 
         OR name LIKE '%Galifianakis%' 
         OR name LIKE '%Dwayne%'
    `;
    
    const deleteResult = await client.query(deleteQuery);

    // Get the new count
    const countResult = await client.query('SELECT COUNT(*) as total FROM celebrities');
    const remainingCount = countResult.rows[0].total;

    await client.end();

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${deleteResult.rowCount} celebrities`,
      deleted: celebritiesToDelete,
      remainingCelebrities: parseInt(remainingCount)
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
