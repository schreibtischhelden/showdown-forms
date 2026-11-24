// Unit tests for scripts/release-notes.mjs (release notes from commit messages).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, formatNotes } from '../scripts/release-notes.mjs';

const commit = (subject, body = '', hash = '0123456789abcdef') => ({ hash, subject, body });

test('conventional commits are grouped by type, with scope and short hash', () => {
	assert.deepEqual(classify(commit('feat(menu): add tree')), { group: 'feat', text: '**menu:** add tree (0123456)' });
	assert.deepEqual(classify(commit('fix: broken link')), { group: 'fix', text: 'broken link (0123456)' });
	assert.equal(classify(commit('docs: explain forms')).group, 'docs');
	assert.equal(classify(commit('chore(deps): bump showdown')).group, 'maintenance');
	assert.equal(classify(commit('ci: pin actions')).group, 'maintenance');
	assert.equal(classify(commit('security: escape labels')).group, 'security');
	assert.equal(classify(commit('unknown: something')).group, 'other');
});

test('breaking changes are detected by ! and by BREAKING CHANGE footer', () => {
	assert.equal(classify(commit('feat!: drop IE')).group, 'breaking');
	assert.equal(classify(commit('refactor(api): rename', 'BREAKING CHANGE: init() is gone')).group, 'breaking');
});

test('plain messages are listed under Changes', () => {
	assert.deepEqual(classify(commit('Fix polynomial ReDoS in form parsing')), {
		group: 'other',
		text: 'Fix polynomial ReDoS in form parsing (0123456)'
	});
});

test('merge and release commits are skipped', () => {
	assert.equal(classify(commit('Merge pull request #10 from x/y')), null);
	assert.equal(classify(commit('Merge branch \'main\' into feat')), null);
	assert.equal(classify(commit('chore(release): 2.0.0')), null);
	assert.equal(classify(commit('Release 1.0.0')), null);
	assert.equal(classify(commit('v1.2.3')), null);
	assert.equal(classify(commit('Release notes from commit messages')).group, 'other');
});

test('formatNotes renders sections in a fixed order and omits empty ones', () => {
	const notes = formatNotes(
		[commit('fix: b'), commit('chore: c'), commit('feat: a'), commit('Merge pull request #1 from x')],
		{ compareUrl: 'https://github.com/o/r/compare/v1.0.0...v1.1.0' }
	);
	assert.equal(
		notes,
		'## Features\n\n- a (0123456)\n\n' +
			'## Fixes\n\n- b (0123456)\n\n' +
			'## Maintenance\n\n- c (0123456)\n\n' +
			'**Full diff:** https://github.com/o/r/compare/v1.0.0...v1.1.0\n'
	);
});

test('formatNotes without commits', () => {
	assert.equal(formatNotes([]), 'No changes.\n');
});
