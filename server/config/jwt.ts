export default {
  secret: process.env.JWT_SECRET || 'xiaotuxian-jwt-secret-key-2026',
  expiresIn: '7d' as const,
}
