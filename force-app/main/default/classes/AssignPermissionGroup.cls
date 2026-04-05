public with sharing class AssignPermissionGroup {

    public class FlowVisibleException extends Exception {}

    @InvocableMethod(label='Assign PSG from Current User Selection')
    public static void assign() {

        // 1) Read the selected Employee Id from the *current shared User*
        User u = [
            SELECT Id, Current_Employee_Id__c
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        if (String.isBlank(u.Current_Employee_Id__c)) {
            throw new FlowVisibleException(
                'No current employee selected for this shared account. ' +
                'Please run the "Select Operator" flow first.'
            );
        }

        // 2) Query the employee record (no reliance on Is_Current_User__c)
        Employee__c emp = [
            SELECT Id, Sub_Position__c
            FROM Employee__c
            WHERE Id = :u.Current_Employee_Id__c
            LIMIT 1
        ];

        Map<String, String> mapRoleToPsg = new Map<String, String>{
            'Sale PIC'      => 'PSG_SALE_PIC',
            'Sale Manager'  => 'PSG_SALE_MANAGER',
            'Sale Leader'   => 'PSG_SALE_LEADER',
            'Dev Pic'       => 'PSG_DEV_PIC',
            'Dev Manager'   => 'PSG_DEV_MANAGER',
            'Dev Leader'    => 'PSG_DEV_LEADER'
        };

        String psgDevName = mapRoleToPsg.get(emp.Sub_Position__c);
        if (String.isBlank(psgDevName)) {
            throw new FlowVisibleException('No PSG mapping for Sub_Position__c=[' + emp.Sub_Position__c + ']');
        }

        // 3) Query ALL managed PSGs (for clean switching)
        List<PermissionSetGroup> managedPsgs = [
            SELECT Id, DeveloperName
            FROM PermissionSetGroup
            WHERE DeveloperName IN :mapRoleToPsg.values()
        ];

        Map<String, Id> devNameToId = new Map<String, Id>();
        Set<Id> managedPsgIds = new Set<Id>();
        for (PermissionSetGroup g : managedPsgs) {
            devNameToId.put(g.DeveloperName, g.Id);
            managedPsgIds.add(g.Id);
        }

        Id targetPsgId = devNameToId.get(psgDevName);
        if (targetPsgId == null) {
            throw new FlowVisibleException(
                'PermissionSetGroup not found for DeveloperName=' + psgDevName +
                '. Make sure the PSG exists and is deployed.'
            );
        }

        // 4) Async setup DML
        System.enqueueJob(new AssignPsgJob(UserInfo.getUserId(), targetPsgId, managedPsgIds));
    }

    public class AssignPsgJob implements Queueable {
        private Id userId;
        private Id targetPsgId;
        private Set<Id> managedPsgIds;

        public AssignPsgJob(Id userId, Id targetPsgId, Set<Id> managedPsgIds) {
            this.userId = userId;
            this.targetPsgId = targetPsgId;
            this.managedPsgIds = managedPsgIds == null ? new Set<Id>() : managedPsgIds;
        }

        public void execute(QueueableContext ctx) {

            // Delete old managed PSGs
            if (!managedPsgIds.isEmpty()) {
                List<PermissionSetAssignment> toDelete = [
                    SELECT Id
                    FROM PermissionSetAssignment
                    WHERE AssigneeId = :userId
                    AND PermissionSetGroupId IN :managedPsgIds
                ];
                if (!toDelete.isEmpty()) delete toDelete;
            }

            // Assign the new one
            insert new PermissionSetAssignment(
                AssigneeId = userId,
                PermissionSetGroupId = targetPsgId
            );
        }
    }
}