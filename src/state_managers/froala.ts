import StateManager, {IEditorState} from "./base";
import {v4 as uuidv4} from "uuid"
import {FroalaEditor} from "../definitions/froala";


export default class FroalaStateManager extends StateManager {
    private completionId: string
    private completionClass: string
    constructor(public eventsCallback: Function, public froalaEditor: FroalaEditor) {
        super(eventsCallback)
        this.completionId = `tg-completion-${uuidv4()}`
        this.completionClass = "tg-completion"
    }

    private removeCompletion() {
        let completion = document.getElementById(this.completionId)
        if (completion) {
            completion.remove()
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

    private getTextBeforeCaret(): string {
        const selection = window.getSelection()
        let range = document.createRange();
        range.setStart(this.froalaEditor.el, 0)
        range.setEnd(selection.anchorNode, selection.anchorOffset)
        return range.cloneContents().textContent
    }

    getQuery(): string {
        const selection = window.getSelection()
        let range = document.createRange();
        range.setStart(this.froalaEditor.el, 0)
        range.setEnd(selection.anchorNode, selection.anchorOffset)
        return range.cloneContents().textContent
    }

    getCompletion(): string {
        let completionElement = document.getElementById(this.completionId)
        if(completionElement) {
            return completionElement.innerText
        } else {
            return ""
        }
    }

    setCompletion(completion: string) {
        this.removeCompletion()
        if(completion) {
            let { anchorNode, anchorOffset } = window.getSelection()
            this.froalaEditor.html.insert(`<span style="color: rgba(0, 0, 0, 0.5)" id="${this.completionId}" class="${this.completionClass}">${completion}</span>`, false)
            this.setCaret(anchorNode, anchorOffset)
        }
    }

    acceptText(text: string) {
        const currentCompletionText = this.getCompletion()
        this.setCompletion(currentCompletionText.slice(text.length))
        this.froalaEditor.html.insert(`${text}`, false)
    }

    getScope(): Element {
        return this.froalaEditor.el
    }
}
