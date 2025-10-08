// Check if test user exists in database
require('dotenv').config();
const { prisma } = require('./src/config/database');

async function checkUser() {
  try {
    console.log('🔍 Checking test user in database...');
    
    const user = await prisma.user.findUnique({
      where: { id: 'test-user-123' }
    });
    
    if (user) {
      console.log('✅ Test user found:', {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });
    } else {
      console.log('❌ Test user not found, creating...');
      
      const newUser = await prisma.user.create({
        data: {
          id: 'test-user-123',
          email: 'test@example.com',
          username: 'testuser',
          role: 'user',
          status: 'active'
        }
      });
      
      console.log('✅ Test user created:', {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
