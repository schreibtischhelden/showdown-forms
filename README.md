# showdown-forms

[![CI](https://github.com/schreibtischhelden/showdown-forms/actions/workflows/ci.yml/badge.svg)](https://github.com/schreibtischhelden/showdown-forms/actions/workflows/ci.yml)

A [Showdown](https://github.com/showdownjs/showdown) 2.x extension that turns simple `:::form` blocks in Markdown into HTML forms.

```text
:::form action="https://example.com/submit" method="post"
Name* = ___
E-Mail* = ___:email
Message = [___]:5
Contact via = (x) e-mail () phone
Topics = [x] Support [] Sales [] Other
Country = {Germany, (Austria), ch -> Switzerland}
[[ Send ]]
:::
```

The syntax is inspired by the original [showdown-forms](https://github.com/runvnc/showdown-forms) (based on [wmd](https://github.com/maleldil/wmd)). This package is a rewrite: it does not bundle its own Markdown parser, only touches `:::form` blocks, and escapes everything it outputs.

## Installation

```sh
npm install showdown @schreibtischhelden/showdown-forms
```

Or in the browser, after Showdown (registers the extension as `forms` and the global `showdownForms`):

```html
<script src="https://cdn.jsdelivr.net/npm/showdown@2.1.0/dist/showdown.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@schreibtischhelden/showdown-forms@1/showdown-forms.js"></script>
```

## Usage

```javascript
import showdown from 'showdown';
import showdownForms from '@schreibtischhelden/showdown-forms';

const converter = new showdown.Converter({ extensions: [showdownForms()] });
const html = converter.makeHtml(markdown);
```

CommonJS works as well: `const showdownForms = require('@schreibtischhelden/showdown-forms');`.
In the browser: `new showdown.Converter({ extensions: ['forms'] })`.

## Syntax

| Line | Field |
| :--- | :--- |
| `Label = ___` | Text input |
| `Label = ___:email` | Input with type `email`, `tel`, `number`, `date`, `time`, `url` or `password` |
| `Label = [___]` / `[___]:5` | Textarea (optional number of rows, default 4) |
| `Label = (x) a () b` | Radio buttons, `(x)` is preselected |
| `Label = [x] a [] b` | Checkboxes, `[x]` is checked |
| `Label = {a, (b), v -> Label}` | Select, `(b)` is preselected, `v -> Label` sets a different value |
| `Label* = ...` | Required field (for checkboxes only the label is marked) |
| `[[ Send ]]` | Submit button |

- The block starts with `:::form` on its own line and ends with `:::`. Fenced code blocks are left alone.
- The field `name` is the label in lowercase with `_` instead of spaces, limited to letters, digits, `_` and `-` (`E-Mail` → `e-mail`, `Contact via` → `contact_via`).
- Ids are `<idPrefix>-<n>` for the form and `<idPrefix>-<n>-<line>` for fields, so several forms and option groups never collide.
- Lines that are not a field are shown as escaped text. Markdown is not processed inside the block.
- `action` may be a relative URL, `http(s):` or `mailto:`; other schemes (`javascript:`, `data:` …) and protocol-relative URLs are dropped. `method` is `get` or `post` (default `post`).

## Options

```javascript
showdownForms({ idPrefix: 'contact', dataPrefix: 'mdp' });
```

| Option | Default | Description |
| :--- | :--- | :--- |
| `idPrefix` | `sdf-form` | Prefix of the generated ids |
| `dataPrefix` | `sdf` | Prefix of the data attributes (`data-sdf-form`, `data-sdf-name`) and of the submit event (`sdf:form-submit`) |

## Forms without `action`

A form without `action` gets `data-sdf-form="local"`. With `listen()` such forms never navigate away; submitting dispatches a bubbling `sdf:form-submit` event instead:

```javascript
import { listen } from '@schreibtischhelden/showdown-forms';

const stop = listen(document); // returns a function that removes the listener
document.addEventListener('sdf:form-submit', (event) => {
	console.log(event.target.id, Object.fromEntries(event.detail.data));
});
```

## Using a sanitizer

The extension escapes all labels and values, but Showdown still passes through raw HTML written in the rest of the Markdown. If the Markdown is not fully trusted, sanitize the output, e.g. with [DOMPurify](https://github.com/cure53/DOMPurify).

DOMPurify removes `name` attributes that equal a document or form property (e.g. `name="name"`) to prevent DOM clobbering. Every generated field carries its name in `data-sdf-name` as well; `restoreNames()` puts it back after the HTML has been inserted (only names made of letters, digits, `_` and `-`):

```javascript
import { restoreNames } from '@schreibtischhelden/showdown-forms';

container.innerHTML = DOMPurify.sanitize(converter.makeHtml(markdown));
restoreNames(container);
```

## Other helpers

- `render(body, { attributes, id, idPrefix, dataPrefix })` renders the lines of a single block to HTML.
- `escapeHtml(value)` is the escaping function used everywhere.

## Development

```sh
npm install
npm test
```

## Releasing

1. Set the new version in `package.json` and add it to `CHANGELOG.md`.
2. Commit, then tag and push: `git tag v1.2.3 && git push origin v1.2.3`.
3. The [Release workflow](.github/workflows/release.yml) runs the tests and publishes to npm with provenance (npm Trusted Publishing; the secret `NPM_TOKEN` is only a fallback).

## License

[MIT](LICENSE)
