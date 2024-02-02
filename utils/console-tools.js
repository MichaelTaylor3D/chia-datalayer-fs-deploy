const EventEmitter = require("events");
const statusEmitter = new EventEmitter();

const logInfo = (operationId, message) => {
  statusEmitter.emit('info', {operationId, message: `🌱 ${message}`});
};

const logError = (operationId, message) => {
  statusEmitter.emit('error', {operationId, message: `🔥 ${message}`});
};

module.exports = {
  logInfo,
  logError,
  statusEmitter,
};
