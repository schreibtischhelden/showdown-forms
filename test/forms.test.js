'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const showdown = require('showdown');
const showdownForms = require('..');

const { render } = showdownForms;

function convert(markdown, options) {
	const converter = new showdown.Converter({ extensions: [showdownForms(options)] });
	return converter.makeHtml(markdown);
}

test('text input, type and required', () => {
	const html = render('Name* = ___\nE-Mail = ___:email\nOther = ___:bogus');
	assert.match(html, /<label for="sdf-form-1-0">Name <span aria-hidden="true">\*<\/span><\/label>/);
	assert.match(html, /<input type="text" id="sdf-form-1-0" name="name" data-sdf-name="name" required>/);
	assert.match(html, /<input type="email" id="sdf-form-1-1" name="e-mail"/);
	assert.match(html, /<input type="text" id="sdf-form-1-2" name="other"/);
});

test('textarea with rows', () => {
	assert.match(render('Message = [___]'), /<textarea [^>]*rows="4"><\/textarea>/);
	assert.match(render('Message = [___]:7'), /<textarea [^>]*rows="7"><\/textarea>/);
});

test('radio buttons and checkboxes get unique ids per group', () => {
	const html = render('A = (x) yes () no\nB = [] yes [x] no');
	assert.match(html, /<input type="radio" id="sdf-form-1-0-0" name="a" data-sdf-name="a" value="yes" checked>/);
	assert.match(html, /<input type="radio" id="sdf-form-1-0-1" name="a" data-sdf-name="a" value="no">/);
	assert.match(html, /<input type="checkbox" id="sdf-form-1-1-0" name="b" data-sdf-name="b" value="yes">/);
	assert.match(html, /<input type="checkbox" id="sdf-form-1-1-1" name="b" data-sdf-name="b" value="no" checked>/);
	const ids = html.match(/ id="[^"]+"/g);
	assert.equal(new Set(ids).size, ids.length);
});

test('required checkbox group does not require every checkbox', () => {
	const html = render('Topics* = [] a [] b');
	assert.doesNotMatch(html, /type="checkbox"[^>]*required/);
});

test('select with preselection and value -> label', () => {
	const html = render('Country* = {Germany, (Austria), ch -> Switzerland}');
	assert.match(html, /<select id="sdf-form-1-0" name="country" data-sdf-name="country" required>/);
	assert.match(html, /<option value="Germany">Germany<\/option>/);
	assert.match(html, /<option value="Austria" selected>Austria<\/option>/);
	assert.match(html, /<option value="ch">Switzerland<\/option>/);
});

test('submit button and plain text lines', () => {
	const html = render('Please fill in:\n[[ Send ]]');
	assert.match(html, /<p>Please fill in:<\/p>/);
	assert.match(html, /<button type="submit">Send<\/button>/);
});

test('labels and values are HTML-escaped', () => {
	const html = render('<img src=x onerror=alert(1)> = ___\nX = {"><script>alert(1)</script>}\nY = (x) <b>"\'\n<script>alert(1)</script>');
	assert.doesNotMatch(html, /<img|<script|<b>/);
	assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
	assert.match(html, /value="&quot;&gt;&lt;script&gt;/);
});

test('field names only contain letters, digits, "_" and "-"', () => {
	const html = render('Größe "x" & <y> = ___');
	assert.match(html, /name="größe_x__y" /);
});

test('action: safe schemes are kept, others dropped', () => {
	assert.match(render('A = ___', { attributes: 'action="https://example.com/send" method="get"' }),
		/<form id="sdf-form-1" method="get" action="https:\/\/example.com\/send">/);
	assert.match(render('A = ___', { attributes: 'action="/send"' }), / action="\/send"/);
	assert.match(render('A = ___', { attributes: 'action="mailto:a@example.com"' }), / action="mailto:a@example.com"/);
	for (const action of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,x', '//evil.example', 'java\tscript:alert(1)']) {
		const html = render('A = ___', { attributes: 'action="' + action + '"' });
		assert.doesNotMatch(html, / action=/, action);
		assert.match(html, /data-sdf-form="local"/, action);
	}
});

test('method defaults to post', () => {
	assert.match(render('A = ___', { attributes: 'method="delete"' }), /method="post"/);
});

test('options: idPrefix and dataPrefix, invalid values fall back', () => {
	const html = render('A = ___', { idPrefix: 'contact', dataPrefix: 'mdp' });
	assert.match(html, /<form id="contact-1" method="post" data-mdp-form="local">/);
	assert.match(html, /data-mdp-name="a"/);
	assert.match(render('A = ___', { dataPrefix: '"><x' }), /data-sdf-form="local"/);
});

test('showdown integration: form blocks are converted, Markdown around them too', () => {
	const html = convert('# Title\n\n:::form\nName = ___\n[[ Send ]]\n:::\n\nSome *text*.');
	assert.match(html, /<h1[^>]*>Title<\/h1>/);
	assert.match(html, /<form id="sdf-form-1" method="post" data-sdf-form="local">/);
	assert.match(html, /<button type="submit">Send<\/button><\/form>/);
	assert.match(html, /<em>text<\/em>/);
});

test('showdown integration: several forms get consecutive ids', () => {
	const html = convert(':::form\nA = ___\n:::\n\n:::form\nB = ___\n:::');
	assert.match(html, /id="sdf-form-1"/);
	assert.match(html, /id="sdf-form-2"/);
});

test('showdown integration: fenced code blocks are left alone', () => {
	for (const fence of ['```', '~~~']) {
		const html = convert(fence + 'text\n:::form\nName = ___\n:::\n' + fence);
		assert.doesNotMatch(html, /<form/, fence);
		assert.match(html, /:::form/, fence);
	}
});

test('showdown integration: lines outside a form block are not touched', () => {
	const html = convert('name = ___\n\nsex = (x) male () female');
	assert.doesNotMatch(html, /<input/);
});

test('showdown integration: CRLF line endings', () => {
	assert.match(convert(':::form\r\nA = ___\r\n:::\r\n'), /<form id="sdf-form-1"/);
});

test('restoreNames restores safe names only', () => {
	const fields = [
		{ attrs: { 'data-sdf-name': 'name' } },
		{ attrs: { 'data-sdf-name': 'x" onclick="y' } },
	].map((field) => Object.assign(field, {
		getAttribute(key) { return key in this.attrs ? this.attrs[key] : null; },
		setAttribute(key, value) { this.attrs[key] = value; },
		removeAttribute(key) { delete this.attrs[key]; },
	}));
	let selector;
	showdownForms.restoreNames({ querySelectorAll(s) { selector = s; return fields; } });
	assert.equal(selector, 'form input[data-sdf-name], form textarea[data-sdf-name], form select[data-sdf-name]');
	assert.deepEqual(fields[0].attrs, { name: 'name' });
	assert.deepEqual(fields[1].attrs, {});
});

test('listen handles local forms only and can be removed', (t) => {
	const listeners = [];
	const target = {
		addEventListener(type, fn) { listeners.push([type, fn]); },
		removeEventListener(type, fn) { listeners.splice(listeners.findIndex((l) => l[1] === fn), 1); },
	};
	// Node's FormData does not accept a form element - stub it for this test
	const OriginalFormData = globalThis.FormData;
	globalThis.FormData = class { constructor(form) { this.form = form; } };
	t.after(() => { globalThis.FormData = OriginalFormData; });
	const dispatched = [];
	const makeForm = (local) => ({
		getAttribute: (key) => (key === 'data-sdf-form' && local ? 'local' : null),
		dispatchEvent: (event) => dispatched.push(event),
	});
	const stop = showdownForms.listen(target);
	assert.equal(listeners[0][0], 'submit');

	let prevented = false;
	listeners[0][1]({ target: makeForm(true), preventDefault: () => { prevented = true; } });
	assert.equal(prevented, true);
	assert.equal(dispatched[0].type, 'sdf:form-submit');
	assert.equal(dispatched[0].bubbles, true);

	prevented = false;
	listeners[0][1]({ target: makeForm(false), preventDefault: () => { prevented = true; } });
	assert.equal(prevented, false);
	assert.equal(dispatched.length, 1);

	stop();
	assert.equal(listeners.length, 0);
});
