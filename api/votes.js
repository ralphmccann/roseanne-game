import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { celebrity_id, vote_type } = req.body;
    
    // Validate input
    if (!celebrity_id || !vote_type) {
      return res.status(400).json({ error: 'Celebrity ID and vote type are required' });
    }
    
    if (!['roseanne', 'not-roseanne'].includes(vote_type)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    // Get user IP for basic duplicate prevention
    const user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    
    // Check if celebrity exists
    const celebrityCheck = await sql`
      SELECT id FROM celebrities WHERE id = ${celebrity_id} AND approved = true
    `;
    
    if (celebrityCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Celebrity not found' });
    }

    // Insert vote
    await sql`
      INSERT INTO votes (celebrity_id, vote_type, user_ip, created_at)
      VALUES (${celebrity_id}, ${vote_type}, ${user_ip}, NOW())
    `;

    // Get updated vote counts
    const result = await sql`
      SELECT 
        (SELECT COUNT(*) FROM votes WHERE celebrity_id = ${celebrity_id} AND vote_type = 'roseanne') as roseanne_votes,
        (SELECT COUNT(*) FROM votes WHERE celebrity_id = ${celebrity_id} AND vote_type = 'not-roseanne') as not_roseanne_votes
    `;

    const newTotals = result.rows[0];

    return res.status(200).json({
      success: true,
      newTotals: {
        roseanneVotes: parseInt(newTotals.roseanne_votes),
        notRoseanneVotes: parseInt(newTotals.not_roseanne_votes)
      }
    });

  } catch (error) {
    console.error('Vote error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
