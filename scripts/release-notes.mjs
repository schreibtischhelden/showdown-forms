#!/usr/bin/env node
// Writes release notes (Markdown) for a release, generated from the commit
// messages since the previous version tag. There is no CHANGELOG file - the
// commit history is the changelog.
//
// Usage:
//   node scripts/release-notes.mjs [to] [from]
//     to    tag or commit the release points to (default: HEAD)
//     from  previous release (default: the latest v* tag before `to`)
//
// Conventional Commits (`feat(scope): ...`, `fix!: ...`) are grouped by type;
// other messages are listed under "Changes". Merge commits and release commits
// are left out. In GitHub Actions a compare link is appended.

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const GROUPS = [
	['breaking', 'Breaking changes'],
	['feat', 'Features'],
	['fix', 'Fixes'],
	['perf', 'Performance'],
	['security', 'Security'],
	['docs', 'Documentation'],
	['other', 'Changes'],
	['maintenance', 'Maintenance']
];
const MAINTENANCE = new Set(['chore', 'ci', 'build', 'test', 'refactor', 'style', 'revert']);
const CONVENTIONAL = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/;
const RELEASE = /^(?:chore\(release\):|release v?\d+\.\d+\.\d+|v?\d+\.\d+\.\d+$)/i;

/** Parses one commit `{ hash, subject, body }` into `{ group, text }`, or null to skip it. */
export function classify(commit) {
	const subject = commit.subject.trim();
	if (!subject || RELEASE.test(subject) || /^Merge (pull request|branch)\b/.test(subject)) {
		return null;
	}
	const short = commit.hash.slice(0, 7);
	const match = CONVENTIONAL.exec(subject);
	if (!match) {
		return { group: 'other', text: `${subject} (${short})` };
	}
	const [, rawType, scope, bang, description] = match;
	const type = rawType.toLowerCase();
	const breaking = Boolean(bang) || /^BREAKING[ -]CHANGE:/m.test(commit.body || '');
	let group = 'other';
	if (breaking) {
		group = 'breaking';
	} else if (type === 'feat' || type === 'fix' || type === 'perf' || type === 'docs') {
		group = type;
	} else if (type === 'security' || scope === 'security') {
		group = 'security';
	} else if (MAINTENANCE.has(type)) {
		group = 'maintenance';
	}
	const prefix = scope ? `**${scope}:** ` : '';
	return { group, text: `${prefix}${description} (${short})` };
}

/** Builds the Markdown notes from a list of commits (newest first). */
export function formatNotes(commits, { compareUrl } = {}) {
	const groups = new Map(GROUPS.map(([key]) => [key, []]));
	for (const commit of commits) {
		const entry = classify(commit);
		if (entry) {
			groups.get(entry.group).push(entry.text);
		}
	}
	const sections = [];
	for (const [key, title] of GROUPS) {
		const items = groups.get(key);
		if (items.length) {
			sections.push(`## ${title}\n\n${items.map((item) => `- ${item}`).join('\n')}`);
		}
	}
	if (!sections.length) {
		sections.push('No changes.');
	}
	if (compareUrl) {
		sections.push(`**Full diff:** ${compareUrl}`);
	}
	return sections.join('\n\n') + '\n';
}

function git(...args) {
	return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function previousTag(to) {
	try {
		return git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*', `${to}^`);
	} catch {
		return null; // first release
	}
}

function readCommits(from, to) {
	const range = from ? `${from}..${to}` : to;
	const raw = git('log', '--no-merges', '--format=%H%x1f%s%x1f%b%x1e', range);
	return raw
		.split('\x1e')
		.map((record) => record.replace(/^\n/, ''))
		.filter(Boolean)
		.map((record) => {
			const [hash, subject, body] = record.split('\x1f');
			return { hash, subject, body };
		});
}

function main([to = 'HEAD', from = previousTag(to)]) {
	const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repo } = process.env;
	const compareUrl = server && repo && from ? `${server}/${repo}/compare/${from}...${to}` : undefined;
	process.stdout.write(formatNotes(readCommits(from, to), { compareUrl }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main(process.argv.slice(2));
}
