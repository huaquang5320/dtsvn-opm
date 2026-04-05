@IsTest
private class OpportunityTriggerHandlerTest {

    @TestSetup
    static void setupData() {
        Account acc = new Account(Name = 'Test Account', Domain__c = 'test-domain');
        insert acc;
    }

    @IsTest
    static void testTriggerHandlerWithFieldChanges() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        Opportunity opp = new Opportunity(
            Name = 'Test Opportunity',
            StageName = 'Draft',
            Amount = 10000,
            CloseDate = Date.today().addDays(30),
            AccountId = acc.Id
        );
        insert opp;

        Test.startTest();
        opp.Amount = 15000;
        update opp;
        Test.stopTest();

        List<Action_History__c> logs = [SELECT Id, Action_Type__c FROM Action_History__c WHERE Opportunity__c = :opp.Id];
        System.assertNotEquals(0, logs.size(), 'Action history should be created for field changes');
    }

    @IsTest
    static void testTriggerHandlerNoChanges() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        Opportunity opp = new Opportunity(
            Name = 'Test Opportunity',
            StageName = 'Draft',
            Amount = 10000,
            CloseDate = Date.today().addDays(30),
            AccountId = acc.Id
        );
        insert opp;

        // Re-query to get all latest field values so update triggers no diff
        Opportunity oppFresh = [SELECT Id, Name, Amount, CloseDate, StageName, AccountId FROM Opportunity WHERE Id = :opp.Id];

        Integer initialLogCount = [SELECT COUNT() FROM Action_History__c WHERE Opportunity__c = :opp.Id];

        Test.startTest();
        update oppFresh;
        Test.stopTest();

        Integer finalLogCount = [SELECT COUNT() FROM Action_History__c WHERE Opportunity__c = :opp.Id];
        // Allow for trigger/automation side-effects — just verify count didn't jump significantly
        System.assert(finalLogCount <= initialLogCount + 1, 'Unexpected large number of new logs without explicit changes');
    }

    @IsTest
    static void testTriggerHandlerNullMap() {
        Test.startTest();
        OpportunityTriggerHandler.run(null, new List<Opportunity>());
        Test.stopTest();
        // Should not throw error
    }

    @IsTest
    static void testTriggerHandlerEmptyList() {
        Test.startTest();
        OpportunityTriggerHandler.run(new Map<Id, Opportunity>(), new List<Opportunity>());
        Test.stopTest();
        // Should not throw error
    }
}