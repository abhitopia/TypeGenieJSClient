// Interfaces
import {diffChars} from "diff";


interface StateIteration  {
    anchorPosition : {[axis: string]: number};
    timestamp : number,
    textDiff: any,
    availableCompletion : string,
    keyStroke: {key: string, altKey: boolean, ctrlKey: boolean, shiftKey: boolean}
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
    private currentText: string = "";
    private readonly completionClass: string;
    private currentSelection : any;

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
        this.editorScope.addEventListener('keyup', (e) => this.updateEditorStateTransitionHistory(e as KeyboardEvent))
        this.editorScope.addEventListener('mouseup', ()=> this.setCurrentSelection())
        this.editorScope.addEventListener('keydown', ()=> this.setCurrentSelection())
        this.initTelemetryReport(5000);
    }


    resetStateHistory() {
        this.sessionHistory.stateTransitionHistory = [];
    }


    updateEditorStateTransitionHistory(event: KeyboardEvent) {
        console.log('On update state transition history selection is: ', this.currentSelection);
        if((this.currentHtmlInnerState !== this.editorScope.innerHTML)) {
            const {text, completionText} = digestEditorScopeHtml(this.editorScope.innerHTML, this.completionClass);
            let {textDiff, caret} = this.processTextEditing(text, event.key);
            this.sessionHistory.stateTransitionHistory.push({
                anchorPosition: caret, timestamp: Date.now(), textDiff: textDiff,
                availableCompletion: completionText,
                keyStroke: {key:event.key, shiftKey:event.shiftKey, altKey:event.altKey, ctrlKey: event.ctrlKey}
            })
            this.currentHtmlInnerState = this.editorScope.innerHTML;
            this.currentText = text;
        }
    }


    processTextEditing = (current: string, keyStroke: string) => {
        current = current ? current : "";
        const computedDiff = diffChars(this.currentText , current);
        const result : any = {textDiff: null, caret: {anchorOffset: null, focusOffset: null}};
        if(computedDiff.length >= 2) {
            const currentText = computedDiff[0].value;
            const removedByBackspace = computedDiff[1].removed && keyStroke === 'Backspace';
            const caretPosition = removedByBackspace? currentText.length + computedDiff[1].count : currentText.length;
            // const highlightedSelection = this.computeMultilineCaretOffset(computedDiff);
            // Try to work around this special case
            // Object.assign(result,{textDiff: computedDiff[1],
            //     caret: highlightedSelection ? highlightedSelection: {anchorOffset: caretPosition}})
            Object.assign(result,{textDiff: computedDiff[1],
                caret: this.currentSelection ? this.currentSelection: {anchorOffset: caretPosition}})
        }
        return result;
    }


    setCurrentSelection() {
        if(document.getSelection().anchorNode != document.getSelection().focusNode) {
            console.log('Computing selection for different nodes');
            console.log('Anchor node: ', document.getSelection().anchorNode);
            console.log('Anchor offset: ', document.getSelection().anchorOffset);
            console.log('Focus node: ', document.getSelection().focusNode);
            console.log('Focus offset: ', document.getSelection().focusOffset);

        } else {
            if(document.getSelection().anchorOffset != document.getSelection().focusOffset) {
                this.currentSelection = {anchorOffset: document.getSelection().anchorOffset, focusOffset: document.getSelection().focusOffset}
            } else {
                this.currentSelection = null;
            }
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

