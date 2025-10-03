// Authentication configuration
const jwt = require('jsonwebtoken');

const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '2h', // 2 hours instead of 15m
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d', // 30 days instead of 7d
    issuer: 'mediaverse-mvp',
    audience: 'mediaverse-users'
  },

  oauth: {
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
    },

    github: {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback'
    },

    facebook: {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback'
    }
  },

  bcrypt: {
    saltRounds: 12
  },

  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }
};

// JWT utility functions
const jwtUtils = {
  generateAccessToken: (payload) => jwt.sign(payload, authConfig.jwt.secret, {
    expiresIn: authConfig.jwt.accessTokenExpiry,
    issuer: authConfig.jwt.issuer,
    audience: authConfig.jwt.audience
  }),

  generateRefreshToken: (payload) => jwt.sign(payload, authConfig.jwt.secret, {
    expiresIn: authConfig.jwt.refreshTokenExpiry,
    issuer: authConfig.jwt.issuer,
    audience: authConfig.jwt.audience
  }),

  verifyToken: (token) => jwt.verify(token, authConfig.jwt.secret, {
    issuer: authConfig.jwt.issuer,
    audience: authConfig.jwt.audience
  })
};

module.exports = { authConfig, jwtUtils };
