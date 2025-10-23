// FIX: Add module declaration for sql.js to resolve the module error in src/App.tsx.
declare module "sql.js" {
  export interface Database {
    exec(sql: string): {columns: string[]; values: any[][]}[];
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array | Buffer | null) => Database;
  }

  function initSqlJs(config?: any): Promise<SqlJsStatic>;
  export default initSqlJs;
}

declare module "sql.js/dist/sql-wasm.wasm?url";
