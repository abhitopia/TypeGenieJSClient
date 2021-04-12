export interface HTML {
    insert(html: string, clean?: boolean, doSplit?: boolean): object;
}

export class FroalaEditor {
    public html: HTML;
    public el: Element
}
