// Interfaces

interface StateIteration  {
    timestamp : number,
    text: string,
    completion: string,
    keystroke: string
}

interface SessionHistory {
    session_id: string,
    stateHistory: StateIteration[]
}


interface TypeGenieTelemetryBufferInterface {


}



export class TypeGenieTelemetryBuffer implements TypeGenieTelemetryBufferInterface {

    private _sessionHistory : SessionHistory;
    private _editor: any;

    get sessionHistory(): SessionHistory {
        return this._sessionHistory;
    }

    set sessionHistory(value: SessionHistory) {
        this._sessionHistory = value;
    }

    set sessionId(value: string) {
        this._sessionHistory.session_id = value
    }

    get sessionId() {
        return this._sessionHistory.session_id;
    }

    get currentStateIteration() {
        return this._sessionHistory.stateHistory[this._sessionHistory.stateHistory.length - 1];
    }

    set currentStateIteration(value) {
        this._sessionHistory.stateHistory[this._sessionHistory.stateHistory.length - 1] = value;
    }


    constructor(private editor: any) {
        this.editor = editor;
        this.sessionHistory = {session_id: null, stateHistory: []};
        console.log('Initializing TipeGenieTelemetryBuffer with state: ', this.sessionHistory);
    }


    initStateHistory(): void {
        this.currentStateIteration = {timestamp: null, keystroke: null, text: this.getEditorContent(), completion: null};
    }


    getEditorContent() : string {
        throw new Error("Not implemented");
    }

    resetStateHistory() {
        this.sessionHistory.stateHistory = [];
        this.initStateHistory();
    }

    prepareNextStateIteration() {
        const newState : StateIteration = {timestamp: null, text: this.getEditorContent() , completion: null, keystroke: null};
        this.sessionHistory.stateHistory.push(newState);
    }


    closeCurrentStateIteration(keystroke: any, completion: string) {
        if(this.currentStateIteration === undefined) {
            this.initStateHistory();
        }
        this.currentStateIteration.completion = completion;
        this.currentStateIteration.timestamp = Date.now();
        this.currentStateIteration.keystroke = keystroke;
    }


    iterateEditorState(keystroke: string, completion: string) {
        this.closeCurrentStateIteration(keystroke, completion);
        this.prepareNextStateIteration();

    }


    startTelemetryReport(interval: number) {
        console.log('Calling telemetry report');
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

