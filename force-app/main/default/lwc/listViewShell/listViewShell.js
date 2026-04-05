import { LightningElement, api } from 'lwc';

/* ===== DEFAULT ACTIONS ===== */
const DEFAULT_ROW_ACTIONS = [
  { label: 'View', name: 'view' },
  { label: 'Edit', name: 'edit' },
  { label: 'Delete', name: 'delete' }
];

const DEFAULT_TOOLBAR_ACTIONS = [
  { name: 'refresh', icon: 'utility:refresh', label: 'Refresh' }
];

export default class ListViewShell extends LightningElement {
  /* ===== INPUTS ===== */
  @api iconName;
  @api objectLabel;
  @api title;
  @api columns;
  @api data;
  @api draftValues = [];
  /* ===== ROW ACTION CONFIG ===== */
  @api extraRowActions = [];
  @api hideDefaultRowActions = false;
  @api isLoading = false;
  /* ===== TOOLBAR ACTION CONFIG ===== */
  @api actions = [];
  @api hideDefaultActions = false;


    


  /* ===== COMPUTED ROW ACTIONS ===== */
  get rowActions() {
    return this.hideDefaultRowActions
      ? this.extraRowActions
      : [...DEFAULT_ROW_ACTIONS, ...this.extraRowActions];
  }

  /* ===== COMPUTED COLUMNS ===== */
  get computedColumns() {
    if (!this.rowActions || this.rowActions.length === 0) {
      return this.columns || [];
    }

    return [
      ...(this.columns || []),
      {
        type: 'action',
        typeAttributes: {
          rowActions: this.rowActions
        }
      }
    ];
  }

  get hasSelection() {
  return Array.isArray(this.selectedRows) && this.selectedRows.length > 0;
}

get computedActions() {
  const baseActions = this.hideDefaultActions
    ? this.actions
    : [...DEFAULT_TOOLBAR_ACTIONS, ...this.actions];

  return baseActions.map(action => ({
    ...action,
    disabled: action.name === 'delete' && !this.hasSelection
  }));
}



selectedRows = [];
handleRowSelection(event) {
  const rows = event.detail?.selectedRows ?? [];
this.selectedRows = rows;
  this.dispatchEvent(
    new CustomEvent('rowselection', {
      detail: { selectedRows: rows },
      bubbles: true,
      composed: true
    })
  );
}
    /* ===== SEARCH ===== */
 handleSearch(event) {
this.dispatchEvent(
    new CustomEvent('searchchange', {
      detail: { value: event.target.value },
      bubbles: true,
      composed: true
    })
  );
}
  /* ===== EVENTS ===== */
  handleToolbarAction(event) {
  const action = event.currentTarget.dataset.action;

  this.dispatchEvent(
    new CustomEvent('action', {
      detail: { action },
      bubbles: true,
      composed: true
    })
  );
}

  handleRowAction(event) {
    this.dispatchEvent(
      new CustomEvent('rowaction', {
        detail: event.detail
      })
    );
  }


  handleSave(event) {
  this.dispatchEvent(
    new CustomEvent('save', {
      detail: event.detail
    })
  );
}
}