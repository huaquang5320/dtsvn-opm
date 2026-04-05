public with sharing class OpportunityDraftHandler {

  @AuraEnabled(cacheable=true)
  public static Opportunity_Draft__c getDraft(Id opportunityId, String sectionKey) {
    if (opportunityId == null || String.isBlank(sectionKey)) return null;

    String empId = getCurrentEmployeeId();
    if (String.isBlank(empId)) return null;

    sectionKey = sectionKey.trim();
    empId = empId.trim();

    String key = String.valueOf(opportunityId) + ':' + sectionKey + ':' + empId;

    List<Opportunity_Draft__c> rows = [
      SELECT Id, Status__c, Payload__c, Section_Key__c, Opportunity__c, Employee__c, Unique_Key__c
      FROM Opportunity_Draft__c
      WHERE Unique_Key__c = :key
      LIMIT 1
    ];
    return rows.isEmpty() ? null : rows[0];
  }

  @AuraEnabled
  public static Id upsertDraft(Id opportunityId, String sectionKey, String status, String payloadJson) {
    if (opportunityId == null) throw new AuraHandledException('Missing opportunityId');
    if (String.isBlank(sectionKey)) throw new AuraHandledException('Missing sectionKey');

    String empId = getCurrentEmployeeId();
    if (String.isBlank(empId)) throw new AuraHandledException('Current employee is not set on User.');

    sectionKey = sectionKey.trim();
    empId = empId.trim();

    String key = String.valueOf(opportunityId) + ':' + sectionKey + ':' + empId;

    Opportunity_Draft__c d = new Opportunity_Draft__c();
    d.Unique_Key__c = key;              // REQUIRED + External Id + Unique
    d.Opportunity__c = opportunityId;
    d.Section_Key__c = sectionKey;
    d.Employee__c = empId;
    d.Status__c = String.isBlank(status) ? 'Draft' : status;
    d.Payload__c = payloadJson;
    d.Name = key;

    upsert d Unique_Key__c;             // important
    return d.Id;
  }

  private static String getCurrentEmployeeId() {
    User u = [
      SELECT Current_Employee_Id__c
      FROM User
      WHERE Id = :UserInfo.getUserId()
      LIMIT 1
    ];
    return u.Current_Employee_Id__c == null ? null : u.Current_Employee_Id__c.trim();
  }
  
}