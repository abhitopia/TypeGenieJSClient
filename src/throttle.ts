class Throttler {
    private lastRequestedAt:number
    private requestThrottled:boolean
    private _requestPending:boolean

    constructor(public requestCallback: Function, public timeout: number) {}

    get requestPending() {
        // forcefully set the this._requestPending to false after timeout period
        if (!this.lastRequestedAt || Date.now() - this.lastRequestedAt > this.timeout) {
            this._requestPending = false
        }
        return this._requestPending
    }

    set requestPending(value) {
        this._requestPending = value
    }

    async request() {
        if (this.requestPending) {
            this.requestThrottled = true
            return
        }

        let response = null
        try {
            this.lastRequestedAt = Date.now()
            this.requestPending = true
            response = await this.requestCallback()
        } finally {
            this.requestPending = false
            if(this.requestThrottled) {
                this.requestCallback()
            }
            return response
        }
    }
}
