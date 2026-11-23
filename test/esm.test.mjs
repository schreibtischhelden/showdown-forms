import test from 'node:test';
import assert from 'node:assert/strict';
import showdownForms, { render, restoreNames, listen, escapeHtml } from '@schreibtischhelden/showdown-forms';

test('ESM entry exposes the same API as CommonJS', async () => {
	const { createRequire } = await import('node:module');
	const cjs = createRequire(import.meta.url)('@schreibtischhelden/showdown-forms');
	assert.equal(showdownForms, cjs);
	assert.equal(render, cjs.render);
	assert.equal(restoreNames, cjs.restoreNames);
	assert.equal(listen, cjs.listen);
	assert.equal(escapeHtml('<"&\'>'), '&lt;&quot;&amp;&#39;&gt;');
	assert.equal(typeof showdownForms()[0].filter, 'function');
});
