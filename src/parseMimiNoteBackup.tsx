import type {Note} from "./App";

// --- Unified Backup Parsing Logic (Exported) ---
// eslint-disable-next-line react-refresh/only-export-components

export async function parseMimiNoteBackup({
  buffer,
}: {
  buffer: ArrayBuffer;
}): Promise<Note[]> {
  if (!buffer || buffer.byteLength === 0) {
    throw new Error("ファイルが空です。");
  }

  let bytes = new Uint8Array(buffer);

  // Decompress if it looks like a zlib-compressed file
  if (bytes.length > 2 && bytes[0] === 0x78) {
    try {
      // Dynamically import pako for decompression
      const pako = (await import("pako")).default;
      bytes = pako.inflate(bytes);
      console.log("Decompressed zlib-based backup file.");
    } catch (e) {
      console.warn(
        "zlib decompression failed, proceeding with original file data.",
        e
      );
    }
  }

  // 1. Try parsing as SQLite DB
  try {
    const head = new TextDecoder().decode(bytes.slice(0, 16));
    if (!head.startsWith("SQLite format 3")) {
      throw new Error("SQLiteヘッダーが見つかりません。");
    }

    const initSqlJs = (await import("sql.js")).default;
    const SQL = await initSqlJs({
      locateFile: (f) => `/${f}`,
    });

    const db = new SQL.Database(bytes);
    try {
      const result = db.exec(
        "SELECT name FROM sqlite_master WHERE type='table';"
      );
      if (!result.length) throw new Error("DB内にテーブルが見つかりません。");

      const tables = result.flatMap((t: any) => t.values.map((v: any) => v[0]));
      const tableName =
        tables.find((t: string) => t.toUpperCase() === "NOTE_TB") ||
        tables.find((t: string) => t.toLowerCase().includes("note")) ||
        tables[0];
      if (!tableName) throw new Error("メモのテーブルが見つかりません。");

      const rowsResult = db.exec(`SELECT * FROM "${tableName}";`);
      if (!rowsResult.length) return []; // No data is not an error

      const rows = rowsResult[0].values;
      const columns = rowsResult[0].columns;

      const notes: Note[] = rows.map((row: any[]) => {
        const obj: any = {};
        columns.forEach((col, i) => (obj[col] = row[i]));
        const createdAt = obj.creation_date
          ? new Date(obj.creation_date).getTime()
          : Date.now();
        const updatedAt = obj.update_date
          ? new Date(obj.update_date).getTime()
          : createdAt;
        return {
          id: String(obj._id || createdAt + Math.random()),
          content: String(obj.text || obj.title || ""),
          createdAt,
          updatedAt,
          isPinned: Boolean(obj.ear === 1),
          color: "text-slate-800 dark:text-slate-200",
          font: "font-sans",
          fontSize: "text-lg",
        };
      });

      return notes;
    } finally {
      db.close();
    }
  } catch (sqliteError: any) {
    console.warn(
      "SQLite parsing failed, attempting fallback text extraction:",
      sqliteError
    );
    // 2. Fallback to text extraction on the original file buffer
    try {
      const text = new TextDecoder("utf-8", {fatal: false}).decode(buffer);
      // Look for JSON-like "text" fields, which is a common pattern in mimi note backups.
      const regex = /"text"\s*:\s*"((?:\\"|[^"])*)"/g;
      let match;
      const extractedNotes: Note[] = [];
      let i = 0;

      while ((match = regex.exec(text)) !== null) {
        try {
          const content = JSON.parse(`"${match[1]}"`); // Safely unescape string content
          if (content && String(content).trim()) {
            const now = Date.now() + i++;
            extractedNotes.push({
              id: String(now),
              content: String(content),
              createdAt: now,
              updatedAt: now,
              isPinned: false,
              color: "text-slate-800 dark:text-slate-200",
              font: "font-sans",
              fontSize: "text-lg",
            });
          }
        } catch (e) {
          console.warn("Could not parse extracted text:", match[1]);
        }
      }

      if (extractedNotes.length > 0) {
        return extractedNotes;
      }
      throw new Error("テキストデータからのメモ抽出に失敗しました。");
    } catch (fallbackError) {
      console.error("Fallback text extraction failed:", fallbackError);
      throw new Error(`DBの解析に失敗しました: ${sqliteError.message}`);
    }
  }
}
