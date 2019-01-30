import {Utils as _} from "../utils";
import { observeResize } from "../resizeObserver";
import {GridOptionsWrapper} from "../gridOptionsWrapper";
import {ColumnController} from "../columnController/columnController";
import {ColumnApi} from "../columnController/columnApi";
import {RowRenderer} from "../rendering/rowRenderer";
import {
    Bean,
    Autowired,
    PostConstruct,
    Optional,
    PreDestroy,
    Context,
    PreConstruct
} from "../context/context";
import {EventService} from "../eventService";
import {BodyHeightChangedEvent, BodyScrollEvent, Events} from "../events";
import {DragService, DragListenerParams} from "../dragAndDrop/dragService";
import {IRangeController} from "../interfaces/iRangeController";
import {Constants} from "../constants";
import {SelectionController} from "../selectionController";
import {CsvCreator} from "../csvCreator";
import {MouseEventService} from "./mouseEventService";
import {IClipboardService} from "../interfaces/iClipboardService";
import {FocusedCellController} from "../focusedCellController";
import {IContextMenuFactory} from "../interfaces/iContextMenuFactory";
import {SetScrollsVisibleParams, ScrollVisibleService} from "./scrollVisibleService";
import {IFrameworkFactory} from "../interfaces/iFrameworkFactory";
import {Column} from "../entities/column";
import {RowContainerComponent} from "../rendering/rowContainerComponent";
import {RowNode} from "../entities/rowNode";
import {PaginationAutoPageSizeService, PaginationProxy} from "../rowModels/paginationProxy";
import {PopupEditorWrapper} from "../rendering/cellEditors/popupEditorWrapper";
import {AlignedGridsService} from "../alignedGridsService";
import {PinnedRowModel} from "../rowModels/pinnedRowModel";
import {GridApi} from "../gridApi";
import {AnimationFrameService} from "../misc/animationFrameService";
import {RowComp} from "../rendering/rowComp";
import {NavigationService} from "./navigationService";
import {CellComp} from "../rendering/cellComp";
import {ValueService} from "../valueService/valueService";
import {LongTapEvent, TouchListener} from "../widgets/touchListener";
import {ComponentRecipes} from "../components/framework/componentRecipes";
import {DragAndDropService} from "../dragAndDrop/dragAndDropService";
import {RowDragFeature} from "./rowDragFeature";
import {HeightScaler} from "../rendering/heightScaler";
import {IOverlayWrapperComp} from "../rendering/overlays/overlayWrapperComponent";
import {Component} from "../widgets/component";
import {AutoHeightCalculator} from "../rendering/autoHeightCalculator";
import {ColumnAnimationService} from "../rendering/columnAnimationService";
import {AutoWidthCalculator} from "../rendering/autoWidthCalculator";
import {Beans} from "../rendering/beans";
import {RefSelector} from "../widgets/componentAnnotations";
import {HeaderRootComp} from "../headerRendering/headerRootComp";
import { ResizeObserverService } from "../misc/resizeObserverService";

// in the html below, it is important that there are no white space between some of the divs, as if there is white space,
// it won't render correctly in safari, as safari renders white space as a gap
const GRID_PANEL_NORMAL_TEMPLATE =
    `<div class="ag-root ag-font-style" role="grid">
        <ag-header-root ref="headerRoot"></ag-header-root>
        <div class="ag-floating-top" ref="eTop" role="presentation">
            <div class="ag-pinned-left-floating-top" ref="eLeftTop" role="presentation"></div>
            <div class="ag-floating-top-viewport" ref="eTopViewport" role="presentation">
                <div class="ag-floating-top-container" ref="eTopContainer" role="presentation"></div>
            </div>
            <div class="ag-pinned-right-floating-top" ref="eRightTop" role="presentation"></div>
            <div class="ag-floating-top-full-width-container" ref="eTopFullWidthContainer" role="presentation"></div>
        </div>
        <div class="ag-body-viewport" ref="eBodyViewport" role="presentation" unselectable="on">
            <div class="ag-pinned-left-cols-container" ref="eLeftContainer" role="presentation" unselectable="on"></div>
            <div class="ag-center-cols-clipper" ref="eCenterColsClipper">
                <div class="ag-center-cols-viewport" ref="eCenterViewport" role="presentation" unselectable="on">
                    <div class="ag-center-cols-container" ref="eCenterContainer" role="presentation" unselectable="on"></div>
                </div>
            </div>
            <div class="ag-pinned-right-cols-container" ref="eRightContainer" role="presentation" unselectable="on"></div>
            <div class="ag-full-width-container" ref="eFullWidthContainer" role="presentation" unselectable="on"></div>
        </div>
        <div class="ag-floating-bottom" ref="eBottom" role="presentation">
            <div class="ag-pinned-left-floating-bottom" ref="eLeftBottom" role="presentation"></div>
            <div class="ag-floating-bottom-viewport" ref="eBottomViewport" role="presentation">
                <div class="ag-floating-bottom-container" ref="eBottomContainer" role="presentation"></div>
            </div>
            <div class="ag-pinned-right-floating-bottom" ref="eRightBottom" role="presentation"></div>
            <div class="ag-floating-bottom-full-width-container" ref="eBottomFullWidthContainer" role="presentation"></div>
        </div>
        <div class="ag-body-horizontal-scroll" ref="eHorizontalScrollBody">
            <div class="ag-horizontal-left-spacer" ref="eHorizontalLeftSpacer"></div>
            <div class="ag-body-horizontal-scroll-viewport" ref="eBodyHorizontalScrollViewport">
                <div class="ag-body-horizontal-scroll-container" ref="eBodyHorizontalScrollContainer"></div>
            </div>
            <div class="ag-horizontal-right-spacer" ref="eHorizontalRightSpacer"></div>
        </div>
        <div class="ag-overlay" ref="eOverlay"></div>
    </div>`;

export type RowContainerComponentNames =
    'fullWidth' |
    'body' |
    'pinnedLeft' |
    'pinnedRight' |
    'floatingTop' |
    'floatingTopPinnedLeft' |
    'floatingTopPinnedRight' |
    'floatingTopFullWidth' |
    'floatingBottom' |
    'floatingBottomPinnedLeft' |
    'floatingBottomPinnedRight' |
    'floatingBottomFullWith';

export type RowContainerComponents = { [K in RowContainerComponentNames]: RowContainerComponent };

export class GridPanel extends Component {

    @Autowired('alignedGridsService') private alignedGridsService: AlignedGridsService;
    @Autowired('gridOptionsWrapper') private gridOptionsWrapper: GridOptionsWrapper;
    @Autowired('columnController') private columnController: ColumnController;
    @Autowired('rowRenderer') private rowRenderer: RowRenderer;
    @Autowired('pinnedRowModel') private pinnedRowModel: PinnedRowModel;
    @Autowired('eventService') private eventService: EventService;
    @Autowired('context') private context: Context;
    @Autowired('animationFrameService') private animationFrameService: AnimationFrameService;
    @Autowired('navigationService') private navigationService: NavigationService;
    @Autowired('autoHeightCalculator') private autoHeightCalculator: AutoHeightCalculator;
    @Autowired('columnAnimationService') private columnAnimationService: ColumnAnimationService;
    @Autowired('autoWidthCalculator') private autoWidthCalculator: AutoWidthCalculator;
    @Autowired('paginationAutoPageSizeService') private paginationAutoPageSizeService: PaginationAutoPageSizeService;
    @Autowired('beans') private beans: Beans;
    @Autowired('paginationProxy') private paginationProxy: PaginationProxy;
    @Autowired('columnApi') private columnApi: ColumnApi;
    @Autowired('gridApi') private gridApi: GridApi;
    @Autowired('dragService') private dragService: DragService;
    @Autowired('mouseEventService') private mouseEventService: MouseEventService;
    @Autowired('focusedCellController') private focusedCellController: FocusedCellController;
    @Autowired('$scope') private $scope: any;
    @Autowired('scrollVisibleService') private scrollVisibleService: ScrollVisibleService;
    @Autowired('valueService') private valueService: ValueService;
    @Autowired('componentRecipes') private componentRecipes: ComponentRecipes;
    @Autowired('dragAndDropService') private dragAndDropService: DragAndDropService;
    @Autowired('heightScaler') private heightScaler: HeightScaler;
    @Autowired('enterprise') private enterprise: boolean;
    @Autowired('resizeObserverService') private resizeObserverService: ResizeObserverService;

    @Optional('rangeController') private rangeController: IRangeController;
    @Optional('contextMenuFactory') private contextMenuFactory: IContextMenuFactory;
    @Optional('clipboardService') private clipboardService: IClipboardService;

    // @RefSelector('eBody') private eBody: HTMLElement;
    @RefSelector('eBodyViewport') private eBodyViewport: HTMLElement;
    @RefSelector('eCenterContainer') private eCenterContainer: HTMLElement;
    @RefSelector('eCenterViewport') private eCenterViewport: HTMLElement;
    @RefSelector('eLeftContainer') private eLeftContainer: HTMLElement;
    @RefSelector('eRightContainer') private eRightContainer: HTMLElement;
    @RefSelector('eCenterColsClipper') private eCenterColsClipper: HTMLElement;

    // fake horizontal scroller
    @RefSelector('eHorizontalScrollBody') private eHorizontalScrollBody: HTMLElement;
    @RefSelector('eHorizontalLeftSpacer') private eHorizontalLeftSpacer: HTMLElement;
    @RefSelector('eHorizontalRightSpacer') private eHorizontalRightSpacer: HTMLElement;
    @RefSelector('eBodyHorizontalScrollViewport') private eBodyHorizontalScrollViewport: HTMLElement;
    @RefSelector('eBodyHorizontalScrollContainer') private eBodyHorizontalScrollContainer: HTMLElement;

    @RefSelector('eFullWidthContainer') private eFullWidthContainer: HTMLElement;

    @RefSelector('eTop') private eTop: HTMLElement;
    @RefSelector('eLeftTop') private eLeftTop: HTMLElement;
    @RefSelector('eRightTop') private eRightTop: HTMLElement;
    @RefSelector('eTopContainer') private eTopContainer: HTMLElement;
    @RefSelector('eTopViewport') private eTopViewport: HTMLElement;
    @RefSelector('eTopFullWidthContainer') private eTopFullWidthContainer: HTMLElement;

    @RefSelector('eBottom') private eBottom: HTMLElement;
    @RefSelector('eLeftBottom') private eLeftBottom: HTMLElement;
    @RefSelector('eRightBottom') private eRightBottom: HTMLElement;
    @RefSelector('eBottomContainer') private eBottomContainer: HTMLElement;
    @RefSelector('eBottomViewport') private eBottomViewport: HTMLElement;
    @RefSelector('eBottomFullWidthContainer') private eBottomFullWidthContainer: HTMLElement;

    @RefSelector('headerRoot') headerRootComp: HeaderRootComp;

    private rowContainerComponents: RowContainerComponents;
    private eAllCellContainers: HTMLElement[];

    private eOverlay: HTMLElement;

    private scrollLeft = -1;
    private scrollTop = -1;

    private lastHorizontalScrollMillis = 0;
    private horizontalScroller: HTMLElement;

    private bodyHeight: number;

    // properties we use a lot, so keep reference
    private enableRtl: boolean;
    private scrollWidth: number;

    // used to track if pinned panels are showing, so we can turn them off if not
    private pinningRight: boolean;
    private pinningLeft: boolean;

    private overlayWrapper: IOverlayWrapperComp;

    private printLayout: boolean;

    constructor() {
        super(GRID_PANEL_NORMAL_TEMPLATE);
    }

    public getVScrollPosition(): {top: number, bottom: number} {
        let result = {
            top: this.eBodyViewport.scrollTop,
            bottom: this.eBodyViewport.scrollTop + this.eBodyViewport.offsetHeight
        };
        return result;
    }

    public getHScrollPosition(): { left: number, right: number } {
        let result = {
            left: this.eCenterViewport.scrollLeft,
            right: this.eCenterViewport.scrollLeft + this.eCenterViewport.offsetWidth
        };
        return result;
    }

    // we override this, as the base class is missing the annotation
    @PreDestroy
    public destroy() {
        super.destroy();
    }

    private onRowDataChanged(): void {
        this.showOrHideOverlay();
    }

    private showOrHideOverlay(): void {
        if (this.paginationProxy.isEmpty() && !this.gridOptionsWrapper.isSuppressNoRowsOverlay()) {
            this.showNoRowsOverlay();
        } else {
            this.hideOverlay();
        }
    }

    private onNewColumnsLoaded(): void {
        // hide overlay if columns and rows exist, this can happen if columns are loaded after data.
        // this problem exists before of the race condition between the services (column controller in this case)
        // and the view (grid panel). if the model beans were all initialised first, and then the view beans second,
        // this race condition would not happen.
        if (this.columnController.isReady() && !this.paginationProxy.isEmpty()) {
            this.hideOverlay();
        }
    }

    @PostConstruct
    private init() {
        this.instantiate(this.context);

        // makes code below more readable if we pull 'forPrint' out
        this.scrollWidth = this.gridOptionsWrapper.getScrollbarWidth();
        this.enableRtl = this.gridOptionsWrapper.isEnableRtl();
        this.printLayout = this.gridOptionsWrapper.getDomLayout() === Constants.DOM_LAYOUT_PRINT;

        // these elements have different CSS when layout changes
        this.gridOptionsWrapper.addLayoutElement(this.getGui());
        this.gridOptionsWrapper.addLayoutElement(this.eBodyViewport);

        this.suppressScrollOnFloatingRow();
        this.setupRowAnimationCssClass();
        this.buildRowContainerComponents();

        this.addEventListeners();
        this.addDragListeners();

        this.addScrollListener();

        this.setupOverlay();

        if (this.gridOptionsWrapper.isRowModelDefault() && !this.gridOptionsWrapper.getRowData()) {
            this.showLoadingOverlay();
        }

        this.setPinnedContainerSize();
        this.setHeaderAndFloatingHeights();
        this.disableBrowserDragging();
        this.addShortcutKeyListeners();
        this.addMouseListeners();
        this.addKeyboardEvents();
        this.addBodyViewportListener();
        this.addStopEditingWhenGridLosesFocus();
        this.mockContextMenuForIPad();
        this.addRowDragListener();

        if (this.$scope) {
            this.addAngularApplyCheck();
        }

        this.onDisplayedColumnsWidthChanged();

        // Gil - I took this out - is it needed? Appears not on my browsers.
        // this.setHeightOnCenterColsViewport();

        this.gridApi.registerGridComp(this);
        this.alignedGridsService.registerGridComp(this);
        this.headerRootComp.registerGridComp(this);
        this.navigationService.registerGridComp(this);
        this.heightScaler.registerGridComp(this);
        this.autoHeightCalculator.registerGridComp(this);
        this.columnAnimationService.registerGridComp(this);
        this.autoWidthCalculator.registerGridComp(this);
        this.paginationAutoPageSizeService.registerGridComp(this);
        this.beans.registerGridComp(this);
        this.rowRenderer.registerGridComp(this);
        if (this.rangeController) {
            this.rangeController.registerGridComp(this);
        }

        [this.eCenterViewport, this.eBodyViewport].forEach( viewport => {
            const unsubscribeFromResize = this.resizeObserverService.observeResize(
                viewport, this.onCenterViewportResized.bind(this));
            this.addDestroyFunc(() => unsubscribeFromResize());
        });
    }

    // private setHeightOnCenterColsViewport(): void {
    //     let height = this.gridOptionsWrapper.getScrollbarWidth()>0 ? 'calc(100% + 30px)' : '100%';
    //     this.eCenterViewport.style.height = height;
    // }

    private onDomLayoutChanged(): void {
        let newPrintLayout = this.gridOptionsWrapper.getDomLayout() === Constants.DOM_LAYOUT_PRINT;

        if (this.printLayout !== newPrintLayout) {
            this.printLayout = newPrintLayout;
            this.setWidthsOfContainers();
            // pinned containers are always hidden for print layout
            this.setPinnedContainerSize();
        }
    }

    private onCenterViewportResized(): void {
        this.checkViewportAndScrolls();
    }

    // used by ColumnAnimationService
    public setColumnMovingCss(moving: boolean): void {
        this.addOrRemoveCssClass('ag-column-moving', moving);
    }

    private setupOverlay(): void {
        this.overlayWrapper = this.componentRecipes.newOverlayWrapperComponent();
        this.eOverlay = this.queryForHtmlElement('[ref="eOverlay"]');
        this.overlayWrapper.hideOverlay(this.eOverlay);
    }

    private addRowDragListener(): void {

        let rowDragFeature = new RowDragFeature(this.eBodyViewport, this);
        this.context.wireBean(rowDragFeature);

        this.dragAndDropService.addDropTarget(rowDragFeature);
    }

    private addStopEditingWhenGridLosesFocus(): void {
        if (!this.gridOptionsWrapper.isStopEditingWhenGridLosesFocus()) { return; }

        const focusOutListener = (event: FocusEvent): void => {
            // this is the element the focus is moving to
            let elementWithFocus = event.relatedTarget;

            // see if the element the focus is going to is part of the grid
            let clickInsideGrid = false;
            let pointer: any = elementWithFocus;

            while (_.exists(pointer) && !clickInsideGrid) {

                const isPopup = !!this.gridOptionsWrapper.getDomData(pointer, PopupEditorWrapper.DOM_KEY_POPUP_EDITOR_WRAPPER);
                const isBody = this.eBodyViewport === pointer || this.eBottom === pointer || this.eTop === pointer;

                clickInsideGrid = isPopup || isBody;
                pointer = pointer.parentNode;
            }

            if (!clickInsideGrid) {
                this.rowRenderer.stopEditing();
            }
        };

        this.addDestroyableEventListener(this.eBodyViewport, 'focusout', focusOutListener);
        this.addDestroyableEventListener(this.eTop, 'focusout', focusOutListener);
        this.addDestroyableEventListener(this.eBottom, 'focusout', focusOutListener);
    }

    private addAngularApplyCheck(): void {
        // this makes sure if we queue up requests, we only execute oe
        let applyTriggered = false;

        let listener = ()=> {
            // only need to do one apply at a time
            if (applyTriggered) { return; }
            applyTriggered = true; // mark 'need apply' to true
            setTimeout( ()=> {
                applyTriggered = false;
                this.$scope.$apply();
            }, 0);
        };

        // these are the events we need to do an apply after - these are the ones that can end up
        // with columns added or removed
        this.addDestroyableEventListener(this.eventService, Events.EVENT_DISPLAYED_COLUMNS_CHANGED, listener);
        this.addDestroyableEventListener(this.eventService, Events.EVENT_VIRTUAL_COLUMNS_CHANGED, listener);
    }

    // if we do not do this, then the user can select a pic in the grid (eg an image in a custom cell renderer)
    // and then that will start the browser native drag n' drop, which messes up with our own drag and drop.
    private disableBrowserDragging(): void {
        this.getGui().addEventListener('dragstart', (event: MouseEvent)=> {
            if (event.target instanceof HTMLImageElement) {
                event.preventDefault();
                return false;
            }
        });
    }

    private addEventListeners(): void {

        this.addDestroyableEventListener(this.eventService, Events.EVENT_DISPLAYED_COLUMNS_CHANGED, this.onDisplayedColumnsChanged.bind(this));
        this.addDestroyableEventListener(this.eventService, Events.EVENT_DISPLAYED_COLUMNS_WIDTH_CHANGED, this.onDisplayedColumnsWidthChanged.bind(this));
        this.addDestroyableEventListener(this.eventService, Events.EVENT_PINNED_ROW_DATA_CHANGED, this.setHeaderAndFloatingHeights.bind(this));
        this.addDestroyableEventListener(this.eventService, Events.EVENT_ROW_DATA_CHANGED, this.onRowDataChanged.bind(this));
        this.addDestroyableEventListener(this.eventService, Events.EVENT_ROW_DATA_UPDATED, this.onRowDataChanged.bind(this));
        this.addDestroyableEventListener(this.eventService, Events.EVENT_NEW_COLUMNS_LOADED, this.onNewColumnsLoaded.bind(this));

        this.addDestroyableEventListener(this.gridOptionsWrapper, GridOptionsWrapper.PROP_HEADER_HEIGHT, this.setHeaderAndFloatingHeights.bind(this));
        this.addDestroyableEventListener(this.gridOptionsWrapper, GridOptionsWrapper.PROP_PIVOT_HEADER_HEIGHT, this.setHeaderAndFloatingHeights.bind(this));
        this.addDestroyableEventListener(this.gridOptionsWrapper, GridOptionsWrapper.PROP_GROUP_HEADER_HEIGHT, this.setHeaderAndFloatingHeights.bind(this));
        this.addDestroyableEventListener(this.gridOptionsWrapper, GridOptionsWrapper.PROP_PIVOT_GROUP_HEADER_HEIGHT, this.setHeaderAndFloatingHeights.bind(this));
        this.addDestroyableEventListener(this.gridOptionsWrapper, GridOptionsWrapper.PROP_FLOATING_FILTERS_HEIGHT, this.setHeaderAndFloatingHeights.bind(this));
        this.addDestroyableEventListener(this.gridOptionsWrapper, GridOptionsWrapper.PROP_DOM_LAYOUT, this.onDomLayoutChanged.bind(this));
    }

    private addDragListeners(): void {
        if (!this.gridOptionsWrapper.isEnableRangeSelection() // no range selection if no property
            || _.missing(this.rangeController)) { // no range selection if not enterprise version
            return;
        }

        let containers = [this.eLeftContainer, this.eRightContainer, this.eCenterContainer,
            this.eTop, this.eBottom];

        containers.forEach(container => {
            let params: DragListenerParams = {
                eElement: container,
                onDragStart: this.rangeController.onDragStart.bind(this.rangeController),
                onDragStop: this.rangeController.onDragStop.bind(this.rangeController),
                onDragging: this.rangeController.onDragging.bind(this.rangeController),
                // for range selection by dragging the mouse, we want to ignore the event if shift key is pressed,
                // as shift key click is another type of range selection
                skipMouseEvent: mouseEvent => mouseEvent.shiftKey
            };

            this.dragService.addDragSource(params);

            this.addDestroyFunc( ()=> this.dragService.removeDragSource(params) );
        });
    }

    private addMouseListeners(): void {
        let eventNames = ['click','mousedown','dblclick','contextmenu','mouseover','mouseout'];
        eventNames.forEach( eventName => {
            let listener = this.processMouseEvent.bind(this, eventName);
            this.eAllCellContainers.forEach( container =>
                this.addDestroyableEventListener(container, eventName, listener)
            );
        });
    }

    private addKeyboardEvents(): void {
        let eventNames = ['keydown','keypress'];
        eventNames.forEach( eventName => {
            let listener = this.processKeyboardEvent.bind(this, eventName);
            this.eAllCellContainers.forEach( container => {
                this.addDestroyableEventListener(container, eventName, listener);
            });
        });
    }

    private addBodyViewportListener(): void {
        // we want to listen for clicks directly on the eBodyViewport, so the user has a way of showing
        // the context menu if no rows or columns are displayed, or user simply clicks outside of a cell
        let listener = (mouseEvent: MouseEvent) => {
            let target = _.getTarget(mouseEvent);
            if (target === this.eBodyViewport) {
                // show it
                this.onContextMenu(mouseEvent, null, null, null, null);
                this.preventDefaultOnContextMenu(mouseEvent);
            }
        };

        //For some reason listening only to this.eBody doesn't work... Maybe because the event is consumed somewhere else?
        //In any case, not expending much time on this, if anyone comes across this and knows how to make this work with
        //one listener please go ahead and change it...
        this.addDestroyableEventListener(this.eBodyViewport, 'contextmenu', listener);
    }

    // + rangeController - used to know when to scroll when user is dragging outside the
    // main viewport while doing a range selection
    public getBodyClientRect(): ClientRect {
        if (this.eBodyViewport) {
            return this.eBodyViewport.getBoundingClientRect();
        }
    }

    private getRowForEvent(event: Event): RowComp {

        let sourceElement = _.getTarget(event);

        while (sourceElement) {

            let renderedRow = this.gridOptionsWrapper.getDomData(sourceElement, RowComp.DOM_DATA_KEY_RENDERED_ROW);
            if (renderedRow) {
                return renderedRow;
            }

            sourceElement = sourceElement.parentElement;
        }

        return null;
    }

    private processKeyboardEvent(eventName: string, keyboardEvent: KeyboardEvent): void {
        let renderedCell = this.mouseEventService.getRenderedCellForEvent(keyboardEvent);

        if (!renderedCell) { return; }

        switch (eventName) {
            case 'keydown':
                // first see if it's a scroll key, page up / down, home / end etc
                let wasScrollKey = this.navigationService.handlePageScrollingKey(keyboardEvent);

                // if not a scroll key, then we pass onto cell
                if (!wasScrollKey) {
                    renderedCell.onKeyDown(keyboardEvent);
                }

                break;
            case 'keypress':
                renderedCell.onKeyPress(keyboardEvent);
                break;
        }
    }

    // gets called by rowRenderer when new data loaded, as it will want to scroll to the top
    public scrollToTop(): void {
       this.eBodyViewport.scrollTop = 0;
    }

    private processMouseEvent(eventName: string, mouseEvent: MouseEvent): void {
        if (!this.mouseEventService.isEventFromThisGrid(mouseEvent)) { return; }
        if (_.isStopPropagationForAgGrid(mouseEvent)) { return; }

        let rowComp = this.getRowForEvent(mouseEvent);
        let cellComp = this.mouseEventService.getRenderedCellForEvent(mouseEvent);

        if (eventName === "contextmenu") {
            this.handleContextMenuMouseEvent(mouseEvent, null, rowComp, cellComp);
        } else {
            if (cellComp) { cellComp.onMouseEvent(eventName, mouseEvent); }
            if (rowComp) { rowComp.onMouseEvent(eventName, mouseEvent); }
        }

        this.preventDefaultOnContextMenu(mouseEvent);
    }

    private mockContextMenuForIPad(): void {

        // we do NOT want this when not in ipad, otherwise we will be doing
        if (!_.isUserAgentIPad()) {return;}

        this.eAllCellContainers.forEach( container => {
            let touchListener = new TouchListener(container);
            let longTapListener = (event: LongTapEvent)=> {

                let rowComp = this.getRowForEvent(event.touchEvent);
                let cellComp = this.mouseEventService.getRenderedCellForEvent(event.touchEvent);

                this.handleContextMenuMouseEvent(null, event.touchEvent, rowComp, cellComp);
            };
            this.addDestroyableEventListener(touchListener, TouchListener.EVENT_LONG_TAP, longTapListener);
            this.addDestroyFunc( ()=> touchListener.destroy() );
        });

    }

    private handleContextMenuMouseEvent(mouseEvent: MouseEvent, touchEvent: TouchEvent, rowComp: RowComp, cellComp: CellComp) {
        let rowNode = rowComp ? rowComp.getRowNode() : null;
        let column = cellComp ? cellComp.getColumn() : null;
        let value = null;

        if (column) {
            let event = mouseEvent ? mouseEvent : touchEvent;
            cellComp.dispatchCellContextMenuEvent(event);
            value = this.valueService.getValue(column, rowNode);
        }

        this.onContextMenu(mouseEvent, touchEvent, rowNode, column, value);
    }

    private onContextMenu(mouseEvent: MouseEvent, touchEvent: TouchEvent, rowNode: RowNode, column: Column, value: any): void {

        // to allow us to debug in chrome, we ignore the event if ctrl is pressed.
        // not everyone wants this, so first 'if' below allows to turn this hack off.
        if (!this.gridOptionsWrapper.isAllowContextMenuWithControlKey()) {
            // then do the check
            if (mouseEvent && (mouseEvent.ctrlKey || mouseEvent.metaKey)) {
                return;
            }
        }

        if (this.contextMenuFactory && !this.gridOptionsWrapper.isSuppressContextMenu()) {
            let eventOrTouch: (MouseEvent | Touch) = mouseEvent ? mouseEvent : touchEvent.touches[0];
            this.contextMenuFactory.showMenu(rowNode, column, value, eventOrTouch);
            let event = mouseEvent ? mouseEvent : touchEvent;
            event.preventDefault();
        }
    }

    private preventDefaultOnContextMenu(mouseEvent: MouseEvent): void {
        // if we don't do this, then middle click will never result in a 'click' event, as 'mousedown'
        // will be consumed by the browser to mean 'scroll' (as you can scroll with the middle mouse
        // button in the browser). so this property allows the user to receive middle button clicks if
        // they want.
        if (this.gridOptionsWrapper.isSuppressMiddleClickScrolls() && mouseEvent.which === 2) {
            mouseEvent.preventDefault();
        }
    }

    private addShortcutKeyListeners(): void {
        this.eAllCellContainers.forEach( (container)=> {
            container.addEventListener('keydown', (event: KeyboardEvent)=> {

                // if the cell the event came from is editing, then we do not
                // want to do the default shortcut keys, otherwise the editor
                // (eg a text field) would not be able to do the normal cut/copy/paste
                let renderedCell = this.mouseEventService.getRenderedCellForEvent(event);
                if (renderedCell && renderedCell.isEditing()) {
                    return;
                }

                // for copy / paste, we don't want to execute when the event
                // was from a child grid (happens in master detail)
                if (!this.mouseEventService.isEventFromThisGrid(event)) {
                    return;
                }

                if (event.ctrlKey || event.metaKey) {
                    switch (event.which) {
                        case Constants.KEY_A: return this.onCtrlAndA(event);
                        case Constants.KEY_C: return this.onCtrlAndC(event);
                        case Constants.KEY_V: return this.onCtrlAndV(event);
                        case Constants.KEY_D: return this.onCtrlAndD(event);
                    }
                }
            });
        });
    }

    private onCtrlAndA(event: KeyboardEvent): boolean {
        if (this.rangeController && this.paginationProxy.isRowsToRender()) {
            let rowEnd: number;
            let floatingStart: string;
            let floatingEnd: string;

            if (this.pinnedRowModel.isEmpty(Constants.PINNED_TOP)) {
                floatingStart = null;
            } else {
                floatingStart = Constants.PINNED_TOP;
            }

            if (this.pinnedRowModel.isEmpty(Constants.PINNED_BOTTOM)) {
                floatingEnd = null;
                rowEnd = this.paginationProxy.getTotalRowCount() - 1;
            } else {
                floatingEnd = Constants.PINNED_BOTTOM;
                rowEnd = this.pinnedRowModel.getPinnedBottomRowData().length - 1;
            }

            let allDisplayedColumns = this.columnController.getAllDisplayedColumns();
            if (_.missingOrEmpty(allDisplayedColumns)) { return; }
            this.rangeController.setRange({
                rowStart: 0,
                floatingStart: floatingStart,
                rowEnd: rowEnd,
                floatingEnd: floatingEnd,
                columnStart: allDisplayedColumns[0],
                columnEnd: allDisplayedColumns[allDisplayedColumns.length-1]
            });
        }
        event.preventDefault();
        return false;
    }

    private onCtrlAndC(event: KeyboardEvent): boolean {
        if (!this.clipboardService) { return; }

        let focusedCell = this.focusedCellController.getFocusedCell();

        this.clipboardService.copyToClipboard();
        event.preventDefault();

        // the copy operation results in loosing focus on the cell,
        // because of the trickery the copy logic uses with a temporary
        // widget. so we set it back again.
        if (focusedCell) {
            this.focusedCellController.setFocusedCell(focusedCell.rowIndex, focusedCell.column, focusedCell.floating, true);
        }

        return false;
    }

    private onCtrlAndV(event: KeyboardEvent): boolean {
        if (!this.enterprise) { return; }

        if (this.gridOptionsWrapper.isSuppressClipboardPaste()) { return; }

        this.clipboardService.pasteFromClipboard();

        return false;
    }

    private onCtrlAndD(event: KeyboardEvent): boolean {
        if (!this.enterprise) { return; }
        this.clipboardService.copyRangeDown();
        event.preventDefault();
        return false;
    }

    // Valid values for position are bottom, middle and top
    // position should be {'top','middle','bottom', or undefined/null}.
    // if undefined/null, then the grid will to the minimal amount of scrolling,
    // eg if grid needs to scroll up, it scrolls until row is on top,
    //    if grid needs to scroll down, it scrolls until row is on bottom,
    //    if row is already in view, grid does not scroll
    // fixme - how does this work in the new way
    public ensureIndexVisible(index: any, position?: string) {
        // if for print or auto height, everything is always visible
        if (this.gridOptionsWrapper.isGridAutoHeight()) { return; }

        let rowCount = this.paginationProxy.getTotalRowCount();
        if (typeof index !== 'number' || index < 0 || index >= rowCount) {
            console.warn('invalid row index for ensureIndexVisible: ' + index);
            return;
        }

        this.paginationProxy.goToPageWithIndex(index);

        let rowNode = this.paginationProxy.getRow(index);
        let paginationOffset = this.paginationProxy.getPixelOffset();
        let rowTopPixel = rowNode.rowTop - paginationOffset;
        let rowBottomPixel = rowTopPixel + rowNode.rowHeight;

        let scrollPosition = this.getVScrollPosition();
        let heightOffset = this.heightScaler.getOffset();

        let vScrollTop = scrollPosition.top + heightOffset;
        let vScrollBottom = scrollPosition.bottom + heightOffset;

        if (this.isHorizontalScrollShowing()) {
            vScrollBottom -= this.scrollWidth;
        }

        let viewportHeight = vScrollBottom - vScrollTop;

        let newScrollPosition: number = null;

        // work out the pixels for top, middle and bottom up front,
        // make the if/else below easier to read
        let pxTop = this.heightScaler.getScrollPositionForPixel(rowTopPixel);
        let pxBottom = this.heightScaler.getScrollPositionForPixel(rowBottomPixel - viewportHeight);
        let pxMiddle = (pxTop + pxBottom) / 2;

        // make sure if middle, the row is not outside the top of the grid
        if (pxMiddle > rowTopPixel) {
            pxMiddle = rowTopPixel;
        }

        let rowBelowViewport = vScrollTop > rowTopPixel;
        let rowAboveViewport = vScrollBottom < rowBottomPixel;

        if (position==='top') {
            newScrollPosition = pxTop;
        } else if (position==='bottom') {
            newScrollPosition = pxBottom;
        } else if (position==='middle') {
            newScrollPosition = pxMiddle;
        } else if (rowBelowViewport) {
            // if row is before, scroll up with row at top
            newScrollPosition = pxTop;
        } else if (rowAboveViewport) {
            // if row is below, scroll down with row at bottom
            newScrollPosition = pxBottom;
        }

        if (newScrollPosition!==null) {
            this.eBodyViewport.scrollTop = newScrollPosition;
            this.rowRenderer.redrawAfterScroll();
        }
    }

    // + moveColumnController
    public getCenterWidth(): number {
        return this.eCenterViewport.clientWidth;
    }

    public isVerticalScrollShowing(): boolean {
        return _.isVerticalScrollShowing(this.eBodyViewport);
    }

    public isHorizontalScrollShowing(): boolean {
        return _.isHorizontalScrollShowing(this.eCenterViewport);
    }

    // gets called every time the viewport size changes. we use this to check visibility of scrollbars
    // in the grid panel, and also to check size and position of viewport for row and column virtualisation.
    public checkViewportAndScrolls(): void {

        // results in updating anything that depends on scroll showing
        this.updateScrollVisibleService();

        // fires event if height changes, used by PaginationService, HeightScalerService, RowRenderer
        this.checkBodyHeight();

        // check for virtual columns for ColumnController
        this.onHorizontalViewportChanged();

        this.setPinnedLeftWidth();
        this.setPinnedRightWidth();
    }

    private updateScrollVisibleService(): void {
        let params: SetScrollsVisibleParams = {
            horizontalScrollShowing: false,
            verticalScrollShowing: false
        };

        params.verticalScrollShowing = this.isVerticalScrollShowing();
        params.horizontalScrollShowing = !this.gridOptionsWrapper.isSuppressHorizontalScroll() && this.isHorizontalScrollShowing();

        this.scrollVisibleService.setScrollsVisible(params);

        this.setHorizontalScrollVisible(params.horizontalScrollShowing);
        this.setVerticalScrollPaddingVisible(params.verticalScrollShowing);
    }

    private setHorizontalScrollVisible(visible: boolean): void {
        const height = visible ? (this.gridOptionsWrapper.getScrollbarWidth() || 0) : 0;

        _.setFixedHeight(this.eBodyHorizontalScrollViewport, height);
        _.setFixedHeight(this.eBodyHorizontalScrollContainer, height);
        _.setFixedHeight(this.eHorizontalScrollBody, height);
    }

    private setVerticalScrollPaddingVisible(show: boolean): void {
        let margin = show ? `${this.scrollWidth}px` : `0px`;
        if (this.enableRtl) {
            this.eTop.style.paddingLeft = margin;
            this.eBottom.style.paddingLeft = margin;
        } else {
            this.eTop.style.paddingRight = margin;
            this.eBottom.style.paddingRight = margin;
        }
    }

    // fixme - test this!
    public ensureColumnVisible(key: any): void {
        let column = this.columnController.getGridColumn(key);

        if (!column) { return; }

        if (column.isPinned()) {
            console.warn('calling ensureIndexVisible on a '+column.getPinned()+' pinned column doesn\'t make sense for column ' + column.getColId());
            return;
        }

        if (!this.columnController.isColumnDisplayed(column)) {
            console.warn('column is not currently visible');
            return;
        }

        let colLeftPixel = column.getLeft();
        let colRightPixel = colLeftPixel + column.getActualWidth();

        let viewportWidth = this.eBodyViewport.clientWidth;
        let scrollPosition = this.getCenterViewportScrollLeft();

        let bodyWidth = this.columnController.getBodyContainerWidth();

        let viewportLeftPixel: number;
        let viewportRightPixel: number;

        // the logic of working out left and right viewport px is both here and in the ColumnController,
        // need to refactor it out to one place
        if (this.enableRtl) {
            viewportLeftPixel = bodyWidth - scrollPosition - viewportWidth;
            viewportRightPixel = bodyWidth - scrollPosition;
        } else {
            viewportLeftPixel = scrollPosition;
            viewportRightPixel = viewportWidth + scrollPosition;
        }

        let viewportScrolledPastCol = viewportLeftPixel > colLeftPixel;
        let viewportScrolledBeforeCol = viewportRightPixel < colRightPixel;
        let colToSmallForViewport = viewportWidth < column.getActualWidth();

        let alignColToLeft = viewportScrolledPastCol || colToSmallForViewport;
        let alignColToRight = viewportScrolledBeforeCol;
        let newScrollPosition = this.getCenterViewportScrollLeft();
        if (alignColToLeft || alignColToRight) {
            if (this.enableRtl) {
                newScrollPosition = alignColToLeft ? (bodyWidth - viewportWidth - colLeftPixel) : (bodyWidth - colRightPixel);
            } else {
                newScrollPosition = alignColToLeft ? colLeftPixel : (colRightPixel - viewportWidth);
            }
            this.setCenterViewportScrollLeft(newScrollPosition);
        }  else {
            // otherwise, col is already in view, so do nothing
        }

        // this will happen anyway, as the move will cause a 'scroll' event on the body, however
        // it is possible that the ensureColumnVisible method is called from within ag-Grid and
        // the caller will need to have the columns rendered to continue, which will be before
        // the event has been worked on (which is the case for cell navigation).
        this.onHorizontalViewportChanged();
    }

    public showLoadingOverlay() {
        this.overlayWrapper.showLoadingOverlay(this.eOverlay);
    }

    public showNoRowsOverlay() {
        this.overlayWrapper.showNoRowsOverlay(this.eOverlay);
    }

    public hideOverlay() {
        this.overlayWrapper.hideOverlay(this.eOverlay);
    }

    private getWidthForSizeColsToFit() {
        return this.eCenterViewport.clientWidth;
    }

    // method will call itself if no available width. this covers if the grid
    // isn't visible, but is just about to be visible.
    public sizeColumnsToFit(nextTimeout?: number) {
        let availableWidth = this.getWidthForSizeColsToFit();
        if (availableWidth>0) {
            this.columnController.sizeColumnsToFit(availableWidth, "sizeColumnsToFit");
        } else {
            if (nextTimeout===undefined) {
                setTimeout( ()=> {
                    this.sizeColumnsToFit(100);
                }, 0);
            } else if (nextTimeout===100) {
                setTimeout( ()=> {
                    this.sizeColumnsToFit(500);
                }, 100);
            } else if (nextTimeout===500) {
                setTimeout( ()=> {
                    this.sizeColumnsToFit(-1);
                }, 500);
            } else {
                console.log('ag-Grid: tried to call sizeColumnsToFit() but the grid is coming back with ' +
                    'zero width, maybe the grid is not visible yet on the screen?');
            }
        }
    }

    // used by autoWidthCalculator and autoHeightCalculator
    public getCenterContainer(): HTMLElement {
        return this.eCenterContainer;
    }

    public getDropTargetBodyContainers(): HTMLElement[] {
        return [this.eCenterViewport, this.eTopViewport, this.eBottomViewport];
    }

    public getDropTargetLeftContainers(): HTMLElement[] {
        return [this.eLeftContainer, this.eLeftBottom, this.eLeftTop];
    }

    public getDropTargetRightContainers(): HTMLElement[] {
        return [this.eRightContainer, this.eRightBottom, this.eRightTop];
    }

    private buildRowContainerComponents() {

        this.eAllCellContainers = [
            this.eLeftContainer, this.eRightContainer, this.eCenterContainer,
            this.eTop, this.eBottom, this.eFullWidthContainer];

        this.rowContainerComponents = {
            body: new RowContainerComponent({
                eContainer: this.eCenterContainer,
                eWrapper: this.eCenterColsClipper,
                eViewport: this.eBodyViewport
            }),
            fullWidth: new RowContainerComponent({
                eContainer: this.eFullWidthContainer,
                hideWhenNoChildren: true
            }),
            pinnedLeft: new RowContainerComponent({eContainer: this.eLeftContainer}),
            pinnedRight: new RowContainerComponent({eContainer: this.eRightContainer}),

            floatingTop: new RowContainerComponent({eContainer: this.eTopContainer}),
            floatingTopPinnedLeft: new RowContainerComponent({eContainer: this.eLeftTop}),
            floatingTopPinnedRight: new RowContainerComponent({eContainer: this.eRightTop}),
            floatingTopFullWidth: new RowContainerComponent({eContainer: this.eTopFullWidthContainer, hideWhenNoChildren: true}),

            floatingBottom: new RowContainerComponent({eContainer: this.eBottomContainer}),
            floatingBottomPinnedLeft: new RowContainerComponent({eContainer: this.eLeftBottom}),
            floatingBottomPinnedRight: new RowContainerComponent({eContainer: this.eRightBottom}),
            floatingBottomFullWith: new RowContainerComponent({eContainer: this.eBottomFullWidthContainer, hideWhenNoChildren: true}),
        };

        _.iterateObject(this.rowContainerComponents, (key: string, container: RowContainerComponent)=> {
            if (container) {
                this.context.wireBean(container);
            }
        });
    }

    private setupRowAnimationCssClass(): void {

        let listener = () => {
            // we don't want to use row animation if scaling, as rows jump strangely as you scroll,
            // when scaling and doing row animation.
            let animateRows = this.gridOptionsWrapper.isAnimateRows() && !this.heightScaler.isScaling();
            _.addOrRemoveCssClass(this.eBodyViewport, 'ag-row-animation', animateRows);
            _.addOrRemoveCssClass(this.eBodyViewport, 'ag-row-no-animation', !animateRows);
        };

        listener();

        this.addDestroyableEventListener(this.eventService, Events.EVENT_HEIGHT_SCALE_CHANGED, listener);
    }

    // when editing a pinned row, if the cell is half outside the scrollable area, the browser can
    // scroll the column into view. we do not want this, the pinned sections should never scroll.
    // so we listen to scrolls on these containers and reset the scroll if we find one.
    private suppressScrollOnFloatingRow(): void {
        let resetTopScroll = () => this.eTopViewport.scrollLeft = 0;
        let resetBottomScroll = () => this.eTopViewport.scrollLeft = 0;

        this.addDestroyableEventListener(this.eTopViewport, 'scroll', resetTopScroll);
        this.addDestroyableEventListener(this.eBottomViewport, 'scroll', resetBottomScroll);
    }

    public getRowContainers(): RowContainerComponents {
        return this.rowContainerComponents;
    }

    public onDisplayedColumnsChanged(): void {
        this.setPinnedContainerSize();
        this.setHeaderAndFloatingHeights();
        this.onHorizontalViewportChanged();
        this.updateScrollVisibleService();
    }

    private onDisplayedColumnsWidthChanged(): void {
        this.setWidthsOfContainers();
        this.onHorizontalViewportChanged();
        this.updateScrollVisibleService();
        // todo - wtf
        if (this.enableRtl) {
            // because RTL is all backwards, a change in the width of the row
            // can cause a change in the scroll position, without a scroll event,
            // because the scroll position in RTL is a function that depends on
            // the width. to be convinced of this, take out this line, enable RTL,
            // scroll all the way to the left and then resize a column
            this.horizontallyScrollHeaderCenterAndFloatingCenter();
        }
    }

    private setWidthsOfContainers(): void {
        this.setCenterWidth();
        this.setPinnedLeftWidth();
        this.setPinnedRightWidth();
        this.setMainWrappersMinWidth();
    }

    private setCenterWidth(): void {
        let width = this.columnController.getBodyContainerWidth();

        if (this.printLayout) {
            let pinnedContainerWidths = this.columnController.getPinnedLeftContainerWidth()
                + this.columnController.getPinnedRightContainerWidth();
            width += pinnedContainerWidths;
        }

        let widthPx = width + 'px';
        this.eCenterContainer.style.width = widthPx;
        this.eBottomContainer.style.width = widthPx;
        this.eTopContainer.style.width = widthPx;

        this.eBodyHorizontalScrollContainer.style.width = widthPx;
    }

    private setMainWrappersMinWidth(): void {
        const scrollWidth = this.isVerticalScrollShowing ? this.scrollWidth : 0;

        let minWidth = scrollWidth;

        if (this.pinningLeft) { minWidth += this.eLeftContainer.clientWidth; }
        if (this.pinningRight) { minWidth += this.eRightContainer.clientWidth; }

        const mainWrappers = [this.headerRootComp.getGui(), this.eTop, this.eBodyViewport, this.eBottom];

        mainWrappers.forEach(container => container.style.minWidth = `${minWidth}px`);
    }

    private setPinnedLeftWidth(): void {
        const widthOfCols = this.columnController.getPinnedLeftContainerWidth();
        const spacer = this.eHorizontalLeftSpacer;
        const oldPinning = this.pinningLeft;
        const newPinning = this.pinningLeft = !this.printLayout && widthOfCols > 0;
        const containers = [this.eLeftContainer, this.eLeftTop, this.eLeftBottom];

        if (oldPinning !== newPinning) {
            this.headerRootComp.setLeftVisible(newPinning);
        }

        containers.forEach(e => _.setVisible(e, this.pinningLeft));

        if (!this.pinningLeft) {
            _.setFixedWidth(spacer , 0);
            return;
        }

        let widthPx = `${widthOfCols}px`;

        // .width didn't do the trick in firefox, so needed .minWidth also
        containers[0].style.width = widthPx;
        containers[0].style.minWidth = widthPx;

        containers[1].style.maxWidth = widthPx;
        containers[2].style.maxWidth = widthPx;

        const spacerPadding = this.gridOptionsWrapper.isEnableRtl() && this.isVerticalScrollShowing();

        if (spacerPadding) {
            const scrollWidth = this.gridOptionsWrapper.getScrollbarWidth();
            widthPx = `${widthOfCols + scrollWidth}px`;
        }

        _.setFixedWidth(spacer, widthPx);
    }

    private setPinnedRightWidth(): void {
        const widthOfCols = this.columnController.getPinnedRightContainerWidth();
        const spacer = this.eHorizontalRightSpacer;
        const oldPinning = this.pinningRight;
        const newPinning = this.pinningRight = !this.printLayout && widthOfCols > 0;
        const containers = [this.eRightContainer, this.eRightTop, this.eRightBottom];

        if (oldPinning !== newPinning) {
            this.headerRootComp.setRightVisible(newPinning);
        }

        containers.forEach(e => _.setVisible(e, newPinning));

        if (!newPinning) {
            _.setFixedWidth(spacer, 0);
            return;
        }

        let widthPx = `${widthOfCols}px`;

        // .width didn't do the trick in firefox, so needed .minWidth also
        containers[0].style.width = widthPx;
        containers[0].style.minWidth = widthPx;

        containers[1].style.maxWidth = widthPx;
        containers[2].style.maxWidth = widthPx;

        const spacerPadding = !this.gridOptionsWrapper.isEnableRtl() && this.isVerticalScrollShowing();

        if (spacerPadding) {
            const scrollWidth = this.gridOptionsWrapper.getScrollbarWidth();
            widthPx = `${widthOfCols + scrollWidth}px`;
        }

        _.setFixedWidth(spacer, widthPx);
    }

    private setPinnedContainerSize() {
        this.setPinnedLeftWidth();
        this.setPinnedRightWidth();
    }

    private checkBodyHeight(): void {
        let bodyHeight = this.eBodyViewport.clientHeight;
        if (this.bodyHeight !== bodyHeight) {
            this.bodyHeight = bodyHeight;
            let event: BodyHeightChangedEvent = {
                type: Events.EVENT_BODY_HEIGHT_CHANGED,
                api: this.gridApi,
                columnApi: this.columnApi
            };
            this.eventService.dispatchEvent(event);
        }
    }

    public setHeaderAndFloatingHeights(): void {
        let headerRowCount = this.columnController.getHeaderRowCount();

        let totalHeaderHeight: number;
        let numberOfFloating = 0;
        let groupHeight: number;
        let headerHeight: number;
        if (!this.columnController.isPivotMode()) {
            if (this.gridOptionsWrapper.isFloatingFilter()) {
                headerRowCount ++;
            }
            numberOfFloating = (this.gridOptionsWrapper.isFloatingFilter()) ? 1 : 0;
            groupHeight = this.gridOptionsWrapper.getGroupHeaderHeight();
            headerHeight = this.gridOptionsWrapper.getHeaderHeight();
        } else {
            numberOfFloating = 0;
            groupHeight = this.gridOptionsWrapper.getPivotGroupHeaderHeight();
            headerHeight = this.gridOptionsWrapper.getPivotHeaderHeight();
        }
        let numberOfNonGroups = 1 + numberOfFloating;
        let numberOfGroups = headerRowCount - numberOfNonGroups;

        totalHeaderHeight = numberOfFloating * this.gridOptionsWrapper.getFloatingFiltersHeight();
        totalHeaderHeight += numberOfGroups * groupHeight;
        totalHeaderHeight += headerHeight;

        this.headerRootComp.setHeight(totalHeaderHeight);

        let floatingTopHeight = this.pinnedRowModel.getPinnedTopTotalHeight();
        let floatingBottomHeight = this.pinnedRowModel.getPinnedBottomTotalHeight();

        this.eTop.style.minHeight = floatingTopHeight + 'px';
        this.eTop.style.height = floatingTopHeight + 'px';
        this.eBottom.style.minHeight = floatingBottomHeight + 'px';
        this.eBottom.style.height = floatingBottomHeight + 'px';

        this.checkBodyHeight();
    }

    public getBodyHeight(): number {
        return this.bodyHeight;
    }

    // called by scrollHorizontally method and alignedGridsService
    public setHorizontalScrollPosition(hScrollPosition: number): void {
        this.eCenterViewport.scrollLeft = hScrollPosition;

        // we need to manually do the event handling (rather than wait for the event)
        // for the alignedGridsService, as if we don't, the aligned grid service gets
        // notified async, and then it's 'consuming' flag doesn't get used right, and
        // we can end up with an infinite loop
        this.doHorizontalScroll(hScrollPosition);
    }

    public setVerticalScrollPosition(vScrollPosition: number): void {
        this.eBodyViewport.scrollTop = vScrollPosition;
    }

    // called by the headerRootComp and moveColumnController
    public scrollHorizontally(pixels: number): number {
        let oldScrollPosition = this.eCenterViewport.scrollLeft;
        this.setHorizontalScrollPosition(oldScrollPosition + pixels);
        let newScrollPosition = this.eCenterViewport.scrollLeft;
        return newScrollPosition - oldScrollPosition;
    }

    // called by rowDragFeature
    public scrollVertically(pixels: number): number {
        let oldScrollPosition = this.eBodyViewport.scrollTop;
        this.setVerticalScrollPosition(oldScrollPosition + pixels);
        let newScrollPosition = this.eBodyViewport.scrollTop;
        return newScrollPosition - oldScrollPosition;
    }

    private addScrollListener() {
        this.addDestroyableEventListener(this.eCenterViewport, 'scroll', this.onCenterViewportScroll.bind(this));
        this.addDestroyableEventListener(this.eBodyHorizontalScrollViewport, 'scroll', this.onFakeHorizontalScroll.bind(this));
        this.addDestroyableEventListener(this.eBodyViewport, 'scroll', this.onVerticalScroll.bind(this));
    }

    private onVerticalScroll(): void {
        let scrollTop: number = this.eBodyViewport.scrollTop;
        this.scrollTop = scrollTop;
        this.animationFrameService.setScrollTop(scrollTop);
        this.redrawRowsAfterScroll();
    }

    private isControllingScroll(eDiv: HTMLElement): boolean {
        let now = new Date().getTime();
        let diff = now - this.lastHorizontalScrollMillis;

        let controlling: boolean;
        if (eDiv===this.horizontalScroller) {
            controlling = true;
        } else {
            // if we scrolled the other container <200ms ago, we skip this event
            controlling = diff > 200;
        }

        this.lastHorizontalScrollMillis = now;

        if (controlling) {
            this.horizontalScroller = eDiv;
        }

        return controlling;
    }

    private onFakeHorizontalScroll(): void {
        if (!this.isControllingScroll(this.eBodyHorizontalScrollViewport)) { return; }
        this.onBodyHorizontalScroll(this.eBodyHorizontalScrollViewport);
    }

    private onCenterViewportScroll(): void {
        if (!this.isControllingScroll(this.eCenterViewport)) { return; }
        this.onBodyHorizontalScroll(this.eCenterViewport);
    }

    private onBodyHorizontalScroll(eSource: HTMLElement): void {

        const {scrollWidth, clientWidth} = this.eCenterViewport;
        // in chrome, fractions can be in the scroll left, eg 250.342234 - which messes up our 'scrollWentPastBounds'
        // formula. so we floor it to allow the formula to work.
        const scrollLeft = Math.floor(_.getScrollLeft(eSource, this.enableRtl));

        // touch devices allow elastic scroll - which temporally scrolls the panel outside of the viewport
        // (eg user uses touch to go to the left of the grid, but drags past the left, the rows will actually
        // scroll past the left until the user releases the mouse). when this happens, we want ignore the scroll,
        // as otherwise it was causing the rows and header to flicker.
        const scrollWentPastBounds = scrollLeft < 0 || (scrollLeft + clientWidth > scrollWidth);
        if (scrollWentPastBounds) {
            return;
        }

        this.doHorizontalScroll(scrollLeft);
    }

    private doHorizontalScroll(scrollLeft: number): void {
        this.scrollLeft = scrollLeft;
        let event: BodyScrollEvent = {
            type: Events.EVENT_BODY_SCROLL,
            api: this.gridApi,
            columnApi: this.columnApi,
            direction: 'horizontal',
            left: this.scrollLeft,
            top: this.scrollTop
        };
        this.eventService.dispatchEvent(event);
        this.horizontallyScrollHeaderCenterAndFloatingCenter(scrollLeft);
        this.onHorizontalViewportChanged();
    }

    private redrawRowsAfterScroll(): void {
        let event: BodyScrollEvent = {
            type: Events.EVENT_BODY_SCROLL,
            direction: 'vertical',
            api: this.gridApi,
            columnApi: this.columnApi,
            left: this.scrollLeft,
            top: this.scrollTop
        };
        this.eventService.dispatchEvent(event);
    }

    // this gets called whenever a change in the viewport, so we can inform column controller it has to work
    // out the virtual columns again. gets called from following locations:
    // + ensureColVisible, scroll, init, layoutChanged, displayedColumnsChanged, API (doLayout)
    private onHorizontalViewportChanged(): void {
        let scrollWidth = this.eCenterViewport.clientWidth;
        let scrollPosition = this.getCenterViewportScrollLeft();
        this.columnController.setVirtualViewportPosition(scrollWidth, scrollPosition);
    }

    public getCenterViewportScrollLeft(): number {
        // we defer to a util, as how you calculated scrollLeft when doing RTL depends on the browser
        return _.getScrollLeft(this.eCenterViewport, this.enableRtl);
    }

    public setCenterViewportScrollLeft(value: number): void {
        // we defer to a util, as how you calculated scrollLeft when doing RTL depends on the browser
        _.setScrollLeft(this.eCenterViewport, value, this.enableRtl);
    }

    public horizontallyScrollHeaderCenterAndFloatingCenter(scrollLeft?: number): void {
        if (scrollLeft === undefined) {
            scrollLeft = this.getCenterViewportScrollLeft();
        }

        const offset = this.enableRtl ? scrollLeft : -scrollLeft;
        const {clientWidth, scrollWidth} = this.eCenterViewport;
        const scrollWentPastBounds = Math.abs(offset) + clientWidth > scrollWidth;

        if (scrollWentPastBounds || (this.enableRtl && offset < 0) || (!this.enableRtl && offset > 0)) {
            return;
        }

        this.headerRootComp.setHorizontalScroll(offset);
        this.eBottomContainer.style.left = offset + 'px';
        this.eTopContainer.style.left = offset + 'px';

        if (this.horizontalScroller !== this.eCenterViewport) {
            _.setScrollLeft(this.eCenterViewport, scrollLeft, this.enableRtl);
        }
        if (this.horizontalScroller !== this.eBodyHorizontalScrollViewport) {
            _.setScrollLeft(this.eBodyHorizontalScrollViewport, scrollLeft, this.enableRtl);
        }
    }

    // + rangeController
    public addScrollEventListener(listener: () => void): void {
        this.eBodyViewport.addEventListener('scroll', listener);
    }

    // + rangeController
    public removeScrollEventListener(listener: () => void): void {
        this.eBodyViewport.removeEventListener('scroll', listener);
    }
}
