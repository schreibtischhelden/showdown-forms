/*!
 * showdown-forms - Markdown form blocks for Showdown 2.x
 * https://github.com/schreibtischhelden/showdown-forms
 * MIT License
 */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	} else if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else {
		root.showdownForms = factory();
		if (root.showdown && typeof root.showdown.extension === 'function') {
			root.showdown.extension('forms', root.showdownForms);
		}
	}
})(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	// :::form action="https://example.com/submit" method="post"
	// Name* = ___
	// E-Mail* = ___:email
	// Message = [___]:5
	// Contact via = (x) e-mail () phone
	// Topics = [x] Support [] Sales
	// Country = {Germany, (Austria), ch -> Switzerland}
	// [[ Send ]]
	// :::
	//
	// Every label and value ends up in an attribute or text node and is
	// HTML-escaped. Without "action" the form is not sent anywhere.

	var INPUT_TYPES = ['text', 'email', 'tel', 'number', 'date', 'time', 'url', 'password'];
	// fenced code blocks are matched too, so that they can be skipped
	var FORM_BLOCK = /(^|\n)(```|~~~)[^\n]*\n[\s\S]*?\n\2[ \t]*(?=\n|$)|(^|\n):::form([^\n]*)\n([\s\S]*?)\n:::[ \t]*(?=\n|$)/g;
	var SAFE_ACTION = /^(https?:|mailto:|[^:]*$)/i; // http(s), mailto, or no scheme at all
	var SAFE_NAME = /^[\p{L}\p{N}_-]+$/u;

	var DEFAULTS = {
		// prefix of the generated form ids: <idPrefix>-<n>, fields <idPrefix>-<n>-<line>
		idPrefix: 'sdf-form',
		// prefix of the data attributes (data-<dataPrefix>-form, data-<dataPrefix>-name)
		// and of the submit event (<dataPrefix>:form-submit)
		dataPrefix: 'sdf',
	};

	function resolveOptions(options) {
		var result = {};
		Object.keys(DEFAULTS).forEach(function (key) {
			var value = options && options[key];
			result[key] = typeof value === 'string' && /^[a-z][a-z0-9-]*$/i.test(value) ? value : DEFAULTS[key];
		});
		return result;
	}

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function fieldName(label) {
		return label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_-]/gu, '') || 'field';
	}

	function parseFormAttributes(text) {
		var attrs = {};
		text.replace(/(\w+)\s*=\s*"([^"]*)"/g, function (match, key, value) {
			attrs[key.toLowerCase()] = value.trim();
			return match;
		});
		var result = {};
		var action = attrs.action;
		// eslint-disable-next-line no-control-regex
		if (action && !/^\/\//.test(action) && !/[\u0000-\u001f\u007f]/.test(action) && SAFE_ACTION.test(action)) {
			result.action = action;
		}
		result.method = /^(get|post)$/i.test(attrs.method || '') ? attrs.method.toLowerCase() : 'post';
		return result;
	}

	function nameAttrs(name, opts) {
		var escaped = escapeHtml(name);
		return ' name="' + escaped + '" data-' + opts.dataPrefix + '-name="' + escaped + '"';
	}

	function renderChoices(type, pattern, value, labelText, name, id, req, opts) {
		var html = '<fieldset><legend>' + labelText + '</legend>';
		var i = 0;
		value.replace(pattern, function (match, checked, text) {
			var optionId = id + '-' + (i++);
			var optionText = text.trim();
			html += '<label for="' + optionId + '">'
				+ '<input type="' + type + '" id="' + optionId + '"' + nameAttrs(name, opts)
				+ ' value="' + escapeHtml(optionText) + '"' + (checked ? ' checked' : '') + req + '> '
				+ escapeHtml(optionText) + '</label>';
			return match;
		});
		return html + '</fieldset>';
	}

	function renderField(rawLabel, required, value, id, opts) {
		var label = rawLabel.trim();
		var name = fieldName(label);
		var req = required ? ' required' : '';
		var labelText = escapeHtml(label) + (required ? ' <span aria-hidden="true">*</span>' : '');
		var match;

		// text input: ___ or ___:email
		if ((match = /^___(?::([a-z]+))?$/.exec(value))) {
			var type = INPUT_TYPES.indexOf(match[1]) >= 0 ? match[1] : 'text';
			return '<label for="' + id + '">' + labelText + '</label>'
				+ '<input type="' + type + '" id="' + id + '"' + nameAttrs(name, opts) + req + '>';
		}

		// textarea: [___] or [___]:5
		if ((match = /^\[___\](?::(\d{1,2}))?$/.exec(value))) {
			var rows = match[1] ? Math.max(1, parseInt(match[1], 10)) : 4;
			return '<label for="' + id + '">' + labelText + '</label>'
				+ '<textarea id="' + id + '"' + nameAttrs(name, opts) + ' rows="' + rows + '"' + req + '></textarea>';
		}

		// radio buttons: (x) one () two
		if (/^\(x?\)/.test(value)) {
			return renderChoices('radio', /\((x?)\)\s*([^()]+)/g, value, labelText, name, id, req, opts);
		}

		// checkboxes: [x] one [] two
		if (/^\[x?\]/.test(value)) {
			// "required" on every checkbox would force all of them - only the label is marked
			return renderChoices('checkbox', /\[(x?)\]\s*([^[\]]+)/g, value, labelText, name, id, '', opts);
		}

		// select: {a, (b), value -> Label}
		if ((match = /^\{(.+)\}$/.exec(value))) {
			var options = match[1].split(',').map(function (option) {
				option = option.trim();
				var selected = /^\(.*\)$/.test(option);
				if (selected) {
					option = option.slice(1, -1).trim();
				}
				var parts = option.split('->');
				var optValue = parts[0].trim();
				var optLabel = (parts.length > 1 ? parts.slice(1).join('->') : parts[0]).trim();
				return '<option value="' + escapeHtml(optValue) + '"' + (selected ? ' selected' : '') + '>'
					+ escapeHtml(optLabel) + '</option>';
			}).join('');
			return '<label for="' + id + '">' + labelText + '</label>'
				+ '<select id="' + id + '"' + nameAttrs(name, opts) + req + '>' + options + '</select>';
		}

		return null;
	}

	function renderForm(attrText, body, formId, opts) {
		var attrs = parseFormAttributes(attrText || '');
		var html = '<form id="' + formId + '" method="' + attrs.method + '"'
			+ (attrs.action ? ' action="' + escapeHtml(attrs.action) + '"' : ' data-' + opts.dataPrefix + '-form="local"') + '>';
		String(body || '').split('\n').forEach(function (line, index) {
			line = line.trim();
			if (!line) {
				return;
			}
			var submit = /^\[\[\s*(.+?)\s*\]\]$/.exec(line);
			if (submit) {
				html += '<button type="submit">' + escapeHtml(submit[1]) + '</button>';
				return;
			}
			var field = /^([^=]+?)\s*(\*)?\s*=\s*(.+)$/.exec(line);
			var rendered = field ? renderField(field[1], !!field[2], field[3].trim(), formId + '-' + index, opts) : null;
			// anything else is shown as plain (escaped) text
			html += rendered !== null ? rendered : '<p>' + escapeHtml(line) + '</p>';
		});
		return html + '</form>';
	}

	/**
	 * Creates the Showdown extension.
	 *
	 *   const converter = new showdown.Converter({ extensions: [showdownForms()] });
	 *
	 * @param {{idPrefix?: string, dataPrefix?: string}} [options]
	 * @returns {Array<{type: 'lang', filter: function(string): string}>}
	 */
	function showdownForms(options) {
		var opts = resolveOptions(options);
		var counter = 0;
		return [{
			type: 'lang',
			filter: function (text) {
				return text.replace(/\r\n?/g, '\n').replace(FORM_BLOCK, function (match, pre1, fence, pre2, attrs, body) {
					if (fence) {
						return match; // leave fenced code blocks untouched
					}
					var formId = opts.idPrefix + '-' + (++counter);
					return (pre2 || '') + '\n' + renderForm(attrs, body, formId, opts) + '\n\n';
				});
			},
		}];
	}

	/**
	 * Renders the body of a single form block (the lines between ":::form" and ":::").
	 *
	 * @param {string} body
	 * @param {{attributes?: string, id?: string, idPrefix?: string, dataPrefix?: string}} [options]
	 * @returns {string} HTML
	 */
	function render(body, options) {
		var opts = resolveOptions(options);
		var formId = options && typeof options.id === 'string' && /^[a-z][\w-]*$/i.test(options.id) ? options.id : opts.idPrefix + '-1';
		return renderForm(options && options.attributes, body, formId, opts);
	}

	/**
	 * Sanitizers such as DOMPurify drop name attributes that equal a document
	 * or form property (e.g. name="name") to prevent DOM clobbering. The name of
	 * a generated field is derived from its label and only contains letters,
	 * digits, "_" and "-", so it is restored from data-<dataPrefix>-name.
	 * Call this after inserting sanitized HTML into the page.
	 *
	 * @param {ParentNode} root
	 * @param {{dataPrefix?: string}} [options]
	 */
	function restoreNames(root, options) {
		var attr = 'data-' + resolveOptions(options).dataPrefix + '-name';
		var selector = ['input', 'textarea', 'select'].map(function (tag) {
			return 'form ' + tag + '[' + attr + ']';
		}).join(', ');
		Array.prototype.forEach.call(root.querySelectorAll(selector), function (field) {
			var name = field.getAttribute(attr);
			if (SAFE_NAME.test(name)) {
				field.setAttribute('name', name);
			}
			field.removeAttribute(attr);
		});
	}

	/**
	 * Forms without "action" never navigate away: submitting them dispatches a
	 * bubbling "<dataPrefix>:form-submit" event with detail { data: FormData }.
	 *
	 * @param {Document|Element} target where the submit listener is attached
	 * @param {{dataPrefix?: string}} [options]
	 * @returns {function(): void} removes the listener again
	 */
	function listen(target, options) {
		var prefix = resolveOptions(options).dataPrefix;
		var handler = function (event) {
			var form = event.target;
			if (form && form.getAttribute && form.getAttribute('data-' + prefix + '-form') === 'local') {
				event.preventDefault();
				form.dispatchEvent(new CustomEvent(prefix + ':form-submit', {
					bubbles: true,
					detail: { data: new FormData(form) },
				}));
			}
		};
		target.addEventListener('submit', handler);
		return function () {
			target.removeEventListener('submit', handler);
		};
	}

	showdownForms.render = render;
	showdownForms.restoreNames = restoreNames;
	showdownForms.listen = listen;
	showdownForms.escapeHtml = escapeHtml;
	showdownForms.default = showdownForms;

	return showdownForms;
});
