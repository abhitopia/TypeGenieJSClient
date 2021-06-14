import {TypeGenieEventBinder} from "./event_binder";
import FroalaStateManager, {FroalaEditorV2toV3} from "./state_managers/froala";
import UserAPI from "./api";
import {HTML} from "./definitions/froala";
import {TypeGenieTelemetryBuffer} from "./telemetry/telemetry_buffer";
// import {} from "textversionjs";
const textversionjs = require("textversionjs");


function froala_v2_binding() {
    // Monkey patching for Froala v2
    let _jQuery = window.jQuery || window.$
    if(_jQuery) {
        var _froalaEditor = _jQuery.prototype.froalaEditor;
        _jQuery.prototype.froalaEditor = function () {
            var returnValue = _froalaEditor.apply(this, arguments);
            this.froalaEditor.el =  this
            this.froalaEditor.connect_typegenie = function (apiClient: UserAPI, eventsCallback: Function) {
                console.log('Running connect_typegenie on v2');
                let editor = new FroalaEditorV2toV3(this.el)
                let telemetryBuffer = new TypeGenieTelemetryBuffer(editor, ()=> processContent(this.froalaEditor.html.get()));
                let stateManager = new FroalaStateManager(eventsCallback, editor);
                new TypeGenieEventBinder(stateManager, apiClient, telemetryBuffer);
            }
            return returnValue;
        }
        window.jQuery = _jQuery
        window.$ = _jQuery
    }
}

const froala_content_processor = (content: string) : string => {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(content, 'text/html');
    const completionChild = htmlDoc.getElementsByTagName('span');
    for(let index = 0; index < completionChild.length; index++) {
        completionChild[index].parentNode.removeChild(completionChild[index]);
    }
    return htmlDoc.body.innerText;
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
                    let telemetryBuffer = new TypeGenieTelemetryBuffer(that, ()=> froala_content_processor(this.html.get()));
                    let stateManager = new FroalaStateManager(eventsCallback, that)
                    new TypeGenieEventBinder(stateManager, apiClient, telemetryBuffer)
                    telemetryBuffer.startTelemetryReport(5000);
                }
                console.log(this.connect_typegenie);
            }
        }
        window.FroalaEditor = _FroalaEditor
        console.log(window.FroalaEditor);
    }
}

froala_v2_binding()
froala_v3_binding()

module.exports = {
    UserAPI: UserAPI
}
