import Throttler from "./utils/throttle";
import PredictionManager from "./prediction_manager";
import BrowserEventBinder, {DEFAULT, ModifierKeys} from "./utils/browser_event_binder";
import StateManager from "./state_managers/base";
import UserAPI from "./api";
import {IGNORE_KEYCODES, KeyEnum, REJECT_KEYCODES} from "./constants";
import {TypeGenieTelemetryBuffer} from "./telemetry/telemetry_buffer";


export class TypeGenieEventBinder {
    public predictionManager: PredictionManager
    public eventBinder: BrowserEventBinder
    public fetchAndShowCompletionsThrottler: Throttler
    constructor(public stateManager: StateManager, apiClient: UserAPI, public telemetryBuffer: TypeGenieTelemetryBuffer) {
        let that = this
        this.predictionManager = new PredictionManager(apiClient)
        this.predictionManager.createSession()
            .then(() => {
                // Bind sessionId to telemetry
                this.telemetryBuffer.sessionId = this.predictionManager.sessionId;
            })

        // Bind the functions.
        this.onAccept = this.onAccept.bind(this)
        this.onTypingKeystroke = this.onTypingKeystroke.bind(this)
        this.onPartialAccept = this.onPartialAccept.bind(this)
        this.onQueryChange = this.onQueryChange.bind(this)
        this._fetchAndShowCompletions = this._fetchAndShowCompletions.bind(this)
        this.fetchAndShowCompletionsThrottler = new Throttler(this._fetchAndShowCompletions, 5000)
        this.onRemoveCompletion = this.onRemoveCompletion.bind(this)

        //Bind telemetry event
        this.telemetryBuffer.updateEditorStateHistory = this.telemetryBuffer.updateEditorStateHistory.bind(this.telemetryBuffer);

        this.eventBinder = new BrowserEventBinder(this.stateManager.getScope())

        // Add keyboard events
        this.eventBinder.addKeyDownBind(KeyEnum.TAB, [], () => true, this.onAccept, this.telemetryBuffer.updateEditorStateHistory)
        this.eventBinder.addKeyDownBind(KeyEnum.TAB, [ModifierKeys.Shift], () => true, this.onPartialAccept, this.telemetryBuffer.updateEditorStateHistory)
        this.eventBinder.addKeyDownBind(KeyEnum.RIGHT_ARROW, [], () => true, this.onAccept, this.telemetryBuffer.updateEditorStateHistory)
        this.eventBinder.addKeyDownBind(KeyEnum.RIGHT_ARROW, [ModifierKeys.Shift], () => true, this.onPartialAccept, this.telemetryBuffer.updateEditorStateHistory)
        this.eventBinder.addKeyDownBind(DEFAULT, [],  (key: string, keyCode: number) => {
            let completion = that.stateManager.editorState.completion
            // Overtyping.
            return (completion && key === completion[0] || (completion[0] === "\u00A0" && keyCode === KeyEnum.SPACE)) ? true : false
        }, this.onTypingKeystroke, this.telemetryBuffer.updateEditorStateHistory);
        this.eventBinder.addKeyUpBind(DEFAULT, [], () => false, this.onQueryChange)

        // Add javascript events other than keyboard events.
        this.eventBinder.addEventHandler("click", this.onRemoveCompletion)
        this.eventBinder.addEventHandler("focusin", this.onRemoveCompletion)
        this.eventBinder.addEventHandler("focusout", this.onRemoveCompletion)
    }

    async onRemoveCompletion() {
        let editorState = this.stateManager.editorState
        this.stateManager.showCompletion(editorState, "")
    }

    async onAccept() {
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

    async onPartialAccept() {
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
        // Record completion request moment
        that.telemetryBuffer.completionRequested();
        let completion = await that.predictionManager.fetchCompletions(currentEditorState.query, that.stateManager.events)
        // Record moment of completion arrival
        that.telemetryBuffer.completionReturned(completion);
        // Check if there is a completion already
        if(!that.stateManager.editorState.completion) {
            that.stateManager.showCompletion(currentEditorState, completion)

            that.telemetryBuffer.completionShown();
            return completion
        }
    }
}
