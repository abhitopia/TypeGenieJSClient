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
            return "http://api.typegenie.net"
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
        this.commonPrefix = "/api/v1/user/session"
        this.headers["Authorization"] = `Bearer: ${token}`

        this.renewToken = this.renewToken.bind(this)

        // Renew every 15 mins.
        setInterval(this.renewToken, 15*60*1000)
    }

    async info(): Promise<Response> {
        return await this.get("")
    }

    async createSession(): Promise<Response> {
        return await this.post("", {})
    }

    async getCompletions(sessionId: string, query: string, events: Array<IEvent>) {
        let payload = {'query': query, 'events': events}
        return await this.post(`/${sessionId}/completions`, payload)
    }

    async renewToken() {
        let response = await this.get(`/renew`)
        let responseJSON = await response.json()
        this.headers["Authorization"] = `Bearer: ${responseJSON["result"]["token"]}`
    }
}
