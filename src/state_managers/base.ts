import {TypeGenieTelemetryBuffer} from "../telemetry/telemetry_buffer";

export interface IEvent {
    author_id?: string;
    author: "SYSTEM" | "AGENT" | "USER";
    event: "MESSAGE" | "CONTEXTUAL";
    author_name?: string;
    value: string;

    /** Timestamp at which this event has happened. */
    timestamp?: string;
}


export interface IEditorState {
    query: string;
    completion: string;
}


export default class StateManager {
    public events: Array<IEvent>
    constructor(public eventsCallback: Function, public telemetryBuffer: TypeGenieTelemetryBuffer) {
        this.eventsCallback = eventsCallback.bind(this)
        this.events = this.eventsCallback()
    }

    acceptFirstChar() {
        let editorStateNow = this.editorState
        let completion = editorStateNow.completion

        if (completion.length > 0) {
            this.acceptCompletion(completion[0])
            this.telemetryBuffer.addEvent(this.telemetryBuffer.createTelemetryEvent(Date.now(),TypeGenieTelemetryBuffer.Action.ACCEPT_FIRST_CHAR, completion[0]))
        }
    }

    partialAccept() {
        let editorStateNow = this.editorState
        let completion = editorStateNow.completion
        if(completion.length > 0) {
            let toAccept = completion.split(" ")[0]
            this.acceptCompletion(toAccept)
            this.telemetryBuffer.addEvent(this.telemetryBuffer.createTelemetryEvent(Date.now(),TypeGenieTelemetryBuffer.Action.ACCEPT_PARTIAL_COMPLETION, toAccept))
        }
    }

    accept() {
        let editorStateNow = this.editorState
        let completion = editorStateNow.completion
        if(completion.length > 0) {
            this.acceptCompletion(completion)
            this.telemetryBuffer.addEvent(this.telemetryBuffer.createTelemetryEvent(Date.now(),TypeGenieTelemetryBuffer.Action.ACCEPT_COMPLETION, completion))
        }
    }

    get editorState(): IEditorState {
        let query = this.getQuery()
        let completion = this.getCompletion()
        return {
            query: query,
            completion: completion
        }
    }

    reset() {
        // Note that the new events are only called when reset_query is called
        this.events = this.eventsCallback()
        this.setCompletion("")
    }

    showCompletion(editorStateThen: IEditorState, completionText: string) {
        let editorStateNow = this.editorState
        if(!completionText) {
            this.setCompletion("")
            return
        }
        if (
            editorStateNow.query.length >= editorStateThen.query.length &&
            editorStateNow.query.substr(0, editorStateThen.query.length) ===
            editorStateThen.query
        ) {
            // get potentially overtyped text
            let overTyped = editorStateNow.query.substr(editorStateThen.query.length)
            // check if overTyped matched the returned completionText
            if (
                completionText.length > overTyped.length &&
                completionText.substr(0, overTyped.length) === overTyped
            ) {
                let completionRemaining = completionText.substr(overTyped.length)
                this.setCompletion(completionRemaining)
            }
        }
    }

    getQuery(): string {
        throw new Error("NotImplemented")
    }

    getCompletion(): string {
        throw new Error("NotImplemented")
    }

    setCompletion(completion: string) {
        throw new Error("NotImplemented")
    }

    acceptCompletion(text: string) {
        throw new Error("NotImplemented")
    }

    getScope(): Element {
        throw new Error("NotImplemented")
    }
}
