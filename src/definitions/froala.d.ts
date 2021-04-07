export interface HTML {
    cleanEmptyTags(): object;
    get(keepMarkers?: boolean, keepClasses?: boolean): string;
    getSelected(): string;
    unwrap(): void;
    wrap(temp?: boolean, tables?: boolean, blockquote?: boolean): void;
    insert(html: string, clean?: boolean, doSplit?: boolean): object;
    set(html: string): object;
}

export class FroalaEditor {
    html: HTML;
    el: Element
}
