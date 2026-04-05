import { LightningElement, api, track, wire } from "lwc";
import { getRelatedListRecords } from "lightning/uiRelatedListApi";
import { refreshApex } from "@salesforce/apex";

export default class ActionHistorySideBar extends LightningElement {
  @api recordId;

  relatedListId = "Action_Histories__r";

  fields = [
    "Action_History__c.Id",
    "Action_History__c.Action_Time__c",
    "Action_History__c.Action_Type__c",
    "Action_History__c.Old_Status__c",
    "Action_History__c.New_Status__c",
    "Action_History__c.Old_Stage__c",
    "Action_History__c.New_Stage__c",
    "Action_History__c.Performed_By_User__c",
    "Action_History__c.Performed_By_User__r.Name",
    "Action_History__c.Performed_By_Employee__c",
    "Action_History__c.Performed_By_Employee__r.Name"
  ];

  @track items = [];

  isLoading = true;
  errorMessage = "";

  sortMode = "NEWEST"; // NEWEST | OLDEST
  filterMode = "ALL"; // ALL | STATUS | STAGE | CREATED

  rawRecords = [];

  // Load data using LDS
wiredResult;

@wire(getRelatedListRecords, {
  parentRecordId: "$recordId",
  relatedListId: "$relatedListId",
  fields: "$fields",
  pageSize: 200
})
wiredActionHistories(result) {
  this.wiredResult = result;

  const { error, data } = result;
  this.isLoading = false;

  if (data) {
    this.errorMessage = "";
    this.rawRecords = data.records || [];
    this.buildTimeline();
    return;
  }

  console.error(error);
  this.errorMessage =
    "Failed to load action histories. Check relatedListId and permissions.";
  this.items = [];
}

@api async refresh() {
  if (!this.wiredResult) return;
  this.isLoading = true;
  try {
    await refreshApex(this.wiredResult);
  } finally {
    this.isLoading = false;
  }
}

  // UI state

  get hasItems() {
    return this.items.length > 0;
  }

  get subtitle() {
  const total = this.rawRecords?.length || 0;
  const shown = this.items?.length || 0;
  if (!total) return "";

  const limitText = this.limitMode === "ALL" ? "All" : this.limitMode;
  return `Showing ${shown} of ${total} (Limit: ${limitText})`;
}

  get showEmptyState() {
    return !this.isLoading && !this.hasItems && !this.errorMessage;
  }

  // User actions

  handleSortSelect(event) {
    this.sortMode = event.detail.value;
    this.buildTimeline();
  }

  handleFilterSelect(event) {
    this.filterMode = event.detail.value;
    this.buildTimeline();
  }

  // Core rendering logic

limitMode = "20";

handleLimitSelect(event) {
  this.limitMode = event.detail.value;
  this.buildTimeline();
}



  buildTimeline() {
    const normalizedRecords = this.normalizeRecords(this.rawRecords);
    const filteredRecords = this.applyFilters(
      normalizedRecords,
      this.filterMode
    );
    const sortedRecords = this.applySorting(filteredRecords, this.sortMode);
    const finalRecords =
    this.limitMode === "ALL"
      ? sortedRecords
      : sortedRecords.slice(0, Number(this.limitMode) || 20);
    this.items = this.toTimelineItems(finalRecords);
  }

  // 1) UI API -> objects

  readFieldValue(record, fieldName) {
    return record?.fields?.[fieldName]?.value ?? null;
  }

  readFieldDisplayValue(record, fieldName) {
    const field = record?.fields?.[fieldName];
    return field?.displayValue ?? field?.value ?? null;
  }

  //Map UI API To Object
  normalizeRecords(uiApiRecords) {
    let recordObject = [];

    if (!uiApiRecords) {
      return recordObject;
    }

    recordObject = (uiApiRecords || []).map((record) => {
      const actionType =
        this.readFieldDisplayValue(record, "Action_Type__c") || "Other";

      return {
        id: record.id,
        actionTime: this.readFieldValue(record, "Action_Time__c"),
        actionType,
        oldStatus: this.readFieldDisplayValue(record, "Old_Status__c"),
        newStatus: this.readFieldDisplayValue(record, "New_Status__c"),

        oldStage: this.readFieldDisplayValue(record, "Old_Stage__c"),
        newStage: this.readFieldDisplayValue(record, "New_Stage__c"),

        performedByUserId: this.readFieldValue(record, "Performed_By_User__c"),
        performedByUserName:
          record?.fields?.Performed_By_User__r?.value?.fields?.Name?.value ??
          null,

        performedByEmployeeId: this.readFieldValue(
          record,
          "Performed_By_Employee__c"
        ),
        performedByEmployeeName:
          record?.fields?.Performed_By_Employee__r?.value?.fields?.Name
            ?.value ?? null
      };
    });
    return recordObject;
  }

  // 2) Filter

  applyFilters(records, filterMode) {
    if (filterMode === "STATUS") {
      return records.filter((record) => record.oldStatus || record.newStatus);
    }

    if (filterMode === "STAGE") {
      return records.filter((record) => record.oldStage || record.newStage);
    }

    if (filterMode === "CREATED") {
      return records.filter((record) => record.actionType === "Created");
    }

    return records; // ALL
  }

  // 3) Sort

  applySorting(records, sortMode) {
    const sorted = [...records];

    sorted.sort((left, right) => {
      const leftTime = left.actionTime
        ? new Date(left.actionTime).getTime()
        : 0;
      const rightTime = right.actionTime
        ? new Date(right.actionTime).getTime()
        : 0;

      return sortMode === "OLDEST"
        ? leftTime - rightTime
        : rightTime - leftTime;
    });

    return sorted;
  }

  // 4) Plain objects -> UI items

  toTimelineItems(records) {
    return records.map((record) => ({
      id: record.id,
      actionTime: record.actionTime,
        actionType: record.actionType,
      title: this.getTitle(record.actionType),
      iconName: this.getIcon(record.actionType),

      performedByUserName: record.performedByUserName,
      performedByUserUrl: record.performedByUserId
        ? `/${record.performedByUserId}`
        : null,

      performedByEmployeeName: record.performedByEmployeeName,
      performedByEmployeeUrl: record.performedByEmployeeId
        ? `/${record.performedByEmployeeId}`
        : null,

      showStatusChange: Boolean(record.oldStatus || record.newStatus),
      oldStatus: record.oldStatus,
      newStatus: record.newStatus,

      showStageChange: Boolean(record.oldStage || record.newStage),
      oldStage: record.oldStage,
      newStage: record.newStage
    }));
  }

  // Simple hardcoded UI mapping

  getTitle(actionType) {
    if (actionType === "Created") return "Opportunity created";
    if (actionType === "Status Updated") return "Status updated";
    if (actionType === "Stage Updated") return "Stage updated";
    if (actionType === "Status & Stage Updated")
      return "Status and stage updated";
    return actionType;
  }

  getIcon(actionType) {
    if (actionType === "Created") return "utility:add";
    if (actionType === "Status Updated") return "utility:change_record_type";
    if (actionType === "Stage Updated") return "utility:stage";
    if (actionType === "Status & Stage Updated") return "utility:refresh";
    return "utility:record";
  }
}