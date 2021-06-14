// Interfaces

interface CompletionMetadata {
    requestTimestamp: number,
    responseTimestamp: number,
    shown: boolean
}

interface StateIteration  {
    timestamp : number,
    text: string,
    completion: {metadata: CompletionMetadata, value: string},
    keystroke: string
}

interface SessionHistory {
    session_id: string,
    stateHistory: StateIteration[]
}


interface TypeGenieTelemetryBufferInterface {


}



export class TypeGenieTelemetryBuffer implements TypeGenieTelemetryBufferInterface {

    public sessionHistory : SessionHistory;
    private _editor: any;


    set sessionId(value: string) {
        this.sessionHistory.session_id = value
    }

    get sessionId() {
        return this.sessionHistory.session_id;
    }

    get currentStateIteration() {
        return this.sessionHistory.stateHistory[this.sessionHistory.stateHistory.length - 1];
    }

    constructor(private editor: any, contentProcessor: ()=>string) {
        this.editor = editor;
        this.sessionHistory = {session_id: null, stateHistory: []};
        this.getEditorContent = contentProcessor;
    }



    getEditorContent() : string {
        throw new Error("Not implemented");
    }

    resetStateHistory() {
        this.sessionHistory.stateHistory = [];
    }


    iterateEditorState(keystroke: string, keyCode: number) {
        let currentContent;
        if(keystroke.length === 1) {
            currentContent = this.getEditorContent().concat(keystroke);
        } else {
            currentContent = this.getEditorContent();
        }
        const newState : StateIteration = {timestamp: Date.now(), keystroke: keystroke, text: currentContent,
            completion: {metadata: {requestTimestamp: null, responseTimestamp: null, shown: false}, value: null}};
        this.sessionHistory.stateHistory.push(newState);
    }



    setRequestedCompletion() {
        this.currentStateIteration.completion.metadata.requestTimestamp = Date.now();
    }

    setReturnedCompletion(completionValue: string) {
        this.currentStateIteration.completion.value = completionValue;
        this.currentStateIteration.completion.metadata.responseTimestamp = Date.now();
    }

    setCompletionAsShown() {
        this.currentStateIteration.completion.metadata.shown = true;
    }


    startTelemetryReport(interval: number) {
        const context = this;
        setInterval(() => {
            if(context.sessionHistory.stateHistory.length > 0 && context.sessionId!=null) {
                console.log('Will report: ', context.sessionHistory.stateHistory);
                this.resetStateHistory();
            } else {
                console.log('Session: ' + context.sessionId + ' has no events to report');
            }
        }, interval)
    }

}

