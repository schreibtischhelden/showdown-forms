export interface ShowdownFormsOptions {
	/** Prefix of the generated form ids, default "sdf-form". */
	idPrefix?: string;
	/** Prefix of the data attributes and the submit event, default "sdf". */
	dataPrefix?: string;
}

export interface RenderOptions extends ShowdownFormsOptions {
	/** Attributes as written after ":::form", e.g. 'action="/send" method="get"'. */
	attributes?: string;
	/** Id of the form element. */
	id?: string;
}

export interface ShowdownLangExtension {
	type: 'lang';
	filter: (text: string) => string;
}

declare function showdownForms(options?: ShowdownFormsOptions): ShowdownLangExtension[];

declare namespace showdownForms {
	function render(body: string, options?: RenderOptions): string;
	function restoreNames(root: ParentNode, options?: Pick<ShowdownFormsOptions, 'dataPrefix'>): void;
	function listen(target: EventTarget, options?: Pick<ShowdownFormsOptions, 'dataPrefix'>): () => void;
	function escapeHtml(value: unknown): string;
}

export default showdownForms;
export declare const render: typeof showdownForms.render;
export declare const restoreNames: typeof showdownForms.restoreNames;
export declare const listen: typeof showdownForms.listen;
export declare const escapeHtml: typeof showdownForms.escapeHtml;
