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


// Generated by ts-cli
interface IEvent {
    author_id?: string;
    author: "SYSTEM" | "AGENT" | "USER";
    event: "MESSAGE" | "CONTEXTUAL";
    author_name?: string;
    value: string;
    /** Timestamp at which this event has happened. */
    timestamp?: string;
}

interface IEditorState {
    query: string;
    completion: string;
}

declare class StateManager {
    eventsCallback: Function;
    events: Array<IEvent>;
    constructor(eventsCallback: Function);
    acceptFirstChar(): void;
    partialAccept(): void;
    accept(): void;
    get editorState(): IEditorState;
    reset(): void;
    showCompletion(editorStateThen: IEditorState, completionText: string): void;
    getQuery(): string;
    getCompletion(): string;
    setCompletion(completion: string): void;
    acceptCompletion(text: string): void;
    getScope(): Element;
}

declare class API {
    headers: {
        [name: string]: string;
    };
    commonPrefix: string;
    constructor();
    get baseUrl(): string;
    _getUrl(end_point: string): string;
    _request(url: string, options: {
        [name: string]: any;
    }): Promise<Response>;
    protected get(endpoint: string): Promise<Response>;
    protected delete(endpoint: string): Promise<Response>;
    protected post(endpoint: string, json: {
        [name: string]: any;
    }): Promise<Response>;
    protected put(endpoint: string, json: {
        [name: string]: any;
    }): Promise<Response>;
}

export class UserAPI extends API {
    constructor(token: string);
    info(): Promise<Response>;
    createSession(): Promise<Response>;
    getCompletions(sessionId: string, query: string, events: Array<IEvent>): Promise<Response>;
    private renewTokenPeriodically;
    renewToken(): Promise<Response>;
}
