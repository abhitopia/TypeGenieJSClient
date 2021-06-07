import {IEvent} from "./state_managers/base";


class API {
    public headers: {[name: string]: string}
    public commonPrefix: string
    constructor () {
        this.headers = {
            'Content-type': 'application/json',
            'Accept': 'application/json'
        }
        this.commonPrefix = ""
    }

    get baseUrl() {
        if(window.TYPEGENIE_API_URL) {
            return window.TYPEGENIE_API_URL
        } else {
            return "https://api.typegenie.net"
        }
    }

    _getUrl(end_point: string) {
        return `${this.baseUrl}${this.commonPrefix}${end_point}`
    }

    async _request(url: string, options: {[name: string]: any}) {
        let res = await fetch(url, options)
        let responseJson = await res.clone().json()
        if(responseJson["error"]) {
            throw new Error(responseJson["error"])
        }
        return res
    }

    protected async get(endpoint: string) {
        let url = this._getUrl(endpoint)
        return await this._request(url, {
            "method": "GET",
            "headers": this.headers
        })
    }

    protected async delete(endpoint: string) {
        let url = this._getUrl(endpoint)
        return await this._request(url, {
            "method": "DELETE",
            "headers": this.headers
        })
    }

    protected async post(endpoint: string, json: {[name: string]: any}) {
        let url = this._getUrl(endpoint)
        return await this._request(url, {
            "method": "POST",
            "body": JSON.stringify(json),
            "headers": this.headers
        })
    }

    protected async put(endpoint: string, json: {[name: string]: any}) {
        let url = this._getUrl(endpoint)
        return await this._request(url, {"method": "PUT", body: JSON.stringify(json)})
    }
}

export default class UserAPI extends API {
    constructor(token: string) {
        super()
        this.commonPrefix = "/api/v1/user"
        this.headers["Authorization"] = `Bearer: ${token}`

        this.renewToken = this.renewToken.bind(this)
        this.renewTokenPeriodically()
    }

    async info(): Promise<Response> {
        return await this.get("")
    }

    async createSession(): Promise<Response> {
        return await this.post("/session", {})
    }

    async getCompletions(sessionId: string, query: string, events: Array<IEvent>) {
        let payload = {'query': query, 'events': events}
        return await this.post(`/session/${sessionId}/completions`, payload)
    }

    private async renewTokenPeriodically() {
        let response = await this.renewToken()
        let responseJSON = await response.json()
        let expiryDateStr = responseJSON["result"]["expires_at"] as string
        let expiryDateInMs = Date.parse(expiryDateStr)

        // Renew 5 mins before the token gets expired.
        let runIn = expiryDateInMs - new Date().getTime() - 5 * 60 * 1000
        setInterval(this.renewToken, runIn)
    }

    async renewToken() {
        let response = await this.get(`/renew`)
        let responseJSON = await response.clone().json()
        this.headers["Authorization"] = `Bearer: ${responseJSON["result"]["token"]}`
        return response
    }
}
