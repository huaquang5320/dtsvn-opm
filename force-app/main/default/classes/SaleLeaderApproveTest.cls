@IsTest
private class SaleLeaderApproveTest {

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
    static void testApproveOpportunity() {
        Opportunity opp = [SELECT Id, StageName, Status__c FROM Opportunity LIMIT 1];

        Test.startTest();
        SaleLeaderApprove.approve(opp.Id);
        Test.stopTest();

        Opportunity updated = [SELECT Id, StageName, Status__c FROM Opportunity WHERE Id = :opp.Id];
        System.assertEquals('Sale Review', updated.StageName);
    }

    @IsTest
    static void testApproveMultipleOpportunities() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        List<Opportunity> opps = new List<Opportunity>();
        for (Integer i = 0; i < 3; i++) {
            opps.add(new Opportunity(
                Name = 'Test Opp ' + i,
                StageName = 'Draft',
                Amount = 5000 + (i * 1000),
                CloseDate = Date.today().addDays(30),
                AccountId = acc.Id
            ));
        }
        insert opps;

        Test.startTest();
        for (Opportunity opp : opps) {
            SaleLeaderApprove.approve(opp.Id);
        }
        Test.stopTest();

        List<Opportunity> updated = [
            SELECT Id, StageName, Status__c
            FROM Opportunity
            WHERE StageName = 'Sale Review'
        ];
        System.assert(updated.size() > 0, 'At least one opportunity should be updated');
    }
}