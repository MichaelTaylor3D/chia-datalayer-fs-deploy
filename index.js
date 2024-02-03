const _ = require("lodash");
const fs = require("fs-extra");
const Datalayer = require("chia-datalayer");
const Wallet = require("chia-wallet");
const defaultOptions = require("./utils/defaultOptions");
const changeListGenerator = require("chia-changelist-generator");
const { statusEmitter, logError, logInfo } = require("./utils/console-tools");
const {
  walkDirAndCreateFileList,
  generateCleanUpChangeList,
} = require("./utils/fs-utils");



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

const deploy = async (storeId, deployDir, deployMode, options) => {
  const originalConsoleLog = console.log;
  

  const operationId = Date.now(); // Unique ID for this operation
  const operationEmitter = createOperationEmitter(operationId);

  console.log = (...args) => {
    logInfo(operationId, ...args);
  };

  return new Promise(async (resolve, reject) => {
    resolve(operationEmitter);

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
      logInfo(operationId, "Starting deploy operation.");
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

      if (deployMode === "replace") {
        const cleanUpChangeList = await generateCleanUpChangeList(
          storeId,
          deployDir,
          settings
        );
        logInfo(operationId, "Replacing the existing store with the new data.");

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
    } finally {
      console.log = originalConsoleLog;
    }
  });
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
  mirror,
};
