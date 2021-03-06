import {TypeGenieEventBinder} from "./event_binder";
import FroalaStateManager, {FroalaEditorV2toV3} from "./state_managers/froala";
import UserAPI from "./api";
import {HTML} from "./definitions/froala";


function froala_v2_binding() {
    // Monkey patching for Froala v2
    let _jQuery = window.jQuery || window.$
    if(_jQuery) {
        var _froalaEditor = _jQuery.prototype.froalaEditor;
        _jQuery.prototype.froalaEditor = function () {
            var returnValue = _froalaEditor.apply(this, arguments);
            this.froalaEditor.el =  this
            this.froalaEditor.connect_typegenie = function (apiClient: UserAPI, eventsCallback: Function) {
                let editor = new FroalaEditorV2toV3(this.el)
                let stateManager = new FroalaStateManager(eventsCallback, editor)
                new TypeGenieEventBinder(stateManager, apiClient)
            }
            return returnValue;
        }
        window.jQuery = _jQuery
        window.$ = _jQuery
    }
}

function froala_v3_binding() {
    // Monkey patching for Froala v3
    if(window.FroalaEditor) {
        class _FroalaEditor extends window.FroalaEditor {
            public connect_typegenie: Function
            public html: HTML
            public el: HTMLElement
            constructor(...args: any[]) {
                super(...args);
                let that = this
                this.connect_typegenie = function (apiClient: UserAPI, eventsCallback: Function) {
                    let stateManager = new FroalaStateManager(eventsCallback, that)
                    new TypeGenieEventBinder(stateManager, apiClient)
                }
            }
        }
        window.FroalaEditor = _FroalaEditor
    }
}
froala_v2_binding()
froala_v3_binding()

module.exports = {
    UserAPI: UserAPI
}
