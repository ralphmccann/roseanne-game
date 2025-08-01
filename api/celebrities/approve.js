import { Client } from 'pg';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

    if (req.method === 'POST') {
      // Approve and optionally update celebrity
      const { id, name, subtitle, image_url, approved } = req.body;
      
      if (!id) {
        await client.end();
        return res.status(400).json({ error: 'Celebrity ID is required' });
      }

      // Check if celebrity exists
      const existingCheck = await client.query(
        'SELECT id FROM celebrities WHERE id = $1',
        [id]
      );

      if (existingCheck.rows.length === 0) {
        await client.end();
        return res.status(404).json({ error: 'Celebrity not found' });
      }

      // Build update query based on provided fields
      let updateQuery = 'UPDATE celebrities SET ';
      let updateValues = [];
      let valueIndex = 1;

      if (name) {
        updateQuery += `name = $${valueIndex}, `;
        updateValues.push(name);
        valueIndex++;
      }

      if (subtitle !== undefined) {
        updateQuery += `subtitle = $${valueIndex}, `;
        updateValues.push(subtitle);
        valueIndex++;
      }

      if (image_url) {
        updateQuery += `image_url = $${valueIndex}, `;
        updateValues.push(image_url);
        valueIndex++;
      }

      if (approved !== undefined) {
        updateQuery += `approved = $${valueIndex}, `;
        updateValues.push(approved);
        valueIndex++;
      }

      // Remove trailing comma and space, add WHERE clause
      updateQuery = updateQuery.slice(0, -2) + ` WHERE id = $${valueIndex}`;
      updateValues.push(id);

      await client.query(updateQuery, updateValues);
      await client.end();

      return res.status(200).json({ 
        success: true, 
        message: 'Celebrity updated successfully' 
      });
    }

    if (req.method === 'DELETE') {
      // Reject (delete) celebrity
      const { id } = req.body;
      
      if (!id) {
        await client.end();
        return res.status(400).json({ error: 'Celebrity ID is required' });
      }

      // Delete the celebrity
      const deleteResult = await client.query(
        'DELETE FROM celebrities WHERE id = $1',
        [id]
      );

      await client.end();

      if (deleteResult.rowCount === 0) {
        return res.status(404).json({ error: 'Celebrity not found' });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Celebrity rejected and removed' 
      });
    }

    await client.end();
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    if (client) {
      try {
        await client.end();
      } catch (e) {
        console.error('Error closing client:', e);
      }
    }
    
    console.error('Approval API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
