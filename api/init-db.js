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
      ('melissa-mccarthy', 'Melissa McCarthy', 'Comedian & Actress', 'https://www.dropbox.com/scl/fi/prl30507penubxmbqaje3/Melissa-McCarthy.png?rlkey=2xgck51tqyqbfh0yxdizh48qq&st=ckpt6jmz&dl=0', true),
      ('amy-schumer', 'Amy Schumer', 'Stand-up Comedian', 'https://www.dropbox.com/scl/fi/6bs9or9rdif0aobv2qe94/Amy-Schumer.png?rlkey=b918s5svn6hs7zrnfdadvu4uf&st=n2540fyl&dl=0', true),
      ('lisa-kudrow', 'Lisa Kudrow', 'Writer & Comedian', 'https://www.dropbox.com/scl/fi/mrws0vwax5sf8cjnxotkh/Lisa-Kudrow.png?rlkey=2n2tl9c38tct5lp6gk7qk9149&st=2j02k56l&dl=0', true),
      ('rebel-wilson', 'Rebel Wilson', 'Actress & Comedian', 'https://www.dropbox.com/scl/fi/xwldn9d0mnmjqqmqbid8c/Rebel-Wilson.png?rlkey=h9zsbtl65zimit5f47ptnir6v&st=x7ju9jdf&dl=0', true),
      ('rosie-odonnell', 'Rosie O\'Donnell', 'TV Host & Comedian', 'https://www.dropbox.com/scl/fi/2kmkrflyen0ts94esm905/Rosie-ODonnell.png?rlkey=zu3vgdgclfm7mdtrs11od5wqr&st=fqm5lz21&dl=0', true)
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
