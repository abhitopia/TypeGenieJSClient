// Interfaces


interface CompletionMetadata {
    requestTimestamp: number,
    responseTimestamp: number,
    shown: boolean
}

interface StateIteration  {
    anchorPosition : {[axis: string]: number};
    timestamp : number,
    textDiff: string,
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

const getAnchorVerticalOffset = (anchorNode: Node) => {
    let i = 0;
    const innerHtml = ((anchorNode as Element).innerHTML);
    if(anchorNode.textContent == "" || innerHtml != undefined) {
        while((anchorNode = anchorNode.previousSibling) != null )
            i++;
    } else {
        anchorNode = anchorNode.parentNode;
        while((anchorNode = anchorNode.previousSibling) != null )
            i++;
    }
    return i;
}

const getAnchorHorizontalOffset = (anchorNode: Node, anchorOffset: number) => {

    // TODO change this (not working properly yet)
    if((anchorNode as Element).outerHTML == undefined) {
        return anchorOffset;
    } else {
        console.log('AnchorNode is: ', anchorNode);
        return 'Need to compute';
    }

}


const computeDiff = (a: string, b: string) => {
    if(b == undefined) b=""
    let i = 0;
    let j = 0;
    let result = "";
    while (j < b.length)
    {
        if (a[i] != b[j] || i == a.length)
            result += b[j];
        else
            i++;
        j++;
    }
    return result;
}

const getTextChanges = (a:string, b: string) => {
    let res = computeDiff(a,b);
    return res  != "" ? res : computeDiff(b,a);
}

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


export class TypeGenieTelemetryBuffer implements TypeGenieTelemetryBufferInterface {

    public sessionHistory : SessionHistory;
    private editorScope: Element;
    private currentHtmlInnerState: string;
    private currentAnchor: {[key: string]: any} = {};
    private currentText: string;
    private readonly completionClass: string;

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
        let mutationObserver = new MutationObserver((m) => this.updateEditorStateTransitionHistory(m));
        mutationObserver.observe(this.editorScope, {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
            attributeOldValue: true,
            characterDataOldValue: true
        });

        //this.editorScope.addEventListener('change', (e)=> this.updateEditorStateTransitionHistory(e));
        this.initTelemetryReport(5000);
    }



    resetStateHistory() {
        this.sessionHistory.stateTransitionHistory = [];
    }


    updateEditorStateTransitionHistory(m: MutationRecord[]) {
        const transitionInfo = { scope: this.editorScope,
                anchor: {anchorNode: document.getSelection().anchorNode, anchorOffset: document.getSelection().anchorOffset}}

        //console.log('Current node: ', transitionInfo.anchor.anchorNode)
        const anchorXOffset = transitionInfo.anchor.anchorOffset;
        const anchorYOffset = getAnchorVerticalOffset(transitionInfo.anchor.anchorNode);
        console.log('Attributes: ', m);
        if((this.currentHtmlInnerState !== transitionInfo.scope.innerHTML) || (anchorXOffset != this.currentAnchor.x || (anchorYOffset != this.currentAnchor.y))) {
            // console.log(`computed coords x: ${anchorXOffset} y:${anchorYOffset}`);
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(transitionInfo.scope.innerHTML, 'text/html')
            let completionText = bootstrapCompletion(htmlDoc, this.completionClass);
            let text_wrapper: HTMLCollectionOf<Element> = htmlDoc.getElementsByTagName('p');
            let text = reconstructTextFromElementCollection(text_wrapper);
            // TODO try this again later
            //let text = (transitionInfo.scope as HTMLElement).innerText;
            this.sessionHistory.stateTransitionHistory.push({
                anchorPosition: {x:anchorXOffset, y: anchorYOffset}, timestamp: Date.now(), textDiff: getTextChanges(this.currentText, text),
                availableCompletion: completionText,
            })
            this.currentHtmlInnerState = transitionInfo.scope.innerHTML;
            this.currentText = text;
            console.log('transition history: ', this.sessionHistory.stateTransitionHistory)
            this.currentAnchor = {x: anchorXOffset, y: anchorYOffset};
        }
    }


    initTelemetryReport(interval: number) {
        const context = this;
        setInterval(() => {
            if(context.sessionHistory.stateTransitionHistory.length > 0 && context.sessionId!=null) {
                //console.log('Will report: ', context.sessionHistory.stateTransitionHistory);
                this.resetStateHistory();
            } else {
                console.log('Session: ' + context.sessionId + ' has no events to report');
            }
        }, interval)
    }

}

