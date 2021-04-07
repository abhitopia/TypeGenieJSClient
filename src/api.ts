import {IEvent} from "./state_managers/base";


class APIHelper {
    public headers: {[name: string]: string}
    public commonPrefix: string

    constructor(commonPrefix: string, headers: {[name: string]: any}) {
        if(headers) {
            this.headers = headers
        } else {
            this.headers = {
                'Content-type': 'application/json',
                'Accept': 'application/json'
            }
        }
        this.commonPrefix = commonPrefix
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
        let responseJson = await res.json()
        if(responseJson["error"]) {
            throw new Error(responseJson["error"])
        }
        return res
    }

    async get(endpoint: string) {
        let url = this._getUrl(endpoint)
        return await this._request(url, {"method": "GET"})
    }

    async delete(endpoint: string) {
        let url = this._getUrl(endpoint)
        return await this._request(url, {"method": "DELETE"})
    }

    async post(endpoint: string, json: {[name: string]: any}) {
        let url = this._getUrl(endpoint)
        return await this._request(url, {"method": "POST", body: JSON.stringify(json)})
    }

    async put(endpoint: string, json: {[name: string]: any}) {
        let url = this._getUrl(endpoint)
        return await this._request(url, {"method": "PUT", body: JSON.stringify(json)})
    }
}

export default class UserAPIClient {
    public apiHelper: APIHelper
    constructor(token: string) {
        let headers: {[name: string]: string} = {
            'Content-type': 'application/json',
            'Accept': 'application/json',
            "Authorization": `Bearer: ${token}`
        }
        this.apiHelper = new APIHelper("/user/session", headers)
    }

    async info() {
        return await this.apiHelper.get("")
    }

    async createSession(): Promise<Response> {
        return await this.apiHelper.post("/user/session", {})
    }

    async getCompletions(sessionId: string, query: string, events: Array<IEvent>) {
        let payload = {'query': query, 'events': events}
        return await this.apiHelper.post(`/user/session/${sessionId}/completions`, payload)
    }
}
