const fs = require("fs-extra");
const path = require("path");
const changeListGenerator = require("chia-changelist-generator");
const { logInfo } = require("./console-tools");
const { encodeHex } = require("./hex-utils");

async function generateCleanUpChangeList(storeId, deployDir) {
  const datalayer = new Datalayer(config);
  const fileList = await datalayer.getKeys({ id: storeId });

  // Read the contents of the directory
  const filesInDir = await fs.readdir(deployDir);

  // Convert filenames in the directory to hexadecimal and create a set for faster lookup
  const filesInDirHex = new Set(
    filesInDir.map((fileName) => encodeHex(fileName))
  );

  // Filter out files that exist in the directory
  const filteredFileList = fileList.keys
    .filter((key) => {
      const hexKey = key.replace("0x", "");
      return !filesInDirHex.has(hexKey);
    })
    .map((key) => ({ key: key.replace("0x", "") }));

  const cleanUpChangeList = await changeListGenerator.generateChangeList(
    storeId,
    "delete",
    filteredFileList,
    { chunkChangeList: true }
  );

  return cleanUpChangeList;
}

async function processFile(filePath, rootDir, storeId, config) {
  const relativeFilePath = path.relative(rootDir, filePath).replace(/\\/g, "/");
  const fileSize = fs.statSync(filePath).size;
  const oneMB = 1024 * 1024;
  const chunkSize = config.maximum_rpc_payload_size / 2 - oneMB;
  let fileList = [];

  if (fileSize > chunkSize) {
    const fileStream = fs.createReadStream(filePath, {
      highWaterMark: chunkSize,
    });
    let index = 1;
    let chunkKeys = [];

    for await (const chunk of fileStream) {
      const chunkKey = `${relativeFilePath}.part${index}`;
      chunkKeys.push(chunkKey);

      const partialFileChangeList =
        await changeListGenerator.generateChangeList(
          storeId,
          "insert",
          [{ key: encodeHex(chunkKey), value: chunk.toString("hex") }],
          { chunkChangeList: false }
        );
      await datalayer.updateDataStore({
        id: storeId,
        changelist: partialFileChangeList,
      });
      index++;
    }

    fileList.push({
      key: encodeHex(relativeFilePath),
      value: encodeHex(JSON.stringify({ type: "multipart", parts: chunkKeys })),
    });
  } else {
    const content = fs.readFileSync(filePath).toString("hex");
    fileList.push({ key: encodeHex(relativeFilePath), value: content });
  }

  return fileList;
}

async function walkDirAndCreateFileList(
  dirPath,
  storeId,
  existingKeys,
  rootDir = dirPath
) {
  const files = fs.readdirSync(dirPath);
  let fileList = [];
  const config = getConfig();
  const datalayer = new Datalayer(config);
  const batchSize = config.num_files_processed_per_batch ?? 100;

  for (let i = 0; i < files.length; i += batchSize) {
    const fileBatch = files.slice(i, i + batchSize);

    for (const file of fileBatch) {
      const filePath = path.join(dirPath, file);

      if (fs.statSync(filePath).isDirectory()) {
        fileList.push(
          ...(await walkDirAndCreateFileList(
            filePath,
            storeId,
            existingKeys,
            rootDir
          ))
        );
      } else {
        fileList.push(
          ...(await processFile(filePath, rootDir, storeId, config))
        );
      }
    }

    // Process the current batch
    if (fileList.length > 0) {
      const chunkedChangelist = await changeListGenerator.generateChangeList(
        storeId,
        "insert",
        fileList,
        { chunkChangeList: true }
      );

      for (const [index, chunk] of chunkedChangelist.entries()) {
        logInfo(
          `Sending chunk #${index + 1} of ${
            chunkedChangelist.length
          } to datalayer. Size ${Buffer.byteLength(
            JSON.stringify(chunk),
            "utf-8"
          )}`
        );
        await datalayer.updateDataStore({ id: storeId, changelist: chunk });
      }

      fileList = [];
    }
  }

  return fileList;
}

module.exports = {
  generateCleanUpChangeList,
  walkDirAndCreateFileList,
};
