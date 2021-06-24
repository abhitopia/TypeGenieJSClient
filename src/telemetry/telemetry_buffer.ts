// Interfaces

import {IGNORE_KEYCODES} from "../constants";
import StateManager from "../state_managers/base";
import {fromEvent, Observable} from "rxjs";

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
    private currentAnchorOffset: number;
    private currentHtmlInnerState: string;
    private completionClass: string;

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

        // fromEvent(document, 'selectionchange', (e: Event)=> new Object({event: e, scope: this.stateManager.getScope(),
        //     anchor: {anchorNode: document.getSelection().anchorNode, anchorOffset: document.getSelection().anchorOffset}}))
        //     .subscribe(r => this.updateEditorStateTransitionHistory(r));
    }



    getEditorContent() : string {
        throw new Error("Not implemented: A valid function must be passed as constructor parameter");
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
    //
    // updateEditorStateTransitionHistory(transitionInfo: any) {
    //
    //     // console.log('Will update editor state with ',transitionInfo);
    //     if(this.currentHtmlInnerState !== transitionInfo.scope.innerHTML) {
    //         const parser = new DOMParser();
    //         const htmlDoc = parser.parseFromString(transitionInfo.scope.innerHTML, 'text/html')
    //         let completion_wrapper: Element = htmlDoc.getElementsByClassName(this.completionClass)[0];
    //         let completionParentNode = completion_wrapper?.parentNode;
    //         const completionText : string = completion_wrapper?.textContent;
    //         if(completionParentNode) {
    //             completionParentNode.removeChild(completion_wrapper);
    //         }
    //         let text_wrapper : HTMLCollectionOf<Element> = htmlDoc.getElementsByTagName('p');
    //         let text = reconstructTextFromElementCollection(text_wrapper);
    //
    //         this.sessionHistory.stateTransitionHistory.push({anchorPosition: transitionInfo.anchor.anchorOffset, timestamp: Date.now(), text: text,
    //             availableCompletion: completionText})
    //         this.currentHtmlInnerState = transitionInfo.scope.innerHTML;
    //         console.log('transition history: ', this.sessionHistory.stateTransitionHistory)
    //     }
    //
    //     // if(IGNORE_KEYCODES.includes(keyCode)) return;
    //     // let currentContent;
    //     // if(keystroke.length === 1) {
    //     //     currentContent = this.getEditorContent().concat(keystroke);
    //     // } else {
    //     //     currentContent = this.getEditorContent();
    //     // }
    //     // const newState : StateIteration = {timestamp: Date.now(), keystroke: keyBoardEventStr, text: currentContent,
    //     //     completion: {metadata: {requestTimestamp: null, responseTimestamp: null, shown: false}, value: null}};
    //     // this.sessionHistory.stateHistory.push(newState);
    // }

    //
    // completionRequested() {
    //     this.currentStateIteration.completion.metadata.requestTimestamp = Date.now();
    // }
    //
    // completionReturned(completionValue: string) {
    //     this.currentStateIteration.completion.value = completionValue;
    //     this.currentStateIteration.completion.metadata.responseTimestamp = Date.now();
    // }
    //
    // completionShown() {
    //
    //     this.currentStateIteration.completion.metadata.shown = true;
    // }


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

