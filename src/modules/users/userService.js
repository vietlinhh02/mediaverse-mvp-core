// User service with business logic and Redis caching
const { prisma } = require('../../config/database');
const { cache } = require('../../config/redis');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v7: uuidv7 } = require('uuid');
// S3Service removed - will be rebuilt from scratch

class UserService {
  // Cache TTL constants
  static CACHE_TTL = {
    PROFILE: 3600, // 1 hour
    FOLLOWERS: 1800, // 30 minutes
    SEARCH: 600 // 10 minutes
  };

  // Create user profile
  async createProfile(userId, profileData) {
    try {
      const profile = await prisma.profile.create({
        data: {
          userId,
          displayName: profileData.displayName,
          bio: profileData.bio || null,
          location: profileData.location || null,
          website: profileData.website || null,
          preferences: profileData.preferences || {},
          stats: {
            followersCount: 0,
            followingCount: 0,
            contentCount: 0
          }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              status: true,
              createdAt: true
            }
          }
        }
      });

      // Cache the profile
      await cache.set(`profile:${userId}`, profile, UserService.CACHE_TTL.PROFILE);

      return profile;
    } catch (error) {
      throw new Error(`Failed to create profile: ${error.message}`);
    }
  }

  // Update user profile
  async updateProfile(userId, updates) {
    try {
      const profile = await prisma.profile.update({
        where: { userId },
        data: {
          ...updates,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              status: true,
              createdAt: true
            }
          }
        }
      });

      // Update cache
      await cache.set(`profile:${userId}`, profile, UserService.CACHE_TTL.PROFILE);

      return profile;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new Error('Profile not found');
      }
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  // Get user profile with caching
  async getProfile(userId) {
    try {
      // Try cache first
      const cached = await cache.get(`profile:${userId}`);
      if (cached) {
        return cached;
      }

      // Fetch from database
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              status: true,
              createdAt: true
            }
          }
        }
      });

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Cache the result
      await cache.set(`profile:${userId}`, profile, UserService.CACHE_TTL.PROFILE);

      return profile;
    } catch (error) {
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  // Upload and process avatar
  async uploadAvatar(userId, file) {
    try {
      const uploadDir = 'uploads/avatars';
      await fs.mkdir(uploadDir, { recursive: true });

      const filename = `${userId}-${Date.now()}`;
      const sizes = [
        { suffix: '-200', width: 200, height: 200 },
        { suffix: '-400', width: 400, height: 400 }
      ];

      const avatarUrls = {};

      // Process and save different sizes
      for (const size of sizes) {
        const outputPath = path.join(uploadDir, `${filename}${size.suffix}.jpg`);

        await sharp(file.buffer)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 85 })
          .toFile(outputPath);

        avatarUrls[`${size.width}x${size.height}`] = `/uploads/avatars/${filename}${size.suffix}.jpg`;
      }

      // Update profile with avatar URL
      const profile = await this.updateProfile(userId, {
        avatarUrl: avatarUrls['200x200'] // Use 200x200 as default
      });

      return {
        profile,
        avatarUrls
      };
    } catch (error) {
      throw new Error(`Failed to upload avatar: ${error.message}`);
    }
  }

  // Search users with caching
  async searchUsers(query, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      const cacheKey = `search:users:${query}:${page}:${limit}`;

      // Try cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Search in database
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { profile: { displayName: { contains: query, mode: 'insensitive' } } }
            ],
            status: 'active'
          },
          include: {
            profile: {
              select: {
                displayName: true,
                bio: true,
                avatarUrl: true,
                stats: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: [
            { createdAt: 'desc' }
          ]
        }),
        prisma.user.count({
          where: {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { profile: { displayName: { contains: query, mode: 'insensitive' } } }
            ],
            status: 'active'
          }
        })
      ]);

      // Sort users by follower count in JavaScript
      const sortedUsers = users
        .map((user) => ({
          id: user.id,
          username: user.username,
          displayName: user.profile?.displayName,
          bio: user.profile?.bio,
          avatarUrl: user.profile?.avatarUrl,
          stats: user.profile?.stats,
          createdAt: user.createdAt,
          followersCount: user.profile?.stats?.followersCount || 0
        }))
        .sort((a, b) => {
          // Sort by followers count descending, then by creation date descending
          if (b.followersCount !== a.followersCount) {
            return b.followersCount - a.followersCount;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        })
        .map((user) => {
          // Remove the temporary followersCount field
          const { followersCount, ...userWithoutCount } = user;
          return userWithoutCount;
        });

      const result = {
        users: sortedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

      // Cache the result
      await cache.set(cacheKey, result, UserService.CACHE_TTL.SEARCH);

      return result;
    } catch (error) {
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }

  // Follow user
  async followUser(followerId, followeeId) {
    try {
      if (followerId === followeeId) {
        throw new Error('Cannot follow yourself');
      }

      // Check if already following
      const existingFollow = await prisma.follow.findUnique({
        where: {
          followerId_followeeId: {
            followerId,
            followeeId
          }
        }
      });

      if (existingFollow) {
        throw new Error('Already following this user');
      }

      // Create follow relationship
      try {
        await prisma.follow.create({
          data: {
            followerId,
            followeeId
          }
        });
      } catch (createError) {
        if (createError.code === 'P2002') {
          throw new Error('Already following this user');
        }
        throw createError;
      }

      // Update follower counts
      await Promise.all([
        // Update follower's following count
        prisma.$executeRaw`
          UPDATE profiles 
          SET stats = jsonb_set(stats, '{followingCount}', (COALESCE(stats->>'followingCount', '0')::int + 1)::text::jsonb)
          WHERE "userId" = ${followerId}
        `,
        // Update followee's followers count
        prisma.$executeRaw`
          UPDATE profiles 
          SET stats = jsonb_set(stats, '{followersCount}', (COALESCE(stats->>'followersCount', '0')::int + 1)::text::jsonb)
          WHERE "userId" = ${followeeId}
        `
      ]);

      // Clear relevant caches - clear all pagination variants
      const cacheKeys = [
        `profile:${followerId}`,
        `profile:${followeeId}`
      ];

      // Clear all possible pagination cache keys
      for (let page = 1; page <= 10; page++) {
        for (const limit of [10, 20, 50]) {
          cacheKeys.push(`followers:${followeeId}:${page}:${limit}`);
          cacheKeys.push(`following:${followerId}:${page}:${limit}`);
        }
      }

      await Promise.all(cacheKeys.map((key) => cache.del(key)));

      return { success: true, message: 'Successfully followed user' };
    } catch (error) {
      // Re-throw specific errors without wrapping
      if (error.message === 'Already following this user'
          || error.message === 'Cannot follow yourself') {
        throw error;
      }
      throw new Error(`Failed to follow user: ${error.message}`);
    }
  }

  // Unfollow user
  async unfollowUser(followerId, followeeId) {
    try {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followeeId: {
            followerId,
            followeeId
          }
        }
      });

      if (!follow) {
        throw new Error('Not following this user');
      }

      // Delete follow relationship
      await prisma.follow.delete({
        where: {
          followerId_followeeId: {
            followerId,
            followeeId
          }
        }
      });

      // Update follower counts
      await Promise.all([
        // Update follower's following count
        prisma.$executeRaw`
          UPDATE profiles 
          SET stats = jsonb_set(stats, '{followingCount}', GREATEST((COALESCE(stats->>'followingCount', '0')::int - 1), 0)::text::jsonb)
          WHERE "userId" = ${followerId}
        `,
        // Update followee's followers count
        prisma.$executeRaw`
          UPDATE profiles 
          SET stats = jsonb_set(stats, '{followersCount}', GREATEST((COALESCE(stats->>'followersCount', '0')::int - 1), 0)::text::jsonb)
          WHERE "userId" = ${followeeId}
        `
      ]);

      // Clear relevant caches - clear all pagination variants
      const cacheKeys = [
        `profile:${followerId}`,
        `profile:${followeeId}`
      ];

      // Clear all possible pagination cache keys
      for (let page = 1; page <= 10; page++) {
        for (const limit of [10, 20, 50]) {
          cacheKeys.push(`followers:${followeeId}:${page}:${limit}`);
          cacheKeys.push(`following:${followerId}:${page}:${limit}`);
        }
      }

      await Promise.all(cacheKeys.map((key) => cache.del(key)));

      return { success: true, message: 'Successfully unfollowed user' };
    } catch (error) {
      // Re-throw specific errors without wrapping
      if (error.message === 'Not following this user') {
        throw error;
      }
      throw new Error(`Failed to unfollow user: ${error.message}`);
    }
  }

  // Get followers with caching
  async getFollowers(userId, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      const cacheKey = `followers:${userId}:${page}:${limit}`;

      // Try cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const [followers, total] = await Promise.all([
        prisma.follow.findMany({
          where: { followeeId: userId },
          include: {
            follower: {
              include: {
                profile: {
                  select: {
                    displayName: true,
                    bio: true,
                    avatarUrl: true,
                    stats: true
                  }
                }
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.follow.count({
          where: { followeeId: userId }
        })
      ]);

      const result = {
        followers: followers.map((follow) => ({
          id: follow.follower.id,
          username: follow.follower.username,
          displayName: follow.follower.profile?.displayName,
          bio: follow.follower.profile?.bio,
          avatarUrl: follow.follower.profile?.avatarUrl,
          stats: follow.follower.profile?.stats,
          followedAt: follow.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

      // Cache the result
      await cache.set(cacheKey, result, UserService.CACHE_TTL.FOLLOWERS);

      return result;
    } catch (error) {
      throw new Error(`Failed to get followers: ${error.message}`);
    }
  }

  // Get following with caching
  async getFollowing(userId, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      const cacheKey = `following:${userId}:${page}:${limit}`;

      // Try cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const [following, total] = await Promise.all([
        prisma.follow.findMany({
          where: { followerId: userId },
          include: {
            followee: {
              include: {
                profile: {
                  select: {
                    displayName: true,
                    bio: true,
                    avatarUrl: true,
                    stats: true
                  }
                }
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.follow.count({
          where: { followerId: userId }
        })
      ]);

      const result = {
        following: following.map((follow) => ({
          id: follow.followee.id,
          username: follow.followee.username,
          displayName: follow.followee.profile?.displayName,
          bio: follow.followee.profile?.bio,
          avatarUrl: follow.followee.profile?.avatarUrl,
          stats: follow.followee.profile?.stats,
          followedAt: follow.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

      // Cache the result
      await cache.set(cacheKey, result, UserService.CACHE_TTL.FOLLOWERS);

      return result;
    } catch (error) {
      throw new Error(`Failed to get following: ${error.message}`);
    }
  }

  // Create channel
  async createChannel(userId, channelData) {
    try {
      const channel = await prisma.channel.create({
        data: {
          ownerId: userId,
          name: channelData.name,
          description: channelData.description || null,
          category: channelData.category,
          tags: channelData.tags || []
        },
        include: {
          owner: {
            include: {
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      });

      // Clear user profile cache to update channel count
      await cache.del(`profile:${userId}`);

      return channel;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('Channel name already exists');
      }
      throw new Error(`Failed to create channel: ${error.message}`);
    }
  }

  // Update channel
  async updateChannel(channelId, userId, data) {
    try {
      // Verify ownership
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { ownerId: true }
      });

      if (!channel) {
        throw new Error('Channel not found');
      }

      if (channel.ownerId !== userId) {
        throw new Error('Not authorized to update this channel');
      }

      const updatedChannel = await prisma.channel.update({
        where: { id: channelId },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          owner: {
            include: {
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      });

      return updatedChannel;
    } catch (error) {
      throw new Error(`Failed to update channel: ${error.message}`);
    }
  }

  // Upload and process channel banner
  async uploadChannelBanner(channelId, userId, file) {
    try {
      // Verify ownership
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { ownerId: true }
      });

      if (!channel) {
        throw new Error('Channel not found');
      }

      if (channel.ownerId !== userId) {
        throw new Error('Not authorized to upload a banner for this channel');
      }

      const tempDir = 'uploads/temp';
      await fs.mkdir(tempDir, { recursive: true });

      const filename = `${channelId}-${uuidv7()}.jpg`;
      const tempFilePath = path.join(tempDir, filename);

      // Resize and save temporarily
      await sharp(file.buffer)
        .resize(1546, 423, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 90 })
        .toFile(tempFilePath);

      // S3 upload removed - will be rebuilt from scratch
      // For now, just use local file path
      const bannerImageUrl = `/uploads/banners/channel/${channelId}/${filename}`;
      
      // Move file to final location
      const finalPath = path.join(process.cwd(), 'uploads', 'banners', 'channel', channelId);
      await fs.mkdir(finalPath, { recursive: true });
      await fs.rename(tempFilePath, path.join(finalPath, filename));

      // Update channel with banner URL
      const updatedChannel = await this.updateChannel(channelId, userId, {
        bannerImageUrl
      });

      return {
        channel: updatedChannel,
        bannerImageUrl
      };
    } catch (error) {
      throw new Error(`Failed to upload channel banner: ${error.message}`);
    }
  }

  // Delete channel
  async deleteChannel(channelId, userId) {
    try {
      // Verify ownership
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { ownerId: true }
      });

      if (!channel) {
        throw new Error('Channel not found');
      }

      if (channel.ownerId !== userId) {
        throw new Error('Not authorized to delete this channel');
      }

      await prisma.channel.delete({
        where: { id: channelId }
      });

      // Clear user profile cache
      await cache.del(`profile:${userId}`);

      return { success: true, message: 'Channel deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete channel: ${error.message}`);
    }
  }

  // Get user channels
  async getUserChannels(userId) {
    try {
      const channels = await prisma.channel.findMany({
        where: { ownerId: userId },
        include: {
          _count: {
            select: { content: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return channels.map((channel) => ({
        ...channel,
        contentCount: channel._count.content
      }));
    } catch (error) {
      throw new Error(`Failed to get user channels: ${error.message}`);
    }
  }

  // Get channel by ID
  async getChannel(channelId) {
    try {
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: {
          owner: {
            include: {
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          },
          _count: {
            select: { content: true }
          }
        }
      });

      if (!channel) {
        throw new Error('Channel not found');
      }

      return {
        ...channel,
        contentCount: channel._count.content
      };
    } catch (error) {
      throw new Error(`Failed to get channel: ${error.message}`);
    }
  }
}

module.exports = UserService;
