import Throttler from "./utils/throttle";
import PredictionManager from "./prediction_manager";
import BrowserEventBinder, {DEFAULT, ModifierKeys} from "./utils/browser_event_binder";
import StateManager from "./state_managers/base";
import UserAPI from "./api";
import {IGNORE_KEYCODES, KeyEnum, REJECT_KEYCODES} from "./constants";


export class TypeGenieEventBinder {
    public predictionManager: PredictionManager
    public eventBinder: BrowserEventBinder
    public fetchAndShowCompletionsThrottler: Throttler
    constructor(public stateManager: StateManager, apiClient: UserAPI) {
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

        this.eventBinder = new BrowserEventBinder(this.stateManager.getScope())

        // Add keyboard events

        this.eventBinder.addKeyDownBind(KeyEnum.TAB, [], function (key: string, keyCode: number) {return true}, this.onAccept)
        this.eventBinder.addKeyDownBind(KeyEnum.TAB, [ModifierKeys.Shift], function (key: string, keyCode: number) {return true}, this.onPartialAccept)
        this.eventBinder.addKeyDownBind(KeyEnum.RIGHT_ARROW, [], function (key: string, keyCode: number) {return true}, this.onAccept)
        this.eventBinder.addKeyDownBind(KeyEnum.RIGHT_ARROW, [ModifierKeys.Shift], function (key: string, keyCode: number) {return true}, this.onPartialAccept)

        this.eventBinder.addKeyDownBind(DEFAULT, [], function (key: string, keyCode: number) {
            let completion = that.stateManager.editorState.completion

            // Overtyping.
            if (completion && key === completion[0] || (completion[0] === "\u00A0" && keyCode === KeyEnum.SPACE)) {
                return true
            } else {
                return false
            }
        }, this.onTypingKeystroke)

        // TODO Check: First approach, addKeyUpBind for DEFAULT with ctrl as modifier, preventing further event propagation ---> This does not work as I expected (DEFAULT does not work with Modifiers?)
        // this.eventBinder.addKeyUpBind(DEFAULT,[ModifierKeys.Control], function (key:string, keyCode: number){return true}, ()=>{console.log('Triggered keyUp with control')})

        // New implementation, with preventHandleTrigger callback
        this.eventBinder.addKeyUpBind(DEFAULT, [], function (key: string, keyCode: number){return false}, this.onQueryChange, function (e: KeyboardEvent) {
            // Dont let callback run if modifier key is pressed on keyup
            if(e.ctrlKey)
                return true;
        })

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
