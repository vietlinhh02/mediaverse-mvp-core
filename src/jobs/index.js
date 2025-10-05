// Background jobs entry point
// This directory will contain Bull queue job definitions

module.exports = {
  videoProcessing: require('./videoProcessing'),
  mediaQueue: require('./videoQueue'),
  notificationQueue: require('./notificationQueue'),
  notificationWorker: require('./notificationWorker'),
  documentQueue: require('./documentQueue'),
  documentWorker: require('./documentWorker'),
  scheduler: require('./scheduler'),
  worker: require('./worker')
};
