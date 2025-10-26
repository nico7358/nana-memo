import pako from 'pako';

// sql.jsのメインファイルをCDNからインポート
// ⚠️ 注: WASMファイルのロードは依然として不安定になる可能性があるため、
//       デプロイ後もエラーが続く場合は、wrangler.tomlでバンドル設定が必要です。
const SQL_WASM_CDN_URL = 'https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/sql-wasm.js';

// ✅ sql-wasm.js を動的にロードする関数
async function loadSqlJs() {
	// CDNからsql-wasm.jsをインポート
	const SQL = await import(SQL_WASM_CDN_URL);
	return SQL.default;
}

export default {
	/**
	 * WorkerがHTTPリクエストを受け取ったときに呼び出されるfetchハンドラ
	 */
	async fetch(request, env, ctx) {
		// CORS プリフライト (OPTIONS) リクエストへの対応
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		try {
			if (request.method !== 'POST') {
				return new Response('Use POST with a .mimibk file', {
					status: 405,
					headers: { 'Access-Control-Allow-Origin': '*' },
				});
			}

			const formData = await request.formData();
			const file = formData.get('file');

			if (!file || !(file instanceof File)) {
				return new Response('No valid file uploaded', {
					status: 400,
					headers: { 'Access-Control-Allow-Origin': '*' },
				});
			}

			const buffer = await file.arrayBuffer();
			let bytes = new Uint8Array(buffer);

			// zlib圧縮対応
			if (bytes.length > 2 && bytes[0] === 0x78) {
				try {
					bytes = pako.inflate(bytes);
				} catch (err) {
					// 圧縮解除に失敗した場合、非圧縮として続行
					console.warn('Decompression failed, assuming non-compressed:', err.message);
				}
			}

			// SQL.jsの初期化関数を取得
			const initSqlJs = await loadSqlJs();

			// SQL.jsを初期化し、SQLオブジェクト（Databaseクラスを含む）を取得
			const SQL = await initSqlJs({
				// sql-wasm.wasm の場所を明示的に指定
				locateFile: (filename) => `https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/${filename}`,
			});

			const db = new SQL.Database(bytes);

			// SQLiteからテーブル名を取得
			const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
			const tables = tablesResult[0]?.values || [];
			const result = {};

			// 各テーブルのデータを取得
			for (const t of tables) {
				const name = t[0];
				const rows = db.exec(`SELECT * FROM ${name};`);
				result[name] = rows[0] || { columns: [], values: [] };
			}

			db.close();

			// 成功レスポンス
			return new Response(JSON.stringify(result, null, 2), {
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		} catch (err) {
			console.error('Error in conversion process:', err);
			// エラーレスポンス
			return new Response('Conversion failed: ' + (err?.message || 'unknown error'), {
				status: 500,
				headers: { 'Access-Control-Allow-Origin': '*' },
			});
		}
	},
};
