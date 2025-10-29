import pako from 'pako';

export default {
	async fetch(request) {
		try {
			if (request.method === 'OPTIONS') {
				return new Response(null, {
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'POST, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type',
					},
				});
			}

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
				} catch {
					console.warn('Not compressed, continuing...');
				}
			}

			// ✅ Worker 互換の Emscripten 版 sql.js を fetch 経由で初期化
			const sqlJsScript = await fetch('https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/sql-wasm.js').then((r) => r.text());
			const sqlWasm = await fetch('https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/sql-wasm.wasm').then((r) => r.arrayBuffer());

			const initSqlJs = new Function(`${sqlJsScript}; return globalThis.initSqlJs;`)();
			const SQL = await initSqlJs({ wasmBinary: sqlWasm });

			const db = new SQL.Database(bytes);
			const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
			const result = {};

			for (const t of tables[0]?.values || []) {
				const name = t[0];
				const rows = db.exec(`SELECT * FROM ${name};`);
				result[name] = rows[0] || { columns: [], values: [] };
			}

			db.close();

			return new Response(JSON.stringify(result, null, 2), {
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		} catch (err) {
			console.error('Error:', err);
			return new Response('Conversion failed: ' + (err?.message || 'unknown error'), {
				status: 500,
				headers: { 'Access-Control-Allow-Origin': '*' },
			});
		}
	},
};
