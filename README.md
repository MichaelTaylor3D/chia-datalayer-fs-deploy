# Chia Datalayer FS Deploy

This Node.js module provides functionality to deploy and mirror file systems with Chia's Datalayer, utilizing a Chia wallet for transactions. It includes utilities for walking directories, creating file lists, and cleaning up orphaned files, with a focus on integrating with the Chia blockchain for data storage purposes.

## Features

- Deploy directories to Chia Datalayer.
- Mirror file systems with override capabilities.
- Clean up orphaned files within the Datalayer.
- Stream status updates through an EventEmitter.
- Configurable options for deployment and mirroring.

## Installation

```bash
npm install chia-datalayer-fs-deploy
```

or

```bash
yarn add chia-datalayer-fs-deploy
```

## Usage

### Deploying a Directory

```javascript
const { deploy, statusEmitter } = require('chia-datalayer-fs-deploy');

const storeId = 'your_store_id';
const deployDir = '/path/to/deploy/directory';
const options = {}; // Your configuration options

const deployment = deploy(storeId, deployDir, options);

deployment.on('info', (message) => {
  console.log('Deploy Info:', message);
});

deployment.on('error', (error) => {
  console.error('Deploy Error:', error);
});
```

### Mirroring a File System

```javascript
const { mirror } = require('chia-datalayer-fs-deploy');

const storeId = 'your_store_id';
const options = {}; // Your configuration options

const mirroring = mirror(storeId, options);

mirroring.on('info', (message) => {
  console.log('Mirror Info:', message);
});

mirroring.on('error', (error) => {
  console.error('Mirror Error:', error);
});
```

## Options

The `Options` interface for `deploy` and `mirror` functions includes the following properties:

- `datalayer_host`: The host URL of the Datalayer.
- `wallet_host`: The host URL of the Chia Wallet.
- `certificate_folder_path`: The local file system path to the Chia SSL certificates.
- `default_wallet_id`: The default wallet ID to use for transactions.
- `default_fee`: The default transaction fee.
- `default_mirror_coin_amount`: The default amount of coins for mirroring operations.
- `maximum_rpc_payload_size`: The maximum size of the RPC payload.
- `web2_gateway_port`: The port for the Web2 gateway.
- `web2_gateway_host`: The host for the Web2 gateway.
- `forceIp4Mirror`: Boolean flag to force IPv4 for mirroring.
- `mirror_url_override`: Override URL for the mirror operation.
- `verbose`: Enable verbose logging.
- `num_files_processed_per_batch`: Number of files processed per batch.
- `ignore_orphans`: Boolean flag to ignore or clean up orphaned files.

## Contributing

Contributions are welcome! Please submit a pull request or create an issue for any feature requests or bug reports.