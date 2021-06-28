// Interfaces
import {diffChars} from "diff";


interface StateIteration  {
    anchorPosition : {[axis: string]: number};
    timestamp : number,
    textDiff: any,
    availableCompletion : string
}

interface SessionHistory {
    session_id: string,
    stateTransitionHistory: StateIteration[]
}


interface TypeGenieTelemetryBufferInterface {
    sessionHistory: SessionHistory;
}


const parser = new DOMParser();



// Takes collection of elements and reconstructs text string for given collection
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



// Processes text differences and computes caret position
const processTextEditing = (prev: string, current: string) => {
        prev = prev ? prev : "";
        current = current ? current : "";
        // console.log(`Computing difference between ${prev} and ${current}`);
        const computeDiff = diffChars(prev, current);
        const result : any = {textDiff: null, yOffset: null, xOffset: null};
        if(computeDiff.length >= 2) {
            const textBeforeEditPosition = computeDiff[0]?.value?.split('\n');
            const currentLine = textBeforeEditPosition?.length -1;
            let caretOffset;
            if(computeDiff[1].removed) {
                caretOffset = textBeforeEditPosition[currentLine].length + computeDiff[1].count;
            } else {
                caretOffset = textBeforeEditPosition[currentLine].length;
            }

            Object.assign(result,{textDiff: computeDiff[1],
                yOffset: currentLine, xOffset: caretOffset})
        }
        return result;
}

// Bootstraps completion html from remaining text
const bootstrapCompletion = (htmlDoc: any, completionClass: string) : string => {
    let completion_wrapper: Element = htmlDoc.getElementsByClassName(completionClass)[0];
    let completionParentNode = completion_wrapper?.parentNode;
    const completionText: string = completion_wrapper?.textContent;
    // Remove completion html to compute correct text
    if (completionParentNode) {
        completionParentNode.removeChild(completion_wrapper);
    }
    return completionText;
}

// Processes editor scope html and bootstraps existing completion as well as remaining text
const digestEditorScopeHtml = (scopeHtml: string, completionClass: string) => {
    const htmlDoc = parser.parseFromString(scopeHtml, 'text/html')
    let completionText = bootstrapCompletion(htmlDoc, completionClass);
    let text_wrapper: HTMLCollectionOf<Element> = htmlDoc.getElementsByTagName('p');
    let text = reconstructTextFromElementCollection(text_wrapper);
    return {text, completionText};
}




export class TypeGenieTelemetryBuffer implements TypeGenieTelemetryBufferInterface {

    public sessionHistory : SessionHistory;
    private readonly editorScope: Element;
    private currentHtmlInnerState: string;
    private currentText: string;
    private readonly completionClass: string;
    private previousCaretPosition : any = {x: null, y: null};

    set sessionId(value: string) {
        this.sessionHistory.session_id = value
    }

    get sessionId() {
        return this.sessionHistory.session_id;
    }


    constructor(private editor: any, editorScope: Element) {
        this.editor = editor;
        this.sessionHistory = {session_id: null, stateTransitionHistory: []};
        this.editorScope = editorScope;
        this.completionClass = "tg-completion";
        let mutationObserver = new MutationObserver(() => this.updateEditorStateTransitionHistory());
        mutationObserver.observe(this.editorScope, {
            attributes: true,
            childList: true,
            characterData: true,
            subtree: true,
            characterDataOldValue: true,
            attributeOldValue: true
        });
        this.initTelemetryReport(5000);
    }





    resetStateHistory() {
        this.sessionHistory.stateTransitionHistory = [];
    }


    updateEditorStateTransitionHistory() {
        if((this.currentHtmlInnerState !== this.editorScope.innerHTML)) {
            const {text, completionText} = digestEditorScopeHtml(this.editorScope.innerHTML, this.completionClass);
            let {textDiff, yOffset, xOffset} = processTextEditing(this.currentText, text);
            this.sessionHistory.stateTransitionHistory.push({
                anchorPosition: {x: xOffset, y: yOffset}, timestamp: Date.now(), textDiff: textDiff,
                availableCompletion: completionText,
            })
            // if(xOffset && yOffset) {
            //     this.previousCaretPosition = {x: xOffset, y: yOffset};
            // }
            this.currentHtmlInnerState = this.editorScope.innerHTML;
            this.currentText = text;
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

