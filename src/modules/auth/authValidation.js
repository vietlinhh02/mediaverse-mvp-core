const Joi = require('joi');

const authValidation = {
  register: {
    body: Joi.object({
      email: Joi.string().email().required(),
      username: Joi.string().min(3).required(),
      password: Joi.string().min(8).required(),
      displayName: Joi.string().required()
    })
  },

  login: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    })
  },

  forgotPassword: {
    body: Joi.object({
      email: Joi.string().email().required()
    })
  },

  resetPassword: {
    body: Joi.object({
      token: Joi.string().required(),
      password: Joi.string().min(8).required()
    })
  },

  sendOtp: {
    body: Joi.object({
      email: Joi.string().email().required()
    })
  },

  verifyOtp: {
    body: Joi.object({
      email: Joi.string().email().required(),
      otp: Joi.string().length(6).required()
    })
  }
};

module.exports = authValidation;
