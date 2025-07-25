import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create celebrities table
    await sql`
      CREATE TABLE IF NOT EXISTS celebrities (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        subtitle VARCHAR(200),
        image_url TEXT NOT NULL,
        submitted_by VARCHAR(100) DEFAULT 'admin',
        approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create votes table
    await sql`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        celebrity_id VARCHAR(100) NOT NULL,
        vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('roseanne', 'not-roseanne')),
        user_ip VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (celebrity_id) REFERENCES celebrities(id)
      )
    `;

    // Insert initial celebrities with your custom images
    await sql`
      INSERT INTO celebrities (id, name, subtitle, image_url, approved) VALUES
      ('melissa-mccarthy', 'Melissa McCarthy', 'Comedian & Actress', 'https://your-image-hosting.com/melissa-mccarthy.jpg', true),
      ('amy-schumer', 'Amy Schumer', 'Stand-up Comedian', 'https://your-image-hosting.com/amy-schumer.jpg', true),
      ('tina-fey', 'Tina Fey', 'Writer & Comedian', 'https://your-image-hosting.com/tina-fey.jpg', true),
      ('rebel-wilson', 'Rebel Wilson', 'Actress & Comedian', 'https://your-image-hosting.com/rebel-wilson.jpg', true),
      ('rosie-odonnell', 'Rosie O\'Donnell', 'TV Host & Comedian', 'https://your-image-hosting.com/rosie-odonnell.jpg', true)
      ON CONFLICT (id) DO NOTHING
    `;

    return res.status(200).json({ 
      success: true, 
      message: 'Database initialized successfully' 
    });

  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({ 
      error: 'Database initialization failed', 
      details: error.message 
    });
  }
}
