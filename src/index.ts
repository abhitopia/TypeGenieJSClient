import {TypeGenieEventBinder} from "./event_binder";
import {IEvent} from "./state_managers/base";
import FroalaStateManager from "./state_managers/froala";
import UserAPIClient from "./api";
import {FroalaEditor} from "./definitions/froala";
import main from "../monkeypatching"

main()

let bind_typegenie = function (editor: FroalaEditor, token: string, eventsCallback: Function) {
    let stateManager = new FroalaStateManager(eventsCallback, editor)
    let apiClient = new UserAPIClient(token)
    new TypeGenieEventBinder(stateManager, apiClient)
}

module.exports = bind_typegenie
