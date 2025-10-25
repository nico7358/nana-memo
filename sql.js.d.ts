// FIX: Add module declaration for sql.js to resolve the module error in src/App.tsx.
declare module "sql.js" {
  export interface Database {
    exec(sql: string): {columns: string[]; values: unknown[][]}[];
    close(): void;
  }

  export interface SqlJsStatic {
    // FIX: Remove Node.js `Buffer` type for browser compatibility.
    Database: new (data?: Uint8Array | null) => Database;
  }

  function initSqlJs(config?: unknown): Promise<SqlJsStatic>;
  export default initSqlJs;
}

declare module "sql.js/dist/sql-wasm.wasm?url";
