import UserAPIClient from "./api";
import {IEvent} from "./state_managers/base";

export default class PredictionManager {
    public sessionId: string
    constructor(public apiClient: UserAPIClient) {
        this.apiClient = apiClient
        this.fetchCompletions = this.fetchCompletions.bind(this)
        this.sessionId = null
    }

    async createSession() {
        let response = await this.apiClient.createSession()
        let responseJson = await response.json()
        this.sessionId = responseJson["result"]
    }

    async fetchCompletions(query: string, events: Array<IEvent>): Promise<string> {
        let that = this
        async function _requestCompletions() {
            let response = await that.apiClient.getCompletions(that.sessionId, query, events)
            let completions = await response.json()

            // For now, let's take the first completion
            let completion = completions[0]
            return completion
        }
        return await new Throttler(_requestCompletions, 20).request()
    }
}
