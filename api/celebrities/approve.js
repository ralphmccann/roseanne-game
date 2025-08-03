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
      
      console.log('Approval request received:', req.body); // Debug log
      
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

      // Always set approved status
      updateQuery += `approved = $${valueIndex}, `;
      updateValues.push(approved !== undefined ? approved : true);
      valueIndex++;

      // Remove trailing comma and space, add WHERE clause
      updateQuery = updateQuery.slice(0, -2) + ` WHERE id = $${valueIndex}`;
      updateValues.push(id);

      console.log('Update query:', updateQuery, updateValues); // Debug log

      await client.query(updateQuery, updateValues);
      await client.end();

      return res.status(200).json({ 
        success: true, 
        message: 'Celebrity approved successfully' 
      });
    }

    if (req.method === 'DELETE') {
      // Reject (delete) celebrity
      const { id } = req.body;
      
      console.log('Delete request received:', req.body); // Debug log
      
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

// Also, here's the corrected frontend JavaScript for your admin-approval.html:
// Replace the existing approval functions with these:

async function approveCelebrity(id) {
    const button = event.target;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Approving...';

    try {
        console.log('Approving celebrity with ID:', id); // Debug log
        
        const response = await fetch('/api/celebrities/approve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                id: id, 
                approved: true 
            })
        });

        console.log('Response status:', response.status); // Debug log
        
        const data = await response.json();
        console.log('Response data:', data); // Debug log

        if (response.ok && data.success) {
            showResult('success', 'Celebrity approved successfully!');
            removeCelebrityCard(id);
        } else {
            throw new Error(data.error || 'Approval failed');
        }

    } catch (error) {
        console.error('Approval error:', error);
        showResult('error', `Failed to approve celebrity: ${error.message}`);
        button.disabled = false;
        button.textContent = originalText;
    }
}

async function rejectCelebrity(id) {
    if (!confirm('Are you sure you want to reject this celebrity? This action cannot be undone.')) {
        return;
    }

    const button = event.target;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Rejecting...';

    try {
        console.log('Rejecting celebrity with ID:', id); // Debug log
        
        const response = await fetch('/api/celebrities/approve', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: id })
        });

        console.log('Response status:', response.status); // Debug log
        
        const data = await response.json();
        console.log('Response data:', data); // Debug log

        if (response.ok && data.success) {
            showResult('success', 'Celebrity rejected and removed.');
            removeCelebrityCard(id);
        } else {
            throw new Error(data.error || 'Rejection failed');
        }

    } catch (error) {
        console.error('Rejection error:', error);
        showResult('error', `Failed to reject celebrity: ${error.message}`);
        button.disabled = false;
        button.textContent = originalText;
    }
}

async function saveAndApprove(id) {
    const name = document.getElementById(`name-${id}`).value.trim();
    const subtitle = document.getElementById(`subtitle-${id}`).value.trim();
    const imageUrl = document.getElementById(`imageurl-${id}`).value.trim();

    if (!name || !imageUrl) {
        showResult('error', 'Name and Image URL are required.');
        return;
    }

    try {
        console.log('Saving and approving celebrity:', { id, name, subtitle, imageUrl }); // Debug log
        
        const response = await fetch('/api/celebrities/approve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: id,
                name: name,
                subtitle: subtitle,
                image_url: imageUrl,
                approved: true
            })
        });

        const data = await response.json();
        console.log('Save and approve response:', data); // Debug log

        if (response.ok && data.success) {
            showResult('success', 'Celebrity updated and approved successfully!');
            removeCelebrityCard(id);
        } else {
            throw new Error(data.error || 'Update failed');
        }

    } catch (error) {
        console.error('Save and approve error:', error);
        showResult('error', `Failed to update celebrity: ${error.message}`);
    }
}
