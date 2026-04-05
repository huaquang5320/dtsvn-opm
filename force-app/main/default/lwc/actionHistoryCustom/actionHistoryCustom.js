import { LightningElement, api, track, wire } from "lwc";
import { getRelatedListRecords } from "lightning/uiRelatedListApi";
import { refreshApex } from "@salesforce/apex";

export default class ActionHistoryCustom extends LightningElement {
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

  // ── Phân trang ──────────────────────────────────────────────
  currentPage = 1;
  pageSize = 10; // mặc định 10 bản ghi mỗi trang

  /** Toàn bộ bản ghi đã lọc + sắp xếp (trước khi phân trang) */
  _pagedRecords = [];

  get totalRecords() {
    return this._pagedRecords.length;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  get isFirstPage() {
    return this.currentPage <= 1;
  }

  get isLastPage() {
    return this.currentPage >= this.totalPages;
  }

  get pageSizeOptions() {
    return [
      { label: "10", value: 10, checked: this.pageSize === 10 },
      { label: "20", value: 20, checked: this.pageSize === 20 },
      { label: "50", value: 50, checked: this.pageSize === 50 },
      { label: "100", value: 100, checked: this.pageSize === 100 }
    ];
  }

  // ── Wire ─────────────────────────────────────────────────────
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
      "Không thể tải lịch sử hành động. Vui lòng kiểm tra relatedListId và phân quyền.";
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

  // ── Getters trạng thái UI ─────────────────────────────────────
  get hasItems() {
    return this.items.length > 0;
  }

  get subtitle() {
    const total = this.rawRecords?.length || 0;
    if (!total) return "";
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalRecords);
    return `Trang ${this.currentPage} / ${this.totalPages} · Bản ghi ${start}–${end} trong ${this.totalRecords} (lọc từ ${total} bản ghi)`;
  }

  get showEmptyState() {
    return !this.isLoading && !this.hasItems && !this.errorMessage;
  }

  get showPagination() {
    return !this.isLoading && this.totalPages > 1;
  }

  get pageInfo() {
    return `${this.currentPage} / ${this.totalPages}`;
  }

  // ── Xử lý hành động người dùng ─────────────────────────────────
  handleSortSelect(event) {
    this.sortMode = event.detail.value;
    this.currentPage = 1;
    this.buildTimeline();
  }

  handleFilterSelect(event) {
    this.filterMode = event.detail.value;
    this.currentPage = 1;
    this.buildTimeline();
  }

  handlePageSizeSelect(event) {
    this.pageSize = Number(event.detail.value);
    this.currentPage = 1;
    this.buildTimeline();
  }

  handlePrevPage() {
    if (!this.isFirstPage) {
      this.currentPage -= 1;
      this._applyPage();
    }
  }

  handleNextPage() {
    if (!this.isLastPage) {
      this.currentPage += 1;
      this._applyPage();
    }
  }

  // ── Logic render chính ─────────────────────────────────────

  buildTimeline() {
    const normalizedRecords = this.normalizeRecords(this.rawRecords);
    const filteredRecords = this.applyFilters(normalizedRecords, this.filterMode);
    const sortedRecords = this.applySorting(filteredRecords, this.sortMode);

    this._pagedRecords = sortedRecords;
    this._applyPage();
  }

  /** Cắt _pagedRecords theo trang hiện tại và render */
  _applyPage() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.items = this.toTimelineItems(this._pagedRecords.slice(start, end));
  }

  // ── 1) UI API -> plain objects ───────────────────────────────

  readFieldValue(record, fieldName) {
    return record?.fields?.[fieldName]?.value ?? null;
  }

  readFieldDisplayValue(record, fieldName) {
    const field = record?.fields?.[fieldName];
    return field?.displayValue ?? field?.value ?? null;
  }

  normalizeRecords(uiApiRecords) {
    if (!uiApiRecords) return [];

    return (uiApiRecords || []).map((record) => {
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
  }

  // ── 2) Lọc ────────────────────────────────────────────────

  applyFilters(records, filterMode) {
    if (filterMode === "STATUS") {
      return records.filter((r) => r.oldStatus || r.newStatus);
    }
    if (filterMode === "STAGE") {
      return records.filter((r) => r.oldStage || r.newStage);
    }
    if (filterMode === "CREATED") {
      return records.filter((r) => r.actionType === "Created");
    }
    return records; // ALL
  }

  // ── 3) Sắp xếp ──────────────────────────────────────────────

  applySorting(records, sortMode) {
    return [...records].sort((left, right) => {
      const l = left.actionTime ? new Date(left.actionTime).getTime() : 0;
      const r = right.actionTime ? new Date(right.actionTime).getTime() : 0;
      return sortMode === "OLDEST" ? l - r : r - l;
    });
  }

  // ── 4) Plain objects -> UI items ─────────────────────────────

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

  // ── Ánh xạ UI ────────────────────────────────────────────

  getTitle(actionType) {
    if (actionType === "Created") return "Cơ hội đã được tạo";
    if (actionType === "Status Updated") return "Cập nhật trạng thái";
    if (actionType === "Stage Updated") return "Cập nhật giai đoạn";
    if (actionType === "Status & Stage Updated") return "Cập nhật trạng thái & giai đoạn";
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