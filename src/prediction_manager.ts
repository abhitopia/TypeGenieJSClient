import UserAPIClient from "./api";
import {IEvent} from "./state_managers/base";

interface CompletionsResponse {
    result: Array<string>
    error: string
}

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
        let response = await that.apiClient.getCompletions(that.sessionId, query, events)
        let completions = (await response.json() as CompletionsResponse)["result"]

        // For now, let's take the first completion
        let completion = completions[0]
        return completion
    }
}
