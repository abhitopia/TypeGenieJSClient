// Interfaces

import StateManager from "../state_managers/base";

interface CompletionMetadata {
    requestTimestamp: number,
    responseTimestamp: number,
    shown: boolean
}

interface StateIteration  {
    anchorPosition : number;
    timestamp : number,
    text: string,
    availableCompletion : string
}

interface SessionHistory {
    session_id: string,
    stateTransitionHistory: StateIteration[]
}


interface TypeGenieTelemetryBufferInterface {

    sessionHistory: SessionHistory;


}

const reconstructTextFromElementCollection = (text_wrapper: HTMLCollectionOf<Element>) : string => {
    let text = "";
    for (let i= 0; i < text_wrapper.length; i++) {
        text += text_wrapper[i].textContent;
        if(i<text_wrapper.length-1) {
            text += '\n';
        }
    }
    return text;
}



export class TypeGenieTelemetryBuffer implements TypeGenieTelemetryBufferInterface {

    public sessionHistory : SessionHistory;
    private stateManager: StateManager;
    private currentHtmlInnerState: string;
    private readonly completionClass: string;

    set sessionId(value: string) {
        this.sessionHistory.session_id = value
    }

    get sessionId() {
        return this.sessionHistory.session_id;
    }



    constructor(private editor: any, stateManager:StateManager) {
        this.editor = editor;
        this.sessionHistory = {session_id: null, stateTransitionHistory: []};
        this.stateManager = stateManager;
        this.completionClass = "tg-completion";
        document.addEventListener('selectionchange', (e)=> this.updateEditorStateTransitionHistory(e));
        this.initTelemetryReport(5000);
    }



    resetStateHistory() {
        this.sessionHistory.stateTransitionHistory = [];
    }


    updateEditorStateTransitionHistory(e:Event) {
        const transitionInfo = {event: e, scope: this.stateManager.getScope(),
                anchor: {anchorNode: document.getSelection().anchorNode, anchorOffset: document.getSelection().anchorOffset}}
        if(this.currentHtmlInnerState !== transitionInfo.scope.innerHTML) {
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(transitionInfo.scope.innerHTML, 'text/html')
            let completion_wrapper: Element = htmlDoc.getElementsByClassName(this.completionClass)[0];
            let completionParentNode = completion_wrapper?.parentNode;
            const completionText : string = completion_wrapper?.textContent;
            if(completionParentNode) {
                completionParentNode.removeChild(completion_wrapper);
            }
            let text_wrapper : HTMLCollectionOf<Element> = htmlDoc.getElementsByTagName('p');
            let text = reconstructTextFromElementCollection(text_wrapper);

            this.sessionHistory.stateTransitionHistory.push({anchorPosition: transitionInfo.anchor.anchorOffset, timestamp: Date.now(), text: text,
                availableCompletion: completionText})
            this.currentHtmlInnerState = transitionInfo.scope.innerHTML;
            console.log('transition history: ', this.sessionHistory.stateTransitionHistory)
        }
    }


    initTelemetryReport(interval: number) {
        const context = this;
        setInterval(() => {
            if(context.sessionHistory.stateTransitionHistory.length > 0 && context.sessionId!=null) {
                console.log('Will report: ', context.sessionHistory.stateTransitionHistory);
                this.resetStateHistory();
            } else {
                console.log('Session: ' + context.sessionId + ' has no events to report');
            }
        }, interval)
    }

}

