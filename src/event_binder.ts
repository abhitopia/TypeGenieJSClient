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
    private keyUpHandlers: {[name: string]: [Function, Function]}
    private keyDownHandlers: {[name: string]: [Function, Function]}

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

    addKeyUpBind(key: number, modifierKeys: Array<ModifierKeys>, preventDefaultCallback: Function, handler: Function) {
        let keyStr = this._makeKeyStr(key, modifierKeys)
        this.keyUpHandlers[keyStr] = [handler, preventDefaultCallback]
    }

    addKeyDownBind(key: number, modifierKeys: Array<ModifierKeys>, preventDefaultCallback: Function, handler: Function) {
        let keyStr = this._makeKeyStr(key, modifierKeys)
        this.keyDownHandlers[keyStr] = [handler, preventDefaultCallback]
    }

    addEventHandler(eventName: string, handler: Function) {
        this.el.addEventListener(eventName, (e) => {handler(e)})
    }

    keyEventHandler(e: KeyboardEvent) {
        let keyStr = this._makeKeyStrFromKeyBoardEvent(e)
        let keyEventHandlers: {[name: string]: [Function, Function]} = {}
        if(e.type === "keyup") {
            keyEventHandlers = this.keyUpHandlers
        } else if (e.type === "keydown") {
            keyEventHandlers = this.keyDownHandlers
        }

        let keyEventHandler
        if(keyEventHandlers[keyStr]) {
           keyEventHandler  = keyEventHandlers[keyStr]
        } else if(keyEventHandlers[DEFAULT.toString()]) {
            keyEventHandler = keyEventHandlers[DEFAULT.toString()]
        }
        if(keyEventHandler) {
            let handler: Function = keyEventHandler[0]
            let preventDefaultCallback: Function = keyEventHandler[1]
            if(preventDefaultCallback(e.key, e.keyCode)) {
                e.preventDefault()
                e.stopImmediatePropagation()
            }
            handler(e.key, e.keyCode)
        }
    }
}


export class TypeGenieEventBinder {
    public predictionManager: PredictionManager
    public eventBinder: EventBinder
    public fetchAndShowCompletionsThrottler: Throttler
    constructor(public stateManager: StateManager, apiClient: UserAPIClient) {
        let that = this
        this.predictionManager = new PredictionManager(apiClient)
        this.predictionManager.createSession()

        // Bind the functions.
        this.onAccept = this.onAccept.bind(this)
        this.onTypingKeystroke = this.onTypingKeystroke.bind(this)
        this.onPartialAccept = this.onPartialAccept.bind(this)
        this.onQueryChange = this.onQueryChange.bind(this)
        this._fetchAndShowCompletions = this._fetchAndShowCompletions.bind(this)
        this.fetchAndShowCompletionsThrottler = new Throttler(this._fetchAndShowCompletions, 5000)
        this.onRemoveCompletion = this.onRemoveCompletion.bind(this)

        this.eventBinder = new EventBinder(this.stateManager.getScope())

        // Add keyboard events
        this.eventBinder.addKeyDownBind(KeyEnum.TAB, [], function (key: string, keyCode: number) {return true}, this.onAccept)
        this.eventBinder.addKeyDownBind(KeyEnum.TAB, [ModifierKeys.Shift], function (key: string, keyCode: number) {return true}, this.onPartialAccept)
        this.eventBinder.addKeyDownBind(KeyEnum.RIGHT_ARROW, [], function (key: string, keyCode: number) {return true}, this.onAccept)
        this.eventBinder.addKeyDownBind(KeyEnum.RIGHT_ARROW, [ModifierKeys.Shift], function (key: string, keyCode: number) {return true}, this.onPartialAccept)
        this.eventBinder.addKeyDownBind(DEFAULT, [], function (key: string, keyCode: number) {
            let completion = this.stateManager.editorState.completion

            // Overtyping.
            if (completion && key === completion[0] || (completion[0] === "\u00A0" && keyCode === KeyEnum.SPACE)) {
                return true
            } else {
                return false
            }
        }, this.onTypingKeystroke)
        this.eventBinder.addKeyUpBind(DEFAULT, [], function (){return false}, this.onQueryChange)

        // Add javascript events other than keyboard events.
        this.eventBinder.addEventHandler("click", this.onRemoveCompletion)
        this.eventBinder.addEventHandler("focusin", this.onRemoveCompletion)
        this.eventBinder.addEventHandler("focusout", this.onRemoveCompletion)
    }

    async onRemoveCompletion(key: string, keyCode: number) {
        let editorState = this.stateManager.editorState
        this.stateManager.showCompletion(editorState, "")
    }

    async onAccept(key: string, keyCode: number) {
        this.stateManager.accept()
    }

    async onTypingKeystroke(key: string, keyCode: number) {
        let completion = this.stateManager.editorState.completion

        // Overtyping.
        if (completion && key === completion[0] || (completion[0] === "\u00A0" && keyCode === KeyEnum.SPACE)) {
            this.stateManager.acceptFirstChar()
        } else if (!IGNORE_KEYCODES.includes(keyCode)) {
            this.stateManager.showCompletion(this.stateManager.editorState, "")
        }
    }

    async onPartialAccept(key: string, keyCode: number) {
        this.stateManager.partialAccept()
    }

    async onQueryChange(key: string, keyCode: number) {
        let currentEditorState = this.stateManager.editorState
        if (REJECT_KEYCODES.includes(keyCode)) {
            this.stateManager.showCompletion(currentEditorState, "")
            return
        }

        // If there is no completion, then make request.
        if(!IGNORE_KEYCODES.includes(keyCode)) {
            await this.fetchAndShowCompletionsThrottler.call()
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
