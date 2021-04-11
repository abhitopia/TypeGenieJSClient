export {}
declare global {
    class IFroalaEditor {
        public connect_typegenie: Function
        constructor(...args: any[])
    }

    interface Window {
        TYPEGENIE_API_URL: string;
        FroalaEditor: any;
        jQuery: Function
        $: Function
    }
}

export interface TGJQuery<T> extends JQuery {
    froalaEditor: Function
}