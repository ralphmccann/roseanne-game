import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

// Verify token function (same as in login.js)
function verifyToken(token) {
  try {
    const [tokenData, signature] = token.split('.');
    
    // Verify signature
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(tokenData).digest('hex');
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(tokenData, 'base64').toString());
    
    // Check expiry
    if (Date.now() > payload.expiry) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

// Middleware function to protect admin routes
export function requireAuth(req, res) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No valid authorization token provided' });
    return null;
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const payload = verifyToken(token);
  
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
  
  return payload; // Return user info if valid
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the token
  const user = requireAuth(req, res);
  if (!user) return; // requireAuth already sent error response

  return res.status(200).json({
    valid: true,
    user: { username: user.username },
    expiry: user.expiry
  });
}
