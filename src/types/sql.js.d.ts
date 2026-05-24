declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database
  }

  interface Database {
    run(sql: string, params?: unknown[]): Database
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }

  interface Statement {
    bind(params?: unknown[]): boolean
    step(): boolean
    getAsObject(): Record<string, unknown>
    run(params?: unknown[]): Database
    free(): boolean
  }

  export type { Database, SqlJsStatic, Statement }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string
  }): Promise<SqlJsStatic>
}

declare module 'sql.js/dist/sql-wasm.wasm?url' {
  const url: string
  export default url
}
