export default function handler(req, res) {
  res.status(200).json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString(),
    env: process.env.POSTGRES_URL ? 'DB URL exists' : 'No DB URL'
  });
}
