@IsTest
private class OpportunitySelectorTest {

    @TestSetup
    static void setupData() {
        Account acc = new Account(Name = 'Test Account', Domain__c = 'test-domain');
        insert acc;

        Opportunity opp = new Opportunity(
            Name = 'Test Opportunity',
            StageName = 'Draft',
            Amount = 10000,
            CloseDate = Date.today().addDays(30),
            AccountId = acc.Id
        );
        insert opp;
    }

    @IsTest
    static void testGetApprovedOpportunitiesNoSearchTerm() {
        Test.startTest();
        List<Opportunity> results = OpportunitySelector.getApprovedOpportunities('');
        Test.stopTest();

        System.assertNotEquals(null, results);
    }

    @IsTest
    static void testGetApprovedOpportunitiesWithSearchTerm() {
        Test.startTest();
        List<Opportunity> results = OpportunitySelector.getApprovedOpportunities('Test');
        Test.stopTest();

        System.assertNotEquals(null, results);
    }

    @IsTest
    static void testDeleteOpportunity() {
        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];

        Test.startTest();
        OpportunitySelector.deleteOpportunity(opp.Id);
        Test.stopTest();

        List<Opportunity> deleted = [SELECT Id FROM Opportunity WHERE Id = :opp.Id];
        System.assertEquals(0, deleted.size());
    }

    @IsTest
    static void testDeleteOpportunities() {
        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];
        List<Id> oppIds = new List<Id>{ opp.Id };

        Test.startTest();
        OpportunitySelector.deleteOpportunities(oppIds);
        Test.stopTest();

        List<Opportunity> deleted = [SELECT Id FROM Opportunity WHERE Id IN :oppIds];
        System.assertEquals(0, deleted.size());
    }
}