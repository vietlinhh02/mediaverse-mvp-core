// User service with business logic and Redis caching
const { prisma } = require('../../config/database');
const { cache } = require('../../config/redis');
const searchService = require('../../services/searchService');
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

      // Index user in Meilisearch
      try {
        const userWithProfile = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
        if (userWithProfile) {
          await searchService.addOrUpdateDocuments('users', [{
            id: userWithProfile.id,
            username: userWithProfile.username,
            displayName: userWithProfile.profile?.displayName,
            bio: userWithProfile.profile?.bio,
            avatarUrl: userWithProfile.profile?.avatarUrl,
            isVerified: userWithProfile.profile?.isVerified,
            role: userWithProfile.role,
            status: userWithProfile.status,
            createdAt: Math.floor(new Date(userWithProfile.createdAt).getTime() / 1000)
          }]);
        }
      } catch (e) {
        // Do not block on search indexing
      }

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

      // Re-index user in Meilisearch
      try {
        const userWithProfile = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
        if (userWithProfile) {
          await searchService.addOrUpdateDocuments('users', [{
            id: userWithProfile.id,
            username: userWithProfile.username,
            displayName: userWithProfile.profile?.displayName,
            bio: userWithProfile.profile?.bio,
            avatarUrl: userWithProfile.profile?.avatarUrl,
            isVerified: userWithProfile.profile?.isVerified,
            role: userWithProfile.role,
            status: userWithProfile.status,
            createdAt: Math.floor(new Date(userWithProfile.createdAt).getTime() / 1000)
          }]);
        }
      } catch (e) {
        // ignore indexing errors
      }

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
      let profile = await prisma.profile.findUnique({
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
        // Auto-create profile if missing
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true, email: true, role: true, status: true, createdAt: true }
        });

        if (!user) {
          throw new Error('Profile not found');
        }

        profile = await this.createProfile(userId, {
          displayName: user.username,
          bio: null,
          location: null,
          website: null,
          preferences: {},
        });
      }

      // Cache the result
      await cache.set(`profile:${userId}`, profile, UserService.CACHE_TTL.PROFILE);

      return profile;
    } catch (error) {
      // Preserve not-found error so controller can map to 404
      if (error.message === 'Profile not found') {
        throw error;
      }
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  // Upload and process avatar
  async uploadAvatar(userId, file) {
    try {
      const { putObjectBuffer } = require('../../services/media/minioMediaStore');
      const filenameBase = `${userId}-${Date.now()}`;
      const sizes = [
        { suffix: '-200', width: 200, height: 200 },
        { suffix: '-400', width: 400, height: 400 }
      ];
      const avatarUrls = {};
      for (const size of sizes) {
        const resized = await sharp(file.buffer)
          .resize(size.width, size.height, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 85 })
          .toBuffer();
        const key = `avatars/${userId}/${filenameBase}${size.suffix}.jpg`;
        const url = await putObjectBuffer(key, resized, 'image/jpeg');
        avatarUrls[`${size.width}x${size.height}`] = url;
      }
      const profile = await this.updateProfile(userId, { avatarUrl: avatarUrls['200x200'] });
      return { profile, avatarUrls };
    } catch (error) {
      throw new Error(`Failed to upload avatar: ${error.message}`);
    }
  }

  // Upload and process cover image
  async uploadCoverImage(userId, file) {
    try {
      const { putObjectBuffer } = require('../../services/media/minioMediaStore');
      const processed = await sharp(file.buffer)
        .resize(1500, 500, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 90 })
        .toBuffer();
      const key = `covers/${userId}/${userId}-${Date.now()}.jpg`;
      const coverImageUrl = await putObjectBuffer(key, processed, 'image/jpeg');
      const profile = await this.updateProfile(userId, { coverImageUrl });
      return { profile, coverImageUrl };
    } catch (error) {
      throw new Error(`Failed to upload cover image: ${error.message}`);
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
}

module.exports = UserService;
