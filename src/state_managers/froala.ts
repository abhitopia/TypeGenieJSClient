import StateManager, {IEditorState} from "./base";
import {v4 as uuidv4} from "uuid"
import {FroalaEditor, HTML} from "../definitions/froala";
import {TGJQuery} from "../definitions";

export class FroalaEditorV2toV3 {
    public html: HTML
    public el: HTMLElement
    constructor(public froalaJSObject: TGJQuery<HTMLElement>) {
        let that = this
        this.html = {
            "insert": function(html: string, clean?: boolean, doSplit?:boolean): any {
                that.froalaJSObject.froalaEditor("html.insert", html, clean)
            }
        }
        this.el = this.froalaJSObject.prev("div.fr-box.fr-basic.fr-top").find(".fr-element.fr-view").get(0)
    }
}


export default class FroalaStateManager extends StateManager {
    private completionClass: string
    constructor(public eventsCallback: Function, public froalaEditor: FroalaEditor) {
        super(eventsCallback)
        this.completionClass = "tg-completion"
    }

    private removeCompletion() {
        let completionElements = document.getElementsByClassName(this.completionClass)
        for(let i=0; i<completionElements.length; i++){
            completionElements[i].remove()
        }
    }

    private setCaret(anchorNode: Node, anchorOffset: number) {
        let range = document.createRange();
        let sel = window.getSelection();
        range.setStart(anchorNode, anchorOffset);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }

    getQuery(): string {
        const selection = window.getSelection()
        let range = document.createRange();
        if(selection.anchorNode) {
            range.setStart(this.froalaEditor.el, 0)
            range.setEnd(selection.anchorNode, selection.anchorOffset)
            return range.cloneContents().textContent
        }
    }

    getCompletion(): string {
        let completionElements = document.getElementsByClassName(this.completionClass)
        if(completionElements.length > 0) {
            let completionElement = completionElements[0] as HTMLElement
            return completionElement.innerText
        } else {
            return ""
        }
    }



    setCompletion(completion: string) {
        this.removeCompletion()
        if(completion) {
            // Experimental feature to collapse selection to the end of last range https://developer.mozilla.org/en-US/docs/Web/API/Selection/collapseToEnd
            // Has some browser compatibility limitations but seems to be well supported by Chrome/Firefox
            window.getSelection().collapseToEnd();
            let { anchorNode, anchorOffset } = window.getSelection()
            this.froalaEditor.html.insert(`<span style="color: rgba(0, 0, 0, 0.5)" class="${this.completionClass}">${completion}</span>`, false)
            this.setCaret(anchorNode, anchorOffset)
        }
    }

    acceptCompletion(text: string) {
        const currentCompletionText = this.getCompletion()
        this.setCompletion(currentCompletionText.slice(text.length))
        this.froalaEditor.html.insert(`${text}`, false)
    }

    getScope(): Element {
        return this.froalaEditor.el
    }
}
