import { LightningElement, api, wire } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import USER_ID from "@salesforce/user/Id";
import { getRecord, updateRecord } from "lightning/uiRecordApi";
import CURRENT_EMPLOYEE_FIELD from "@salesforce/schema/User.Current_Employee_Id__c";

import {
  getObjectInfo,
  getPicklistValuesByRecordType
} from "lightning/uiObjectInfoApi";
import OPPORTUNITY_OBJECT from "@salesforce/schema/Opportunity";

// Standard fields
import OPPORTUNITY_ID from "@salesforce/schema/Opportunity.Id";
import OPPORTUNITY_NAME from "@salesforce/schema/Opportunity.Name";
import OPPORTUNITY_ACCOUNT from "@salesforce/schema/Opportunity.AccountId";
import OPPORTUNITY_INDUSTRY from "@salesforce/schema/Opportunity.Industry__c";
import OPPORTUNITY_AMOUNT from "@salesforce/schema/Opportunity.Amount";
import OPPORTUNITY_CLOSEDATE from "@salesforce/schema/Opportunity.CloseDate";
import OPPORTUNITY_CURRENCY from "@salesforce/schema/Opportunity.Currency__c";

// Custom fields
import SHORT_DESCRIPTION from "@salesforce/schema/Opportunity.Short_Description__c";
import QUICK_CONTEXT from "@salesforce/schema/Opportunity.Quick_Note__c";
import FEATURE_CATEGORIES from "@salesforce/schema/Opportunity.Feature_Categories__c";
import TECH_STACK from "@salesforce/schema/Opportunity.Tech_Stack__c";
import PRICING_MODEL from "@salesforce/schema/Opportunity.Pricing_Model__c";
import DELIVERY_MODEL from "@salesforce/schema/Opportunity.Delivery_Model__c";
import ESTIMATED_SCREENS from "@salesforce/schema/Opportunity.Estimated_Screens__c";
import ESTIMATED_APIS from "@salesforce/schema/Opportunity.Estimated_Apis__c";
import TEAM_SIZE_EXPECTED from "@salesforce/schema/Opportunity.Team_Size_Expected__c";
import EXPECTED_START_DATE from "@salesforce/schema/Opportunity.Expected_Start_Date__c";
import EXPECTED_END_DATE from "@salesforce/schema/Opportunity.Expected_End_Date__c";
import HAS_REQUIREMENT_DOC from "@salesforce/schema/Opportunity.Has_Requirement_Document__c";
import NEED_PROPOSAL from "@salesforce/schema/Opportunity.Need_Technical_Proposal__c";
import RISK_LEVEL from "@salesforce/schema/Opportunity.Risk_Level__c";
import RISK_CATEGORIES from "@salesforce/schema/Opportunity.Risk_Categories__c";
import CUSTOMER_CONCERNS from "@salesforce/schema/Opportunity.Customer_Concerns__c";

// Apex
import getDraft from "@salesforce/apex/OpportunityDraftHandler.getDraft";
import upsertDraft from "@salesforce/apex/OpportunityDraftHandler.upsertDraft";

export default class TestDraft extends LightningElement {
  @api recordId;

  sectionKey = "Save";
  loading = false;

  currentEmployeeId;

  // ---- Form state ----
  oppName = "";
  accountId = null;
  industry = "";
  amount = null;
  closeDate = null;
  currencyIsoCode = "";

  shortDescription = "";
  quickContext = "";
  featureCategories = ""; // ✅ textarea string
  techStack = ""; // ✅ textarea string
  pricingModel = "";
  deliveryModel = "";
  estimatedScreens = null;
  estimatedApis = null;
  teamSizeExpected = null;
  expectedStartDate = null;
  expectedEndDate = null;
  hasRequirementDocument = false;
  needProposal = false;

  riskLevel = "";
  riskCategories = ""; // ✅ textarea string
  customerConcerns = "";

  // ---- Options ----
  industryOptions = [];
  currencyOptions = [];
  pricingModelOptions = [];
  deliveryModelOptions = [];
  riskLevelOptions = [];

  // ---- Get current employee id from User ----
  @wire(getRecord, { recordId: USER_ID, fields: [CURRENT_EMPLOYEE_FIELD] })
  wiredUser({ data, error }) {
    if (error) {
      this.toast("Error", this.errMsg(error), "error");
      return;
    }
    if (data) {
      this.currentEmployeeId = data.fields.Current_Employee_Id__c?.value;
      this.loadDraft();
    }
  }

  // ---- Load current Opportunity (prefill UI), then draft can override ----
  @wire(getRecord, {
    recordId: "$recordId",
    fields: [
      OPPORTUNITY_NAME,
      OPPORTUNITY_ACCOUNT,
      OPPORTUNITY_INDUSTRY,
      OPPORTUNITY_AMOUNT,
      OPPORTUNITY_CLOSEDATE,
      OPPORTUNITY_CURRENCY,

      SHORT_DESCRIPTION,
      QUICK_CONTEXT,
      FEATURE_CATEGORIES,
      TECH_STACK,
      PRICING_MODEL,
      DELIVERY_MODEL,
      ESTIMATED_SCREENS,
      ESTIMATED_APIS,
      TEAM_SIZE_EXPECTED,
      EXPECTED_START_DATE,
      EXPECTED_END_DATE,
      HAS_REQUIREMENT_DOC,
      NEED_PROPOSAL,
      RISK_LEVEL,
      RISK_CATEGORIES,
      CUSTOMER_CONCERNS
    ]
  })
  wiredOpp({ data, error }) {
    if (error) {
      this.toast("Error", this.errMsg(error), "error");
      return;
    }

    if (!data) {
      return;
    }

    this.oppName = data.fields.Name?.value ?? this.oppName;
    this.accountId = data.fields.AccountId?.value ?? this.accountId;
    this.industry = data.fields.Industry__c?.value ?? this.industry;
    this.amount = data.fields.Amount?.value ?? this.amount;
    this.closeDate = data.fields.CloseDate?.value ?? this.closeDate;
    this.currencyIsoCode =
      data.fields.Currency__c?.value ?? this.currencyIsoCode;

    this.shortDescription =
      data.fields.Short_Description__c?.value ?? this.shortDescription;
    this.quickContext =
      data.fields.Quick_Context__c?.value ?? this.quickContext;

    // ✅ text areas are strings
    this.featureCategories =
      data.fields.Feature_Categories__c?.value ?? this.featureCategories;
    this.techStack = data.fields.Tech_Stack__c?.value ?? this.techStack;

    this.pricingModel =
      data.fields.Pricing_Model__c?.value ?? this.pricingModel;
    this.deliveryModel =
      data.fields.Delivery_Model__c?.value ?? this.deliveryModel;

    this.estimatedScreens =
      data.fields.Estimated_Screens__c?.value ?? this.estimatedScreens;
    this.estimatedApis =
      data.fields.Estimated_Apis__c?.value ?? this.estimatedApis;
    this.teamSizeExpected =
      data.fields.Team_Size_Expected__c?.value ?? this.teamSizeExpected;

    this.expectedStartDate =
      data.fields.Expected_Start_Date__c?.value ?? this.expectedStartDate;
    this.expectedEndDate =
      data.fields.Expected_End_Date__c?.value ?? this.expectedEndDate;

    this.hasRequirementDocument =
      data.fields.Has_Requirement_Document__c?.value ??
      this.hasRequirementDocument;
    this.needProposal =
      data.fields.Need_Proposal__c?.value ?? this.needProposal;

    this.riskLevel = data.fields.Risk_Level__c?.value ?? this.riskLevel;

    // ✅ text area string
    this.riskCategories =
      data.fields.Risk_Categories__c?.value ?? this.riskCategories;

    this.customerConcerns =
      data.fields.Customer_Concerns__c?.value ?? this.customerConcerns;

    this.loadDraft();
  }

  // ---- Picklists ----
  @wire(getObjectInfo, { objectApiName: OPPORTUNITY_OBJECT })
  objInfo;

  get recordTypeId() {
    return this.objInfo?.data?.defaultRecordTypeId;
  }

  @wire(getPicklistValuesByRecordType, {
    objectApiName: OPPORTUNITY_OBJECT,
    recordTypeId: "$recordTypeId"
  })
  picklists({ data, error }) {
    if (error) {
      this.toast("Error", this.errMsg(error), "error");
      return;
    }

    if (!data?.picklistFieldValues) {
      return;
    }

    const pv = data.picklistFieldValues;

    // Industry / Pricing / Delivery / Risk are picklists
    this.industryOptions = this.toOptions(pv.Industry__c);
    this.pricingModelOptions = this.toOptions(pv.Pricing_Model__c);
    this.deliveryModelOptions = this.toOptions(pv.Delivery_Model__c);
    this.riskLevelOptions = this.toOptions(pv.Risk_Level__c);

    // Currency: only if Currency__c is actually a picklist
    if (pv.Currency__c) {
      this.currencyOptions = this.toOptions(pv.Currency__c);
    }
  }

  toOptions(field) {
    if (!field?.values) return [];
    return field.values.map((v) => ({ label: v.label, value: v.value }));
  }

  // ---- Draft load ----
  async loadDraft() {
    if (!this.recordId || !this.currentEmployeeId) return;

    this.loading = true;
    try {
      const draft = await getDraft({
        opportunityId: this.recordId,
        sectionKey: this.sectionKey
      });

      if (!draft) return;

      if (draft.Employee__c && draft.Employee__c !== this.currentEmployeeId)
        return;

      if (draft.Payload__c) {
        const p = JSON.parse(draft.Payload__c);

        this.oppName = p.Name ?? this.oppName;
        this.accountId = p.AccountId ?? this.accountId;
        this.industry = p.Industry__c ?? p.Industry ?? this.industry;
        this.amount = p.Amount ?? this.amount;
        this.closeDate = p.CloseDate ?? this.closeDate;
        this.currencyIsoCode =
          p.Currency__c ?? p.CurrencyIsoCode ?? this.currencyIsoCode;

        this.shortDescription = p.Short_Description__c ?? this.shortDescription;
        this.quickContext = p.Quick_Context__c ?? this.quickContext;

        this.featureCategories =
          p.Feature_Categories__c ?? this.featureCategories;
        this.techStack = p.Tech_Stack__c ?? this.techStack;

        this.pricingModel = p.Pricing_Model__c ?? this.pricingModel;
        this.deliveryModel = p.Delivery_Model__c ?? this.deliveryModel;

        this.estimatedScreens = p.Estimated_Screens__c ?? this.estimatedScreens;
        this.estimatedApis = p.Estimated_Apis__c ?? this.estimatedApis;
        this.teamSizeExpected =
          p.Team_Size_Expected__c ?? this.teamSizeExpected;

        this.expectedStartDate =
          p.Expected_Start_Date__c ?? this.expectedStartDate;
        this.expectedEndDate = p.Expected_End_Date__c ?? this.expectedEndDate;

        this.hasRequirementDocument =
          p.Has_Requirement_Document__c ?? this.hasRequirementDocument;
        this.needProposal = p.Need_Proposal__c ?? this.needProposal;

        this.riskLevel = p.Risk_Level__c ?? this.riskLevel;
        this.riskCategories = p.Risk_Categories__c ?? this.riskCategories;

        this.customerConcerns = p.Customer_Concerns__c ?? this.customerConcerns;
      }
    } catch (e) {
      this.toast("Error", this.errMsg(e), "error");
    } finally {
      this.loading = false;
    }
  }

  // ---- Change handlers ----
  onOppNameChange = (e) => (this.oppName = e.target.value);
  onAccountChange = (e) => (this.accountId = e.detail.recordId);
  onIndustryChange = (e) => (this.industry = e.detail.value);
  onAmountChange = (e) =>
    (this.amount = e.target.value ? Number(e.target.value) : null);
  onCloseDateChange = (e) => (this.closeDate = e.target.value);
  onCurrencyChange = (e) => (this.currencyIsoCode = e.detail.value);

  onShortDescriptionChange = (e) => (this.shortDescription = e.target.value);
  onQuickContextChange = (e) => (this.quickContext = e.target.value);

  // ✅ textarea => e.target.value
  onFeatureCategoriesChange = (e) => (this.featureCategories = e.target.value);
  onTechStackChange = (e) => (this.techStack = e.target.value);

  onPricingModelChange = (e) => (this.pricingModel = e.detail.value);
  onDeliveryModelChange = (e) => (this.deliveryModel = e.detail.value);

  onEstimatedScreensChange = (e) =>
    (this.estimatedScreens = e.target.value ? Number(e.target.value) : null);
  onEstimatedApisChange = (e) =>
    (this.estimatedApis = e.target.value ? Number(e.target.value) : null);
  onTeamSizeChange = (e) =>
    (this.teamSizeExpected = e.target.value ? Number(e.target.value) : null);

  onExpectedStartDateChange = (e) => (this.expectedStartDate = e.target.value);
  onExpectedEndDateChange = (e) => (this.expectedEndDate = e.target.value);

  onHasRequirementDocumentChange = (e) =>
    (this.hasRequirementDocument = e.target.checked);
  onNeedProposalChange = (e) => (this.needProposal = e.target.checked);

  onRiskLevelChange = (e) => (this.riskLevel = e.detail.value);

  // ✅ textarea => e.target.value
  onRiskCategoriesChange = (e) => (this.riskCategories = e.target.value);

  onCustomerConcernsChange = (e) => (this.customerConcerns = e.target.value);

  buildPayload() {
    return {
      Name: this.oppName,
      AccountId: this.accountId,
      Industry__c: this.industry,
      Amount: this.amount,
      CloseDate: this.closeDate,
      Currency__c: this.currencyIsoCode,

      Short_Description__c: this.shortDescription,
      Quick_Context__c: this.quickContext,

      Feature_Categories__c: this.featureCategories,
      Tech_Stack__c: this.techStack,

      Pricing_Model__c: this.pricingModel,
      Delivery_Model__c: this.deliveryModel,

      Estimated_Screens__c: this.estimatedScreens,
      Estimated_Apis__c: this.estimatedApis,
      Team_Size_Expected__c: this.teamSizeExpected,

      Expected_Start_Date__c: this.expectedStartDate,
      Expected_End_Date__c: this.expectedEndDate,

      Has_Requirement_Document__c: this.hasRequirementDocument,
      Need_Proposal__c: this.needProposal,

      Risk_Level__c: this.riskLevel,
      Risk_Categories__c: this.riskCategories,
      Customer_Concerns__c: this.customerConcerns
    };
  }

  validateRequired() {
    const inputs = this.template.querySelectorAll(
      "lightning-input, lightning-combobox, lightning-textarea, lightning-record-picker"
    );
    return Array.from(inputs).every((i) => i.reportValidity());
  }

  async saveAsDraft() {
    if (!this.validateRequired()) return;
    await this.saveWithStatus("Draft", "Draft saved.");
  }

  async sendForApproval() {
    if (!this.validateRequired()) return;
    if (!this.currentEmployeeId) {
      this.toast("Error", "Current employee is not set on User.", "error");
      return;
    }

    this.loading = true;
    try {
      const fields = {
        [OPPORTUNITY_ID.fieldApiName]: this.recordId,
        [OPPORTUNITY_NAME.fieldApiName]: this.oppName,
        [OPPORTUNITY_ACCOUNT.fieldApiName]: this.accountId,
        [OPPORTUNITY_INDUSTRY.fieldApiName]: this.industry,
        [OPPORTUNITY_AMOUNT.fieldApiName]: this.amount,
        [OPPORTUNITY_CLOSEDATE.fieldApiName]: this.closeDate,
        [OPPORTUNITY_CURRENCY.fieldApiName]: this.currencyIsoCode,

        [SHORT_DESCRIPTION.fieldApiName]: this.shortDescription,
        [QUICK_CONTEXT.fieldApiName]: this.quickContext,

        // ✅ textareas are strings (no join)
        [FEATURE_CATEGORIES.fieldApiName]: this.featureCategories,
        [TECH_STACK.fieldApiName]: this.techStack,

        [PRICING_MODEL.fieldApiName]: this.pricingModel,
        [DELIVERY_MODEL.fieldApiName]: this.deliveryModel,

        [ESTIMATED_SCREENS.fieldApiName]: this.estimatedScreens,
        [ESTIMATED_APIS.fieldApiName]: this.estimatedApis,
        [TEAM_SIZE_EXPECTED.fieldApiName]: this.teamSizeExpected,

        [EXPECTED_START_DATE.fieldApiName]: this.expectedStartDate,
        [EXPECTED_END_DATE.fieldApiName]: this.expectedEndDate,

        [HAS_REQUIREMENT_DOC.fieldApiName]: this.hasRequirementDocument,
        [NEED_PROPOSAL.fieldApiName]: this.needProposal,

        [RISK_LEVEL.fieldApiName]: this.riskLevel,
        [RISK_CATEGORIES.fieldApiName]: this.riskCategories,

        [CUSTOMER_CONCERNS.fieldApiName]: this.customerConcerns
      };

      await updateRecord({ fields });

      await upsertDraft({
        opportunityId: this.recordId,
        sectionKey: this.sectionKey,
        status: "Ready",
        payloadJson: JSON.stringify(this.buildPayload())
      });

      this.toast("Success", "Saved and marked Ready.", "success");
    } catch (e) {
      this.toast("Error", this.errMsg(e), "error");
    } finally {
      this.loading = false;
    }
  }

  async saveWithStatus(status, successMsg) {
    if (!this.currentEmployeeId) {
      this.toast("Error", "Current employee is not set on User.", "error");
      return;
    }

    this.loading = true;
    try {
      await upsertDraft({
        opportunityId: this.recordId,
        sectionKey: this.sectionKey,
        status,
        payloadJson: JSON.stringify(this.buildPayload())
      });
      this.toast("Success", successMsg, "success");
    } catch (e) {
      this.toast("Error", this.errMsg(e), "error");
    } finally {
      this.loading = false;
    }
  }

  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }

  errMsg(e) {
    const body = e?.body;
    if (Array.isArray(body)) return body.map((x) => x.message).join(", ");
    if (body?.message) return body.message;
    return e?.message || "Unknown error";
  }
}