import { Client } from 'pg';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;
  
  try {
    // Create PostgreSQL client
    client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();

    // Create celebrities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS celebrities (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        subtitle VARCHAR(200),
        image_url TEXT NOT NULL,
        submitted_by VARCHAR(100) DEFAULT 'admin',
        approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create votes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        celebrity_id VARCHAR(100) NOT NULL,
        vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('roseanne', 'not-roseanne')),
        user_ip VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert sample celebrities
    await client.query(`
      INSERT INTO celebrities (id, name, subtitle, image_url, approved) VALUES
      ('melissa-mccarthy', 'Melissa McCarthy', 'Comedian & Actress', 'https://images.unsplash.com/photo-1494790108755-2616c9d621e0?w=400&h=400&fit=crop&crop=face', true),
      ('amy-schumer', 'Amy Schumer', 'Stand-up Comedian', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face', true),
      ('tina-fey', 'Tina Fey', 'Writer & Comedian', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face', true),
      ('rebel-wilson', 'Rebel Wilson', 'Actress & Comedian', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&crop=face', true),
      ('rosie-odonnell', 'Rosie O''Donnell', 'TV Host & Comedian', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face', true)
      ON CONFLICT (id) DO NOTHING
    `);

    await client.end();

    return res.status(200).json({ 
      success: true, 
      message: 'Database initialized successfully' 
    });

  } catch (error) {
    if (client) {
      try {
        await client.end();
      } catch (e) {
        console.error('Error closing client:', e);
      }
    }
    
    console.error('Database initialization error:', error);
    return res.status(500).json({ 
      error: 'Database initialization failed', 
      details: error.message 
    });
  }
}
