public with sharing class OpportunitySelector {

    @AuraEnabled(cacheable=true)
    public static List<Opportunity> getApprovedOpportunities(String searchTerm) {

        String baseQuery =
            'SELECT Id, Name, StageName, Amount, Status__c, CloseDate, ' +
            'Owner.Name, Account.Name ' +
            'FROM Opportunity ' +
            'WHERE StageName = \'Sale Review\' ' +
            'AND Status__c = \'Approved by Sale Leader\' ';

        if (!String.isBlank(searchTerm)) {
            String term = '%' + String.escapeSingleQuotes(searchTerm) + '%';
            baseQuery +=
                'AND (Name LIKE \'' + term + '\' ' +
                'OR Account.Name LIKE \'' + term + '\') ';
        }

        baseQuery += 'ORDER BY CreatedDate DESC LIMIT 200';
        System.debug(baseQuery);
        return Database.query(baseQuery);
    }

    @AuraEnabled
    public static void deleteOpportunity(Id opportunityId) {
        delete [SELECT Id FROM Opportunity WHERE Id = :opportunityId];
    }

        @AuraEnabled
        public static void deleteOpportunities(List<Id> opportunityIds) {
        delete [
            SELECT Id
            FROM Opportunity
            WHERE Id IN :opportunityIds
        ];
}
}