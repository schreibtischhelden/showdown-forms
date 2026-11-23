# Changelog

## 1.0.0 - 2026-11-24

Rewrite as a Showdown 2.x extension (the previous repository bundled a copy of Showdown from 2011).

- `:::form` blocks with text inputs (incl. `email`, `tel`, `number`, `date`, `time`, `url`, `password`), textareas, radio buttons, checkboxes, selects and a submit button
- required fields (`Label* = ...`) set the `required` attribute
- unique ids per form and option group
- all labels and values are HTML-escaped, unsafe `action` URLs are dropped
- fenced code blocks and text outside of `:::form` blocks are left alone
- `listen()` for forms without `action`, `restoreNames()` for use with DOMPurify
- CommonJS, ESM, browser global and TypeScript types
