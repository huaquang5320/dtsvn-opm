public with sharing class OpportunityTriggerHandler {

    // Guardrails
    private static final Integer MAX_LOGS_PER_RECORD = 40;  // prevent spam per save
    private static final Integer MAX_LOGS_PER_TXN    = 8000; // keep under 10k DML rows
    private static final Integer MAX_TEXT_LEN        = 32000;

    // Skip noise/system fields (add more if needed)
    private static final Set<String> SKIP_FIELDS = new Set<String>{
        'LastModifiedDate','LastModifiedById','SystemModstamp',
        'CreatedDate','CreatedById','IsDeleted',
        'LastActivityDate','LastViewedDate','LastReferencedDate','StageName','Status__c'
    };

    // Optional: skip logging when your own automation updates records
    // Add a checkbox on Opportunity like Skip_Audit__c and uncomment:
    // private static final String BYPASS_FIELD = 'Skip_Audit__c';

    public static void run(Map<Id, Opportunity> oldMap, List<Opportunity> newList) {
        if (oldMap == null || newList == null || newList.isEmpty()) return;

        // Get employee from running user (your model)
        Id runningUserId = UserInfo.getUserId();
        Id employeeId;
        try {
            employeeId = [
                SELECT Current_Employee_Id__c
                FROM User
                WHERE Id = :runningUserId
                LIMIT 1
            ].Current_Employee_Id__c;
        } catch (Exception e) {
            employeeId = null;
        }

        // Describe once
        Map<String, Schema.SObjectField> fieldMap = Schema.SObjectType.Opportunity.fields.getMap();

        List<Action_History__c> logs = new List<Action_History__c>();
        Integer planned = 0;

        for (Opportunity newer : newList) {
            Opportunity older = oldMap.get(newer.Id);
            if (older == null) continue;

            // Optional bypass
            // if ((Boolean)newer.get(BYPASS_FIELD) == true) continue;

            Integer perRec = 0;
            List<Map<String, Object>> overflow = new List<Map<String, Object>>();

            for (String api : fieldMap.keySet()) {
                if (SKIP_FIELDS.contains(api)) continue;

                Schema.DescribeFieldResult d = fieldMap.get(api).getDescribe();

                // Skip calculated/readonly fields
                if (d.isCalculated() || !d.isUpdateable()) continue;

                Object oldVal = older.get(api);
                Object newVal = newer.get(api);

                if (same(oldVal, newVal)) continue;

                // If too many changes, aggregate remainder into JSON
                if (perRec >= MAX_LOGS_PER_RECORD || planned >= MAX_LOGS_PER_TXN) {
                    overflow.add(new Map<String, Object>{
                        'field' => api,
                        'label' => d.getLabel(),
                        'old'   => safe(oldVal),
                        'new'   => safe(newVal)
                    });
                    continue;
                }

                logs.add(new Action_History__c(
                    Opportunity__c = newer.Id,
                    Action_Time__c = System.now(),
                    Action_Type__c = 'FIELD_CHANGE',
                    Field_API_Name__c = api,
                    Field_Label__c = d.getLabel(),
                    Old_Value__c = clip(safe(oldVal)),
                    New_Value__c = clip(safe(newVal)),
                    Performed_By_User__c = runningUserId,
                    Performed_By_Employee__c = employeeId
                ));

                perRec++;
                planned++;
            }

            if (!overflow.isEmpty()) {
                logs.add(new Action_History__c(
                    Opportunity__c = newer.Id,
                    Action_Time__c = System.now(),
                    Action_Type__c = 'FIELD_CHANGE_BULK',
                    Field_Label__c = 'Multiple field changes',
                    Payload__c = clip(JSON.serialize(overflow)),
                    Performed_By_User__c = runningUserId,
                    Performed_By_Employee__c = employeeId
                ));
                planned++;
            }
        }

        if (!logs.isEmpty()) {
            insert logs;
        }
    }

    private static Boolean same(Object a, Object b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return String.valueOf(a) == String.valueOf(b);
    }

    private static String safe(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private static String clip(String s) {
        if (s == null) return null;
        if (s.length() <= MAX_TEXT_LEN) return s;
        return s.substring(0, MAX_TEXT_LEN);
    }
}