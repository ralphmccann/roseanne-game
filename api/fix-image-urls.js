// Create /api/fix-image-urls.js
// This endpoint will fix all the broken image URLs

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

    // Array of fixes to apply
    const fixes = [
      {
        id: 'zach-galifianakis',
        url: 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Zach%20Galifianakis.jpg'
      },
      {
        id: 'suzie-izzard',
        url: 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Suzie%20Izzard.jpg'
      },
      {
        id: 'seth-rogen',
        url: 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Seth%20Rogen.jpg'
      },
      {
        id: 'margo-martindale',
        url: 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Margo%20Martindale.jpg'
      },
      {
        id: 'jonah-hill',
        url: 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Jonah%20Hill.jpg'
      },
      {
        id: 'dwayne-johnson',
        url: 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Dwayne%20Johnson.jpg'
      },
      {
        id: 'holly-rowe',
        url: 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Holly%20Rowe.jpg'
      },
      {
        id: 'margaret-cho',
        url: 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Margaret%20Cho.jpg'
      },
      {
        id: 'melissa-mccarthy',
        url: 'https://raw.githubusercontent.com/williamsongrowth/roseanne-game/main/images/Melissa%20McCarthy.jpg'
      }
    ];

    const results = [];

    for (const fix of fixes) {
      try {
        const result = await client.query(
          'UPDATE celebrities SET image_url = $1 WHERE id = $2 RETURNING name',
          [fix.url, fix.id]
        );
        
        if (result.rows.length > 0) {
          results.push({
            id: fix.id,
            name: result.rows[0].name,
            status: 'updated',
            newUrl: fix.url
          });
        } else {
          results.push({
            id: fix.id,
            status: 'not_found'
          });
        }
      } catch (error) {
        results.push({
          id: fix.id,
          status: 'error',
          error: error.message
        });
      }
    }

    await client.end();

    return res.status(200).json({
      success: true,
      message: 'Image URLs updated',
      results: results,
      updated: results.filter(r => r.status === 'updated').length
    });

  } catch (error) {
    if (client) {
      try {
        await client.end();
      } catch (e) {
        console.error('Error closing client:', e);
      }
    }
    
    console.error('Fix URLs error:', error);
    return res.status(500).json({ 
      error: 'Failed to fix URLs', 
      details: error.message 
    });
  }
}
