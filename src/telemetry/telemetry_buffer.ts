// Interfaces
interface TelemetryEvent  {
    timestamp : number,
    action: TypeGenieTelemetryBuffer.Action,
    value: any
}

interface TypeGenieTelemetryBufferInterface {

    createTelemetryEvent(timestamp: number, action: TypeGenieTelemetryBuffer.Action, value: any) : TelemetryEvent;
    addEvent(event: TelemetryEvent) : void;
    removeEvent(index: number) : void;

}



export class TypeGenieTelemetryBuffer implements TypeGenieTelemetryBufferInterface{

    private _events : TelemetryEvent[];

    get events() {
        return this._events;
    }

    set events(value : TelemetryEvent[]) {
        this._events = value;
    }

    constructor() {
        this.events = [];
        console.log('Initializing TipeGenieTelemetryBuffer')
    }

    addEvent(event: TelemetryEvent): void {
        this._events.push(event)
    }

    removeEvent(index: number): void {
        this._events.slice(index,1)
    }

    clearEvents(): void {
        this.events = [];
    }

    createTelemetryEvent(timestamp: number, action: TypeGenieTelemetryBuffer.Action, value: any): TelemetryEvent {

        return  {
            action: action,
            timestamp: timestamp,
            value: value
            }
        }

     startTelemetryReport(interval: number) {
        const context = this;
        setInterval(() => {
            if(context.events.length > 0) {
                console.log('Will report: ', context.events);
                context.clearEvents();
            } else {
                console.log('No events to report');
            }
        }, interval)
     }

}


// Namespace for actions
export namespace TypeGenieTelemetryBuffer {
    export enum Action {
        ACCEPT_FIRST_CHAR,
        ACCEPT_PARTIAL_COMPLETION,
        ACCEPT_COMPLETION,
        FETCH_COMPLETION
    }
}