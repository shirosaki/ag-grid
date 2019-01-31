// Type definitions for ag-grid v18.0.1
// Project: http://www.ag-grid.com/
// Definitions by: Niall Crosby <https://github.com/ag-grid/>
import { LoggerFactory } from "./logger";
import { IEventEmitter } from "./interfaces/iEventEmitter";
import { GridOptionsWrapper } from "./gridOptionsWrapper";
import { AgEvent } from "./events";
export declare class EventService implements IEventEmitter {
    private allSyncListeners;
    private allAsyncListeners;
    private globalSyncListeners;
    private globalAsyncListeners;
    private logger;
    private asyncFunctionsQueue;
    private scheduled;
    private static PRIORITY;
    setBeans(loggerFactory: LoggerFactory, gridOptionsWrapper: GridOptionsWrapper, globalEventListener?: Function): void;
    private getListenerList;
    addEventListener(eventType: string, listener: Function, async?: boolean): void;
    addModalPriorityEventListener(eventType: string, listener: Function, async?: boolean): void;
    addGlobalListener(listener: Function, async?: boolean): void;
    removeEventListener(eventType: string, listener: Function, async?: boolean): void;
    removeGlobalListener(listener: Function, async?: boolean): void;
    dispatchEvent(event: AgEvent): void;
    private dispatchToListeners;
    private dispatchAsync;
    private flushAsyncQueue;
}
