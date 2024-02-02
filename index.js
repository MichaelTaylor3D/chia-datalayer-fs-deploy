const _ = require("lodash");
const fs = require("fs-extra");
const Datalayer = require("chia-datalayer");
const Wallet = require("chia-wallet");
const defaultOptions = require("./utils/defaultOptions");
const changeListGenerator = require("chia-changelist-generator");
const EventEmitter = require("events");
const statusEmitter = new EventEmitter();
const {
  walkDirAndCreateFileList,
  generateCleanUpChangeList,
} = require("./utils/fs-utils");

const logInfo = (operationId, message) => {
  statusEmitter.emit("info", { operationId, message: `🌱 ${message}` });
};

const logError = (operationId, message) => {
  statusEmitter.emit("error", { operationId, message: `🔥 ${message}` });
};

function createOperationEmitter(operationId) {
  return {
    on: (event, listener) => {
      // Wrapper listener to check event's operationId
      const wrappedListener = (data) => {
        if (data.operationId === operationId) {
          listener(data.message);
        }
      };

      statusEmitter.on(event, wrappedListener);

      // Return a function to allow removal of this specific listener
      return () => statusEmitter.removeListener(event, wrappedListener);
    },
  };
}

const deploy = async (storeId, deployDir, options) => {
  const operationId = Date.now(); // Unique ID for this operation
  const operationEmitter = createOperationEmitter(operationId);

  if (!storeId) {
    logError(operationId, "Cannot operate on a null store id.");
    return operationEmitter;
  }

  if (!fs.existsSync(deployDir)) {
    logError(
      operationId,
      `The directory "${deployDir}" does not exist. Please specify a valid directory.`
    );
    return operationEmitter;
  }

  try {
    const settings = { ...defaultOptions, ...options };
    const wallet = new Wallet(settings);

    if (!(await wallet.utils.walletIsSynced(settings))) {
      logError(
        operationId,
        "The wallet is not synced. Please wait for it to sync and try again."
      );
      return operationEmitter;
    }

    // Assuming changeListGenerator is defined and configured
    changeListGenerator.configure(settings);
    const datalayer = new Datalayer(settings);

    if (!settings.ignore_orphans) {
      const cleanUpChangeList = await generateCleanUpChangeList(storeId, deployDir, settings);
      logInfo(operationId, "Cleaning up orphaned files.");

      for (const [index, chunk] of cleanUpChangeList.entries()) {
        logInfo(
          operationId,
          `Sending cleanup chunk #${index + 1} of ${
            cleanUpChangeList.length
          } to datalayer.`
        );

        await datalayer.updateDataStore({
          id: storeId,
          changelist: _.flatten(chunk),
        });
      }
    }

    await walkDirAndCreateFileList(deployDir, storeId, settings);
    logInfo(operationId, "Deploy operation completed successfully.");
  } catch (error) {
    console.trace(error);
    logError(operationId, "Deployment error: " + error.message);
  }

  return operationEmitter;
};

const mirror = async (storeId, options) => {
  const operationId = Date.now(); // Unique ID for this operation
  const operationEmitter = createOperationEmitter(operationId);

  if (!storeId) {
    logError(operationId, "Cannot operate on a null store id.");
    return operationEmitter;
  }

  try {
    const settings = { ...defaultOptions, ...options };
    const wallet = new Wallet(settings);

    await wallet.utils.waitForAllTransactionsToConfirm(settings);

    const datalayer = new Datalayer(settings);
    let response;

    if (settings.mirror_url_override) {
      response = await datalayer.addMirror({
        id: settings.store_id,
        urls: [settings.mirror_url_override],
        amount: settings.default_mirror_coin_amount,
        fee: settings.default_fee,
      });
    } else {
      // Assuming datalayerMirror is defined and configured similarly to datalayer
      response = await datalayerMirror.addMirrorForCurrentHost(
        settings.store_id,
        settings.forceIp4Mirror || false
      );
    }

    if (response.success === false) {
      logError(operationId, "Failed to add mirror");
      return operationEmitter;
    }

    await wallet.utils.waitForAllTransactionsToConfirm(settings);
    logInfo(operationId, "Mirror added successfully");
  } catch (error) {
    console.trace(error);
    logError(operationId, error.message);
  }

  return operationEmitter;
};

module.exports = {
  deploy,
  mirror
};
