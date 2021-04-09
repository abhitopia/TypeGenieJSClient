export {}
declare global {
    interface Window {
        TYPEGENIE_API_URL: string;
        FroalaEditor: Function;
    }
}

export interface TGJQuery<T> extends JQuery {
    froalaEditor: Function
}