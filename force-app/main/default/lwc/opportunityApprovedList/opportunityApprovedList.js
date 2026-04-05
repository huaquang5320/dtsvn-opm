import { LightningElement, wire } from "lwc";
import getApprovedOpportunities from "@salesforce/apex/OpportunitySelector.getApprovedOpportunities";
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { NavigationMixin } from 'lightning/navigation';
import deleteOpportunity from "@salesforce/apex/OpportunitySelector.deleteOpportunity";
import deleteOpportunities from "@salesforce/apex/OpportunitySelector.deleteOpportunities";
export default class OpportunityApprovedList extends NavigationMixin(LightningElement) {
  iconName = "standard:opportunity";
  objectLabel = "Opportunities";
  title = "Danh sách đã thẩm định";

  columns = [
    {
      label: "Opportunity Name",
      fieldName: "NameUrl", 
      type: "url",
      typeAttributes: {
        label: { fieldName: "Name" },
        target: "_blank"
      }
    },
    {
      label: "Account Name",
      fieldName: "AccountUrl",
      type: "url",
      typeAttributes: {
        label: { fieldName: "AccountName" },
        target: "_blank"
      }
    },
    { label: "Stage", fieldName: "StageName" },
    { label: "Status", fieldName: "Status__c" },
    { label: "Close Date", fieldName: "CloseDate", type: "date", editable: true },
    { label: "Amount", fieldName: "Amount", type: "currency", editable: true }
  ];

  selectedRows = [];
  data = [];
  searchTerm = '';
  wiredResult;
  searchTimeout;

  /* ===================== WIRE ===================== */
  @wire(getApprovedOpportunities, { searchTerm: '$searchTerm' })
  wiredOpps(result) {
    this.wiredResult = result;
    console.log('Wired result:', result);
    if (result.data) {
      this.data = result.data.map(rec => ({
        Id: rec.Id,
        Name: rec.Name,
        NameUrl: `/lightning/r/Opportunity/${rec.Id}/view`,

        AccountName: rec.Account?.Name,
        AccountUrl: rec.AccountId
          ? `/lightning/r/Account/${rec.AccountId}/view`
          : '',

        StageName: rec.StageName,
        Status__c: rec.Status__c,
        CloseDate: rec.CloseDate,
        Amount: rec.Amount
      }));
    } else if (result.error) {
      console.error(result.error);
    }
  }
  /* ===================== SEARCH ===================== */
  handleSearch(event) {
     console.log('SEARCH EVENT RECEIVED:', event.detail);
    const value = event.detail.value;
    console.log('SETTING searchTerm:', JSON.stringify(value));
      this.searchTerm = value;
    };



  /* ===== TOOLBAR ACTION CONFIG ===== */
  actions = [
    { name: "edit", icon: "utility:edit", label: "Edit" },
    { name: "delete", icon: "utility:delete", label: "Delete" }
  ];



  
  /* ===== HANDLERS ===== */




handleRowSelection(event) {
  console.log('🔥 PARENT rows:', event.detail.selectedRows);
   this.selectedRows = event.detail?.selectedRows ?? [];
  console.log('selectedRows:', this.selectedRows);
}


  handleAction(event) {
    const { action } = event.detail;

    switch (action) {
      case "refresh":
        this.refreshData();
        break;
      case "edit":
        this.editSelected();
        break;
      case "delete":
        this.deleteSelected();
        break;
      default:
        console.log("Unknown action:", action);
    }
  }

isLoading = false;
  refreshData() {
  this.isLoading = true;

  return refreshApex(this.wiredResult)
    .finally(() => {
      this.isLoading = false;
    });
}

  editSelected() {
    console.log("Edit selected record");
  }

  
  deleteSelected() {
    const rows = this.selectedRows;
    if (!this.selectedRows || this.selectedRows.length === 0) {
        this.showToast(
            'No records selected',
            'Please select at least one record to delete.',
            'warning'
        );
        return; 
    }
    const ids = rows.map(row => row.Id);
    this.isLoading = true;
    
    console.log(
  'DELETE clicked, selectedRows:',
  this.selectedRows,
  Array.isArray(this.selectedRows)
);
    deleteOpportunities({ opportunityIds: ids }).then(() => {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Success",
          message: `${ids.length} opportunities deleted`,
          variant: "success"
        })
      );
      this.selectedRows = [];
      return refreshApex(this.wiredResult);
    })
    .catch(error => {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Error deleting opportunities",
          message: error.body?.message || error.message,
          variant: "error"
        })
      );
    })
    .finally(() => {
      this.isLoading = false;
    });
  }

  viewRow(row) {
    if (!row?.Id) return;
    this[NavigationMixin.Navigate]({
      type: 'standard__recordPage',
      attributes: {
        recordId: row.Id,
        objectApiName: 'Opportunity',
        actionName: 'view'
      }
    });
  }

  deleteRow(row){
    deleteOpportunity({ opportunityId: row.Id })
      .then(() => {
        this.dispatchEvent(
          new ShowToastEvent({
            title: 'Success',
            message: 'Opportunity deleted',
            variant: 'success'
          })
        );
        return refreshApex(this.wiredResult);
      })
      .catch(error => {
        this.dispatchEvent(
          new ShowToastEvent({
            title: 'Error deleting opportunity',
            message: error.body?.message || error.message,
            variant: 'error'
          })
        );
      });
  }

  handleRowAction(event) {
  const { action, row } = event.detail;

  switch (action.name) {
    case "edit":
      console.log("Edit row", row);
      break;
    case "delete":
      this.deleteRow(row);
      break;
    case "view":
      this.viewRow(row);
      break;
      default:
      console.log("Unknown row action:", action.name);
  }
}




draftValues = [];
  async handleSave(event) {
  const drafts = event.detail.draftValues;
  if (!drafts.length) return;

  try {
    await Promise.all(
      drafts.map(d =>
        updateRecord({ fields: { ...d } })
      )
    );

    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Success',
        message: 'Saved',
        variant: 'success'
      })
    );

    this.draftValues = [];

    await refreshApex(this.wiredResult);

  } catch (e) {
    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Error',
        message: e.body?.message || e.message,
        variant: 'error'
      })
    );
  }
}
}