import {MODIFIER_KEYCODES} from "../constants";

export enum ModifierKeys {
    Alt,
    AltGraph,
    Control,
    Meta,
    Shift
}

export const DEFAULT = -1

export default class BrowserEventBinder {
    private keyUpHandlers: {[name: string]: [Function, Function, Function]}
    private keyDownHandlers: {[name: string]: [Function, Function, Function]}

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

    addKeyUpBind(key: number, modifierKeys: Array<ModifierKeys>, preventEventPropagation: Function,handler: Function, preventHandleTrigger: Function = () => false ) {
        let keyStr = this._makeKeyStr(key, modifierKeys)
        this.keyUpHandlers[keyStr] = [handler, preventEventPropagation, preventHandleTrigger]
    }

    addKeyDownBind(key: number, modifierKeys: Array<ModifierKeys>, preventEventPropagation: Function,handler: Function, preventHandleTrigger: Function = () => false  ) {
        let keyStr = this._makeKeyStr(key, modifierKeys)
        this.keyDownHandlers[keyStr] = [handler, preventEventPropagation, preventHandleTrigger]
    }

    addEventHandler(eventName: string, handler: Function) {
        this.el.addEventListener(eventName, (e) => {handler(e)})
    }

    keyEventHandler(e: KeyboardEvent) {
        let keyStr = this._makeKeyStrFromKeyBoardEvent(e)
        let keyEventHandlers: {[name: string]: [Function, Function, Function]} = {}
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
            let preventEventPropagation: Function = keyEventHandler[1]
            let preventHandleTrigger = keyEventHandler[2]
            if(preventEventPropagation(e.key, e.keyCode)) {
                e.preventDefault()
                e.stopImmediatePropagation()
            }
            if(!preventHandleTrigger(e)) {
                handler(e.key, e.keyCode)
            }
        }
    }
}
