import { EventEmitter } from "events";

declare module "chia-datalayer-fs-deploy" {
  export interface Options {
    datalayer_host?: string;
    wallet_host?: string;
    certificate_folder_path?: string;
    default_wallet_id?: number;
    default_fee?: number;
    default_mirror_coin_amount?: number;
    maximum_rpc_payload_size?: number;
    web2_gateway_port?: number;
    web2_gateway_host?: string;
    forceIp4Mirror?: boolean;
    mirror_url_override?: string | null;
    verbose?: boolean;
    num_files_processed_per_batch?: number;
    ignore_orphans?: boolean;
  }

  export interface OperationEmitter {
    on(
      event: "info" | "error",
      listener: (message: string) => void
    ): () => void;
  }

  export function deploy(
    storeId: string,
    deployDir: string,
    options: Options
  ): OperationEmitter;

  export function mirror(storeId: string, options: Options): OperationEmitter;
}
