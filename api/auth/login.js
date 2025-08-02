import crypto from 'crypto';

// Store admin credentials as environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || hashPassword('admin123'); // Default password
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

// Simple password hashing function
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'salt123').digest('hex');
}

// Simple JWT-like token creation
function createToken(username) {
  const payload = {
    username,
    timestamp: Date.now(),
    expiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  
  const tokenData = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(tokenData).digest('hex');
  
  return `${tokenData}.${signature}`;
}

// Verify token
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

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Hash the provided password
    const passwordHash = hashPassword(password);
    
    // Check credentials
    if (username === ADMIN_USERNAME && passwordHash === ADMIN_PASSWORD_HASH) {
      // Create session token
      const token = createToken(username);
      const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      
      return res.status(200).json({
        success: true,
        token,
        expiry,
        message: 'Login successful'
      });
    } else {
      // Add small delay to prevent brute force attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export verify function for use in other API endpoints
export { verifyToken };
