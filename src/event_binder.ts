import StateManager from "./state_managers/base";
import UserAPIClient from "./api";
import PredictionManager from "./prediction_manager";
import {KeyEnum, MODIFIER_KEYCODES} from "./constants";

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
            keyEventHandlers[keyStr]()
        } else if(keyEventHandlers[DEFAULT.toString()]) {
            keyEventHandlers[DEFAULT.toString()]()
        }
    }
}


export class TypeGenieEventBinder {
    public predictionManager: PredictionManager
    public eventBinder: EventBinder
    constructor(public stateManager: StateManager, apiClient: UserAPIClient) {
        this.predictionManager = new PredictionManager(apiClient)

        // Bind the functions.


        // Use binder config to allow reconfigurable bindings.
        // Allowing developer to change key bindings,
        // Or even enable/disable features such as partial accept
        this.eventBinder = new EventBinder(this.stateManager.getScope())
        this.eventBinder.addKeyUpBind(KeyEnum.TAB, [], this.onAccept)
        this.eventBinder.addKeyUpBind(KeyEnum.TAB, [ModifierKeys.Shift], this.onPartialAccept)
        this.eventBinder.addKeyUpBind(DEFAULT, [], this.onTypingKeystroke)
    }

    async onAccept(e: KeyboardEvent) {
        this.stateManager.accept()
        //await this.on_context_update(this.stateManager.editorState)
    }

    async onTypingKeystroke(e: KeyboardEvent) {
        this.stateManager.typingKeyStroke(e.char)
        await this.makeCompletionRequest()
    }

    async onPartialAccept(e: KeyboardEvent) {
        this.stateManager.partialAccept()
        // await this.on_context_update(this.stateManager.editorState)
    }

    private async makeCompletionRequest() {
        let currentEditorState = this.stateManager.editorState

        // If there is no completion, then make request.
        if(!currentEditorState.completion && currentEditorState.query) {
            let completion = await this.predictionManager.fetchCompletions(currentEditorState.query, this.stateManager.events)
            this.stateManager.showCompletion(currentEditorState, completion)
        }
    }
}
