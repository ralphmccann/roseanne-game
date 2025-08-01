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

    // Insert initial celebrities with your custom images
await client.query(`
  INSERT INTO celebrities (id, name, subtitle, image_url, approved) VALUES
  ('melissa-mccarthy', 'Melissa McCarthy', 'Comedian & Actress', 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Melissa%20McCarthy.jpg', true),
  ('amy-schumer', 'Amy Schumer', 'Stand-up Comedian', 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Amy%20Schumer.jpg', true),
  ('tina-fey', 'Tina Fey', 'Writer & Comedian', 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Tina%20Fey.jpg', true),
  ('rebel-wilson', 'Rebel Wilson', 'Actress & Comedian', 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Rebel%20Wilson.png', true),
  ('rosie-odonnell', 'Rosie O''Donnell', 'TV Host & Comedian', 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Rosie%20ODonnell.png', true)
  ON CONFLICT (id) DO UPDATE SET 
    image_url = EXCLUDED.image_url,
    name = EXCLUDED.name,
    subtitle = EXCLUDED.subtitle
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
