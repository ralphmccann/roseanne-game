import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { id } = req.query;
      
      if (id === 'random') {
        // Get random celebrity
        const result = await sql`
          SELECT id, name, subtitle, image_url,
                 (SELECT COUNT(*) FROM votes WHERE celebrity_id = c.id AND vote_type = 'roseanne') as roseanne_votes,
                 (SELECT COUNT(*) FROM votes WHERE celebrity_id = c.id AND vote_type = 'not-roseanne') as not_roseanne_votes
          FROM celebrities c
          WHERE approved = true
          ORDER BY RANDOM()
          LIMIT 1
        `;
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'No celebrities found' });
        }
        
        return res.status(200).json(result.rows[0]);
      } else if (id) {
        // Get specific celebrity
        const result = await sql`
          SELECT id, name, subtitle, image_url,
                 (SELECT COUNT(*) FROM votes WHERE celebrity_id = c.id AND vote_type = 'roseanne') as roseanne_votes,
                 (SELECT COUNT(*) FROM votes WHERE celebrity_id = c.id AND vote_type = 'not-roseanne') as not_roseanne_votes
          FROM celebrities c
          WHERE id = ${id} AND approved = true
        `;
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Celebrity not found' });
        }
        
        return res.status(200).json(result.rows[0]);
      } else {
        // Get all celebrities
        const result = await sql`
          SELECT id, name, subtitle, image_url,
                 (SELECT COUNT(*) FROM votes WHERE celebrity_id = c.id AND vote_type = 'roseanne') as roseanne_votes,
                 (SELECT COUNT(*) FROM votes WHERE celebrity_id = c.id AND vote_type = 'not-roseanne') as not_roseanne_votes
          FROM celebrities c
          WHERE approved = true
          ORDER BY name
        `;
        
        return res.status(200).json(result.rows);
      }
    }

    if (req.method === 'POST') {
      // Submit new celebrity for approval
      const { name, subtitle, image_url, submitted_by } = req.body;
      
      if (!name || !image_url) {
        return res.status(400).json({ error: 'Name and image URL are required' });
      }

      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      
      await sql`
        INSERT INTO celebrities (id, name, subtitle, image_url, submitted_by, approved)
        VALUES (${id}, ${name}, ${subtitle || ''}, ${image_url}, ${submitted_by || 'anonymous'}, false)
      `;
      
      return res.status(201).json({ 
        success: true, 
        message: 'Celebrity submitted for approval!',
        id: id
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
