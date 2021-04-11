import {v4, v4 as uuidv4} from "uuid"

export default class Throttler {
    private lastCalledAt:number
    private callThrottled:boolean
    private _callPending:boolean

    constructor(public callback: Function, public timeout: number) {}

    get callPending() {
        // forcefully set the this._requestPending to false after timeout period
        if (!this.lastCalledAt || Date.now() - this.lastCalledAt > this.timeout) {
            this._callPending = false
        }
        return this._callPending
    }

    set callPending(value) {
        this._callPending = value
    }

    async call() {
        if (this.callPending) {
            this.callThrottled = true
            return
        }

        let response = null
        try {
            this.lastCalledAt = Date.now()
            this.callPending = true
            let i = v4()
            response = await this.callback()
        } finally {
            this.callPending = false
            if(this.callThrottled) {
                this.callThrottled = false
                await this.callback()
            }
            return response
        }
    }
}
