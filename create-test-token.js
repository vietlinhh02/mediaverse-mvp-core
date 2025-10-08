// Create test JWT token
require('dotenv').config();
const jwt = require('jsonwebtoken');

const testUser = {
  id: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user'
};

const token = jwt.sign(testUser, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY || '2h',
  issuer: 'mediaverse-mvp',
  audience: 'mediaverse-users'
});

console.log('🔑 Test JWT Token:');
console.log(token);
console.log('\n📋 Copy this token to test-video-upload.html');
console.log('⏰ Token expires in:', process.env.JWT_ACCESS_TOKEN_EXPIRY || '2h');
