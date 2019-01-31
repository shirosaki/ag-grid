// Type definitions for ag-grid v18.0.1
// Project: http://www.ag-grid.com/
// Definitions by: Niall Crosby <https://github.com/ag-grid/>
import { Component } from "../widgets/component";
import { DropTarget } from "../dragAndDrop/dragAndDropService";
import { IComponent } from "../interfaces/iComponent";
export declare enum HeaderRowType {
    COLUMN_GROUP = 0,
    COLUMN = 1,
    FLOATING_FILTER = 2
}
export declare class HeaderRowComp extends Component {
    private gridOptionsWrapper;
    private gridApi;
    private columnController;
    private context;
    private eventService;
    private filterManager;
    private componentRecipes;
    private dept;
    private pinned;
    private headerComps;
    private dropTarget;
    private type;
    constructor(dept: number, type: HeaderRowType, pinned: string, dropTarget: DropTarget);
    forEachHeaderElement(callback: (comp: IComponent<any>) => void): void;
    destroy(): void;
    private removeAndDestroyChildComponents;
    private onRowHeightChanged;
    private init;
    private onColumnResized;
    private setWidth;
    private onGridColumnsChanged;
    private removeAndDestroyAllChildComponents;
    private onDisplayedColumnsChanged;
    private onVirtualColumnsChanged;
    private createHeaderComp;
    private createFloatingFilterWrapper;
    private createFloatingFilterParams;
}
