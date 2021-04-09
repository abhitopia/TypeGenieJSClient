import StateManager from "./state_managers/base";
import UserAPIClient from "./api";
import PredictionManager from "./prediction_manager";
import {IGNORE_KEYCODES, KeyEnum, MODIFIER_KEYCODES, REJECT_KEYCODES} from "./constants";
import Throttler from "./throttle";

enum ModifierKeys {
    Alt,
    AltGraph,
    Control,
    Meta,
    Shift
}

const DEFAULT = -1

class EventBinder {
    private keyUpHandlers: {[name: string]: Function}
    private keyDownHandlers: {[name: string]: Function}

    constructor(public el: Element) {
        this.keyUpHandlers = {}
        this.keyDownHandlers = {}

        this.addKeyUpBind = this.addKeyUpBind.bind(this)
        this.addKeyDownBind = this.addKeyDownBind.bind(this)
        this.keyEventHandler = this.keyEventHandler.bind(this)

        el.addEventListener("keyup", this.keyEventHandler)
        el.addEventListener("keydown", this.keyEventHandler)
    }

    _makeKeyStr(keyCharCode: number, modifierKeys: Array<ModifierKeys>) {
        let keyStr = ""
        if(!MODIFIER_KEYCODES.includes(keyCharCode)) {
            keyStr = `${keyCharCode}`
        }
        if(modifierKeys.length > 0) {
            keyStr =  `${keyStr}---${modifierKeys.join("")}`
        }
        return keyStr
    }

    _makeKeyStrFromKeyBoardEvent(e: KeyboardEvent) {
        let keyCode = e.keyCode || e.which
        let modifierKeys = []
        if(e.altKey) {
            modifierKeys.push(ModifierKeys.Alt)
        }
        if(e.ctrlKey) {
            modifierKeys.push(ModifierKeys.Control)
        }
        if(e.shiftKey) {
            modifierKeys.push(ModifierKeys.Shift)
        }
        return this._makeKeyStr(keyCode, modifierKeys)
    }

    addKeyUpBind(key: number, modifierKeys: Array<ModifierKeys>, handler: Function) {
        let keyStr = this._makeKeyStr(key, modifierKeys)
        this.keyUpHandlers[keyStr] = handler
    }

    addKeyDownBind(key: number, modifierKeys: Array<ModifierKeys>, handler: Function) {
        let keyStr = this._makeKeyStr(key, modifierKeys)
        this.keyDownHandlers[keyStr] = handler
    }

    addEventHandler(eventName: string, handler: Function) {
        this.el.addEventListener(eventName, (e) => {handler(e)})
    }

    keyEventHandler(e: KeyboardEvent) {
        let keyStr = this._makeKeyStrFromKeyBoardEvent(e)
        let keyEventHandlers: {[name: string]: Function} = {}
        if(e.type === "keyup") {
            keyEventHandlers = this.keyUpHandlers
        } else if (e.type === "keydown") {
            keyEventHandlers = this.keyDownHandlers
        }
        if(keyEventHandlers[keyStr]) {
            keyEventHandlers[keyStr](e)
        } else if(keyEventHandlers[DEFAULT.toString()]) {
            keyEventHandlers[DEFAULT.toString()](e)
        }
    }
}


export class TypeGenieEventBinder {
    public predictionManager: PredictionManager
    public eventBinder: EventBinder
    public fetchAndShowCompletionsThrottler: Throttler
    constructor(public stateManager: StateManager, apiClient: UserAPIClient) {
        this.predictionManager = new PredictionManager(apiClient)
        this.predictionManager.createSession()

        // Bind the functions.
        this.onAccept = this.onAccept.bind(this)
        this.onTypingKeystroke = this.onTypingKeystroke.bind(this)
        this.onPartialAccept = this.onPartialAccept.bind(this)
        this.onKeyUp = this.onKeyUp.bind(this)
        this._fetchAndShowCompletions = this._fetchAndShowCompletions.bind(this)
        this.fetchAndShowCompletionsThrottler = new Throttler(this._fetchAndShowCompletions, 20)
        this.onRemoveCompletion = this.onRemoveCompletion.bind(this)

        this.eventBinder = new EventBinder(this.stateManager.getScope())

        // Add keyboard events
        this.eventBinder.addKeyDownBind(KeyEnum.TAB, [], this.onAccept)
        this.eventBinder.addKeyDownBind(KeyEnum.TAB, [ModifierKeys.Shift], this.onPartialAccept)
        this.eventBinder.addKeyDownBind(KeyEnum.RIGHT_ARROW, [], this.onAccept)
        this.eventBinder.addKeyDownBind(KeyEnum.RIGHT_ARROW, [ModifierKeys.Shift], this.onPartialAccept)

        this.eventBinder.addKeyDownBind(DEFAULT, [], this.onTypingKeystroke)
        this.eventBinder.addKeyUpBind(DEFAULT, [], this.onKeyUp)

        // Add javascript events other than keyboard events.
        this.eventBinder.addEventHandler("click", this.onRemoveCompletion)
        this.eventBinder.addEventHandler("focusin", this.onRemoveCompletion)
        this.eventBinder.addEventHandler("focusout", this.onRemoveCompletion)
    }

    async onRemoveCompletion(e: KeyboardEvent) {
        let editorState = this.stateManager.editorState
        this.stateManager.showCompletion(editorState, "")
    }

    async onAccept(e: KeyboardEvent) {
        e.preventDefault()
        e.stopImmediatePropagation()
        this.stateManager.accept()
    }

    async onTypingKeystroke(e: KeyboardEvent) {
        let completion = this.stateManager.editorState.completion
        const modifierKeyPressed = e.ctrlKey || e.altKey || e.metaKey

        if (completion && e.key === completion[0] || (completion[0] === "\u00A0" && e.keyCode === KeyEnum.SPACE)) {
            e.preventDefault()
            e.stopImmediatePropagation()
            this.stateManager.acceptFirstChar()
        } else if (!IGNORE_KEYCODES.includes(e.keyCode) && !modifierKeyPressed) {
            this.stateManager.showCompletion(this.stateManager.editorState, "")
        }
    }

    async onPartialAccept(e: KeyboardEvent) {
        e.preventDefault()
        e.stopImmediatePropagation()
        this.stateManager.partialAccept()
    }

    async onKeyUp(e: KeyboardEvent) {

        const modifierKeyPressed = e.ctrlKey || e.altKey || e.metaKey
        let currentEditorState = this.stateManager.editorState
        if (REJECT_KEYCODES.includes(e.keyCode)) {
            this.stateManager.showCompletion(currentEditorState, "")
            return
        }

        // If there is no completion, then make request.
        if(!IGNORE_KEYCODES.includes(e.keyCode) && !modifierKeyPressed) {
            await this.fetchAndShowCompletionsThrottler.request()
        }
    }

    private async _fetchAndShowCompletions() {
        let that = this
        let currentEditorState = that.stateManager.editorState
        if(currentEditorState.completion) {
            return
        }
        let completion = await that.predictionManager.fetchCompletions(currentEditorState.query, that.stateManager.events)

        // Check if there is a completion already
        if(!that.stateManager.editorState.completion) {
            that.stateManager.showCompletion(currentEditorState, completion)
            return completion
        }
    }
}
