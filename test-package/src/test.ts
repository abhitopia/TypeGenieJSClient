import { IEvent } from './../../src/state_managers/base';
import {UserAPI} from "typegeniejs"

window.TYPEGENIE_API_URL = "https://staging-api.typegenie.net"


class CustomUserAPI extends UserAPI {

    async createSession() : Promise<Response> {
        const dummy_api = 'http://localhost:3000';
        const headers = new Headers();
        headers.append("Content-Type", "application/json");
        return await fetch(dummy_api + '/session', {headers: headers});
    }

    async getCompletions(sessionId: string, query: string, events: Array<IEvent>) {
        let payload = {'query': query, 'events': events}
        const dummy_api = 'http://localhost:3000';
        const headers = new Headers();
        headers.append("Content-Type", "application/json");
        return await fetch(dummy_api, {headers: headers});
    }
}


function fetchEvents() : [] {
    return []
}

async function generateToken() {

    let res = await fetch("https://staging-api.typegenie.net/api/v1/account/deployment/abccorp1-email/token", {
        headers: new Headers({
            "Authorization": `Basic ${btoa(`renato:g9mU6YUaAEQu93fA`)}`
        })
    })
    let resJson = await res.json()
    let deploymentAPIToken = resJson["result"]["token"]

    res = await fetch("https://staging-api.typegenie.net/api/v1/deployment/user/test_user/token", {
        headers: new Headers({
            "Authorization": `Bearer: ${deploymentAPIToken}`
        })
    })
    resJson = await res.json()
    let userAPIToken = resJson["result"]["token"]
    return userAPIToken
}

async function main() {
    let userAPIClient = new CustomUserAPI(await generateToken())
    let el : any = $("#test-textarea")
    el.froalaEditor()
    let editor = el.froalaEditor
    console.log('Will connect typegenie to editor: ', editor);
    editor.connect_typegenie(userAPIClient, fetchEvents)
    console.log('Run complete');
}


async function main_v3() {
    let userAPIClient = new CustomUserAPI(await generateToken())
    let editor = new window.FroalaEditor("#test-textarea")
    console.log("Running main_v3 updated2");
    try{
        editor.connect_typegenie(userAPIClient, fetchEvents);
    } catch (e) {
        console.log('Error: ', e);
    }
}


jQuery(document).ready(async function () {
    console.log("DOCUMENT")
    debugger
    await main_v3()
})
