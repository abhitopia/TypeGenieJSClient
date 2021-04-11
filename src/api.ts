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
        let responseJson = await res.clone().json()
        if(responseJson["error"]) {
            throw new Error(responseJson["error"])
        }
        return res
    }

    async get(endpoint: string) {
        let url = this._getUrl(endpoint)
        return await this._request(url, {
            "method": "GET",
            "headers": this.headers
        })
    }

    async delete(endpoint: string) {
        let url = this._getUrl(endpoint)
        return await this._request(url, {
            "method": "DELETE",
            "headers": this.headers
        })
    }

    async post(endpoint: string, json: {[name: string]: any}) {
        let url = this._getUrl(endpoint)
        return await this._request(url, {
            "method": "POST",
            "body": JSON.stringify(json),
            "headers": this.headers
        })
    }

    async put(endpoint: string, json: {[name: string]: any}) {
        let url = this._getUrl(endpoint)
        return await this._request(url, {"method": "PUT", body: JSON.stringify(json)})
    }
}

export default class UserAPIClient {
    public apiHelper: APIHelper
    private renewTokenAPIHelper: APIHelper
    private _token: string
    constructor(token: string) {
        let headers: {[name: string]: string} = {
            'Content-type': 'application/json',
            'Accept': 'application/json',
            "Authorization": `Bearer: ${token}`
        }
        this.apiHelper = new APIHelper("/api/v1/user/session", headers)
        this.renewTokenAPIHelper = new APIHelper("/api/v1/deployment/user", headers)
        this._token = token

        this.renewToken = this.renewToken.bind(this)
        setInterval(this.renewToken, 60*60*30*1000)
    }

    set token(value: string) {
        let headers = {
            'Content-type': 'application/json',
            'Accept': 'application/json',
            "Authorization": `Bearer: ${value}`
        }
        this.apiHelper.headers = headers
        this.renewTokenAPIHelper.headers = headers
    }

    async info(): Promise<Response> {
        return await this.apiHelper.get("")
    }

    async createSession(): Promise<Response> {
        return await this.apiHelper.post("", {})
    }

    async getCompletions(sessionId: string, query: string, events: Array<IEvent>) {
        let payload = {'query': query, 'events': events}
        return await this.apiHelper.post(`/${sessionId}/completions`, payload)
    }

    async renewToken() {
        let response = await this.info()
        let responseJSON = await response.json()
        response = await this.renewTokenAPIHelper.get(`/${responseJSON["result"]['userId']}/token`)
        responseJSON = await response.json()
        this.token = responseJSON["result"]["token"]
    }
}
