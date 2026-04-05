public with sharing class SaleLeaderApprove {
    @AuraEnabled
    public static void  approve(Id recordId) {
        Opportunity opp = [
            SELECT Id, StageName,Status__c
            FROM Opportunity
            WHERE Id = :recordId
            FOR UPDATE
        ];
        opp.StageName = 'Sale Review';
        opp.Status__c = 'Approved by Sale Leader';
        update opp;
    }
}