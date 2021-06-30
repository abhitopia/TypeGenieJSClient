// Interfaces
import {diffChars} from "diff";


interface StateIteration  {
    anchorPosition : {[axis: string]: number};
    timestamp : number,
    textDiff: any,
    availableCompletion : string,
    // keyStroke: {key: string, altKey: boolean, ctrlKey: boolean, shiftKey: boolean
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

const computeRemainingOffset = (node:Node) => {
    let offset = 0;
    const parent = node.parentNode;
    let newNode : Node = parent;
    while((newNode = newNode.previousSibling) != null) {
        offset += newNode.textContent.length + 1;
    }
    return offset;

}




export class TypeGenieTelemetryBuffer implements TypeGenieTelemetryBufferInterface {

    public sessionHistory : SessionHistory;
    private readonly editorScope: Element;
    private currentHtmlInnerState: string;
    private prevText: string = "";
    private readonly completionClass: string;
    private currentSelection : any;
    private currentCompletion: string;

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
        let mutationObserver = new MutationObserver(() => this.updateEditorStateTransitionHistory(null));
        mutationObserver.observe(this.editorScope, {attributes: true, childList: true, characterData: true, subtree: true, characterDataOldValue: true, attributeOldValue: true});
        // this.editorScope.addEventListener('keyup', (e) => {
        //     this.updateEditorStateTransitionHistory(e as KeyboardEvent)
        //     mutationObserver.observe(this.editorScope, {attributes: true, childList: true, characterData: true, subtree: true, characterDataOldValue: true, attributeOldValue: true});
        // })
        this.editorScope.addEventListener('mouseup', ()=> this.setCurrentSelection())
        this.editorScope.addEventListener('keydown', ()=> {
            this.setCurrentSelection()
        });
        this.initTelemetryReport(5000);
    }


    resetStateHistory() {
        this.sessionHistory.stateTransitionHistory = [];
    }


    updateEditorStateTransitionHistory(event: KeyboardEvent) {
        if((this.currentHtmlInnerState !== this.editorScope.innerHTML)) {
            const {text, completionText} = digestEditorScopeHtml(this.editorScope.innerHTML, this.completionClass);
            let {textDiff, caret} = this.processTextEditing(text);
            if(textDiff || completionText) {
                this.sessionHistory.stateTransitionHistory.push({
                    anchorPosition: caret, timestamp: Date.now(), textDiff: textDiff,
                    availableCompletion: completionText})
            }

            this.currentHtmlInnerState = this.editorScope.innerHTML;
            this.prevText = text;
        }
    }


    processTextEditing = (current: string) => {
        current = current ? current : "";
        console.log('Computing diff for: ', current , ' and ', this.prevText);
        const computedDiff = diffChars(this.prevText , current);
        const result : any = {textDiff: null, caret: {anchorOffset: null, focusOffset: null}};
        if(this.prevText === "") Object.assign(result, {textDiff: {value: current, added: true, removed: undefined, count : 1}, caret: this.currentSelection})
        if(computedDiff.length >= 2) {
            Object.assign(result,{textDiff: computedDiff[1],
                caret: this.currentSelection})
        }
        return result;
    }


    setCurrentSelection() {
            const focusOffset = document.getSelection().focusOffset + computeRemainingOffset(document.getSelection().focusNode);
            const anchorOffset = document.getSelection().anchorOffset + computeRemainingOffset(document.getSelection().anchorNode);
            this.currentSelection = {anchorOffset: anchorOffset, focusOffset: focusOffset!=anchorOffset?focusOffset:null}
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

