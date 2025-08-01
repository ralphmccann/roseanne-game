import { Client } from 'pg';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

    if (req.method === 'GET') {
      const { id, approved } = req.query;
      
      if (id === 'random') {
        // Get random approved celebrity for voting
        const result = await client.query(`
          SELECT id, name, subtitle, image_url,
                 (SELECT COUNT(*) FROM votes WHERE celebrity_id = c.id AND vote_type = 'roseanne') as roseanne_votes,
                 (SELECT COUNT(*) FROM votes WHERE celebrity_id = c.id AND vote_type = 'not-roseanne') as not_roseanne_votes
          FROM celebrities c
          WHERE approved = true
          ORDER BY RANDOM()
          LIMIT 1
        `);
        
        if (result.rows.length === 0) {
          await client.end();
          return res.status(404).json({ error: 'No approved celebrities found' });
        }
        
        await client.end();
        return res.status(200).json(result.rows[0]);
      } else if (id) {
        // Get specific celebrity
        const result = await client.query(`
          SELECT id, name, subtitle, image_url,
                 (SELECT COUNT(*) FROM votes WHERE celebrity_id = c.id AND vote_type = 'roseanne') as roseanne_votes,
                 (SELECT COUNT(*) FROM votes WHERE celebrity_id = c.id AND vote_type = 'not-roseanne') as not_roseanne_votes
          FROM celebrities c
          WHERE id = $1 AND approved = true
        `, [id]);
        
        if (result.rows.length === 0) {
          await client.end();
          return res.status(404).json({ error: 'Celebrity not found' });
        }
        
        await client.end();
        return res.status(200).json(result.rows[0]);
      } else {
        // Get all celebrities, optionally filtered by approval status
        let whereClause = '';
        let queryParams = [];
        
        if (approved === 'false') {
          whereClause = 'WHERE approved = false';
        } else if (approved === 'true') {
          whereClause = 'WHERE approved = true';
        } else {
          // Default: only show approved celebrities for public access
          whereClause = 'WHERE approved = true';
        }

        const result = await client.query(`
          SELECT id, name, subtitle, image_url, submitted_by, approved, created_at,
                 (SELECT COUNT(*) FROM votes WHERE celebrity_id = c.id AND vote_type = 'roseanne') as roseanne_votes,
                 (SELECT COUNT(*) FROM votes WHERE celebrity_id = c.id AND vote_type = 'not-roseanne') as not_roseanne_votes
          FROM celebrities c
          ${whereClause}
          ORDER BY created_at DESC
        `, queryParams);
        
        await client.end();
        return res.status(200).json(result.rows);
      }
    }

    if (req.method === 'POST') {
      // Submit new celebrity for approval
      const { name, subtitle, image_url, submitted_by } = req.body;
      
      if (!name || !image_url) {
        await client.end();
        return res.status(400).json({ error: 'Name and image URL are required' });
      }

      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      
      // Check if celebrity already exists
      const existingCheck = await client.query(
        'SELECT id FROM celebrities WHERE id = $1',
        [id]
      );

      if (existingCheck.rows.length > 0) {
        await client.end();
        return res.status(400).json({ error: 'Celebrity with this name already exists' });
      }
      
      await client.query(`
        INSERT INTO celebrities (id, name, subtitle, image_url, submitted_by, approved, created_at)
        VALUES ($1, $2, $3, $4, $5, false, NOW())
      `, [id, name, subtitle || '', image_url, submitted_by || 'anonymous']);
      
      await client.end();
      return res.status(201).json({ 
        success: true, 
        message: 'Celebrity submitted for approval!',
        id: id
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
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
