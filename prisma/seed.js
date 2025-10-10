// Prisma seed file for development data
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Sample data
const sampleUsers = [
  {
    email: 'admin@mediaverse.com',
    username: 'admin',
    role: 'admin',
    profile: {
      displayName: 'Admin User',
      bio: 'Platform administrator',
      preferences: {
        notifications: { email: true, push: true, inApp: true },
        privacy: { profileVisible: true, contentVisible: true }
      },
      stats: { totalViews: 0, totalLikes: 0, totalFollowers: 0 }
    }
  },
  {
    email: 'creator1@example.com',
    username: 'techcreator',
    role: 'user',
    profile: {
      displayName: 'Tech Creator',
      bio: 'Technology enthusiast sharing knowledge about web development, AI, and software engineering.',
      preferences: {
        notifications: { email: true, push: true, inApp: true },
        privacy: { profileVisible: true, contentVisible: true }
      },
      stats: { totalViews: 1250, totalLikes: 89, totalFollowers: 45 }
    }
  },
  {
    email: 'creator2@example.com',
    username: 'designguru',
    role: 'user',
    profile: {
      displayName: 'Design Guru',
      bio: 'UI/UX designer passionate about creating beautiful and functional user experiences.',
      preferences: {
        notifications: { email: true, push: false, inApp: true },
        privacy: { profileVisible: true, contentVisible: true }
      },
      stats: { totalViews: 890, totalLikes: 67, totalFollowers: 32 }
    }
  },
  {
    email: 'learner@example.com',
    username: 'eaglelearner',
    role: 'user',
    profile: {
      displayName: 'Eager Learner',
      bio: 'Always learning something new. Interested in technology, design, and personal development.',
      preferences: {
        notifications: { email: false, push: true, inApp: true },
        privacy: { profileVisible: true, contentVisible: true }
      },
      stats: { totalViews: 234, totalLikes: 12, totalFollowers: 8 }
    }
  },
  {
    email: 'moderator@mediaverse.com',
    username: 'moderator',
    role: 'moderator',
    profile: {
      displayName: 'Content Moderator',
      bio: 'Keeping the platform safe and friendly for everyone.',
      preferences: {
        notifications: { email: true, push: true, inApp: true },
        privacy: { profileVisible: false, contentVisible: false }
      },
      stats: { totalViews: 0, totalLikes: 0, totalFollowers: 0 }
    }
  }
];

const sampleChannels = [
  {
    name: 'Tech Tutorials',
    description: 'Learn web development, programming languages, and software engineering best practices.',
    category: 'Technology',
    tags: ['programming', 'web-development', 'tutorials', 'javascript', 'react']
  },
  {
    name: 'Design Inspiration',
    description: 'Beautiful UI/UX designs, design principles, and creative inspiration.',
    category: 'Design',
    tags: ['ui-design', 'ux-design', 'inspiration', 'figma', 'adobe']
  },
  {
    name: 'Learning Journey',
    description: 'Documenting my learning journey across various topics and skills.',
    category: 'Education',
    tags: ['learning', 'personal-development', 'skills', 'growth']
  }
];

const sampleContent = [
  {
    type: 'article',
    title: 'Getting Started with React Hooks',
    description: 'A comprehensive guide to understanding and using React Hooks in your applications.',
    category: 'Technology',
    tags: ['react', 'hooks', 'javascript', 'frontend'],
    status: 'published',
    visibility: 'public',
    metadata: {
      readingTime: 8,
      wordCount: 1200,
      content: '# Getting Started with React Hooks\n\nReact Hooks revolutionized how we write React components...'
    },
    stats: { views: 456, likes: 23, comments: 8, shares: 5 }
  },
  {
    type: 'video',
    title: 'Building a REST API with Node.js',
    description: 'Step-by-step tutorial on creating a RESTful API using Node.js and Express.',
    category: 'Technology',
    tags: ['nodejs', 'api', 'backend', 'express'],
    status: 'published',
    visibility: 'public',
    metadata: {
      duration: 1800, // 30 minutes
      fileUrl: 'https://example.com/videos/nodejs-api-tutorial.mp4',
      thumbnailUrl: 'https://example.com/thumbnails/nodejs-api.jpg'
    },
    stats: { views: 789, likes: 45, comments: 12, shares: 8 }
  },
  {
    type: 'article',
    title: 'Design System Fundamentals',
    description: 'Understanding the core principles of building scalable design systems.',
    category: 'Design',
    tags: ['design-system', 'ui-design', 'components', 'consistency'],
    status: 'published',
    visibility: 'public',
    metadata: {
      readingTime: 12,
      wordCount: 1800,
      content: '# Design System Fundamentals\n\nA design system is more than just a style guide...'
    },
    stats: { views: 234, likes: 18, comments: 4, shares: 3 }
  },
  {
    type: 'document',
    title: 'JavaScript Cheat Sheet',
    description: 'Quick reference guide for JavaScript syntax and common patterns.',
    category: 'Technology',
    tags: ['javascript', 'cheatsheet', 'reference', 'syntax'],
    status: 'published',
    visibility: 'public',
    metadata: {
      fileUrl: 'https://example.com/documents/js-cheatsheet.pdf',
      fileSize: 2048000, // 2MB
      pageCount: 8
    },
    stats: { views: 567, likes: 34, comments: 6, shares: 12 }
  },
  {
    type: 'article',
    title: 'My Learning Journey: From Beginner to Developer',
    description: 'Sharing my experience and lessons learned while transitioning into tech.',
    category: 'Education',
    tags: ['learning', 'career-change', 'personal-story', 'motivation'],
    status: 'published',
    visibility: 'public',
    metadata: {
      readingTime: 6,
      wordCount: 900,
      content: '# My Learning Journey\n\nTwo years ago, I decided to make a career change...'
    },
    stats: { views: 123, likes: 8, comments: 3, shares: 2 }
  }
];

const sampleComments = [
  {
    content: 'Great tutorial! This really helped me understand React Hooks better.',
    replies: [
      {
        content: 'I agree! The examples were very clear and easy to follow.'
      }
    ]
  },
  {
    content: 'Could you do a follow-up video on custom hooks?'
  },
  {
    content: 'Thanks for sharing this. The design system approach makes so much sense now.'
  },
  {
    content: 'Very inspiring story! I\'m also making a career change into tech.'
  }
];

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data (in reverse order of dependencies)
    console.log('🧹 Cleaning existing data...');
    await prisma.notification.deleteMany();
    await prisma.report.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.like.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.content.deleteMany();
    // channels removed
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();

    // Create users with profiles
    console.log('👥 Creating users and profiles...');
    const createdUsers = [];
    
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          username: userData.username,
          passwordHash: hashedPassword,
          role: userData.role,
          profile: {
            create: userData.profile
          }
        },
        include: {
          profile: true
        }
      });
      
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.username}`);
    }

    // Create channels
    console.log('📺 Creating channels... (skipped)');
const createdChannels = [];

    // Create content
    console.log('📝 Creating content...');
    const createdContent = [];
    
    for (let i = 0; i < sampleContent.length; i++) {
      const contentData = sampleContent[i];
      const author = createdUsers[(i % 3) + 1]; // Rotate between creators
      
      const content = await prisma.content.create({
        data: {
          ...contentData,
          authorId: author.id,
          
          publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
        }
      });
      
      createdContent.push(content);
      console.log(`✅ Created content: ${content.title}`);
    }

    // Create follows
    console.log('👥 Creating follow relationships...');
    const followRelationships = [
      { follower: createdUsers[3], followee: createdUsers[1] }, // learner follows techcreator
      { follower: createdUsers[3], followee: createdUsers[2] }, // learner follows designguru
      { follower: createdUsers[1], followee: createdUsers[2] }, // techcreator follows designguru
      { follower: createdUsers[2], followee: createdUsers[1] }  // designguru follows techcreator
    ];

    for (const { follower, followee } of followRelationships) {
      await prisma.follow.create({
        data: {
          followerId: follower.id,
          followeeId: followee.id
        }
      });
      console.log(`✅ ${follower.username} now follows ${followee.username}`);
    }

    // Create likes
    console.log('❤️ Creating likes...');
    for (let i = 0; i < createdContent.length; i++) {
      const content = createdContent[i];
      const numLikes = Math.floor(Math.random() * 3) + 1; // 1-3 likes per content
      
      for (let j = 0; j < numLikes && j < createdUsers.length - 1; j++) {
        const user = createdUsers[j + 1]; // Skip admin
        
        try {
          await prisma.like.create({
            data: {
              userId: user.id,
              contentId: content.id
            }
          });
        } catch (error) {
          // Skip if duplicate like (unique constraint)
        }
      }
    }

    // Create comments
    console.log('💬 Creating comments...');
    for (let i = 0; i < Math.min(sampleComments.length, createdContent.length); i++) {
      const commentData = sampleComments[i];
      const content = createdContent[i];
      const commenter = createdUsers[(i % 3) + 1];
      
      const comment = await prisma.comment.create({
        data: {
          text: commentData.content,
          userId: commenter.id,
          contentId: content.id
        }
      });

      // Create replies if they exist
      if (commentData.replies) {
        for (const replyData of commentData.replies) {
          const replier = createdUsers[((i + 1) % 3) + 1];
          
          await prisma.comment.create({
            data: {
              text: replyData.content,
              userId: replier.id,
              contentId: content.id,
              parentId: comment.id
            }
          });
        }
      }
    }

    // Create sample notifications
    console.log('🔔 Creating notifications...');
    const notifications = [
      {
        userId: createdUsers[1].id,
        type: 'like',
        title: 'New Like',
        content: `Someone liked your article "Getting Started with React Hooks"`,
        data: {
          contentId: createdContent[0].id
        }
      },
      {
        userId: createdUsers[2].id,
        type: 'follow',
        title: 'New Follower',
        content: 'eaglelearner started following you',
        data: {
          followerId: createdUsers[3].id
        }
      },
      {
        userId: createdUsers[3].id,
        type: 'upload',
        title: 'New Content',
        content: 'techcreator published a new video: "Building a REST API with Node.js"',
        data: {
          contentId: createdContent[1].id
        }
      }
    ];

    for (const notificationData of notifications) {
      await prisma.notification.create({
        data: {
          ...notificationData,
          category: notificationData.type, // Map type to category
        }
      });
    }

    console.log('✅ Database seeded successfully!');
    console.log('\n📊 Seed Summary:');
    console.log(`👥 Users: ${createdUsers.length}`);
    console.log(`📺 Channels: 0 (removed)`);
    console.log(`📝 Content: ${createdContent.length}`);
    console.log(`👥 Follows: ${followRelationships.length}`);
    console.log(`💬 Comments: ${sampleComments.length}`);
    console.log(`🔔 Notifications: ${notifications.length}`);
    
    console.log('\n🔑 Test Credentials:');
    console.log('Admin: admin@mediaverse.com / password123');
    console.log('Creator: creator1@example.com / password123');
    console.log('User: learner@example.com / password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
