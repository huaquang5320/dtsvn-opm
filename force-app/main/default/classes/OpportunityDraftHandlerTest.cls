@IsTest
private class OpportunityDraftHandlerTest {

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

        Employee__c emp = new Employee__c(Name = 'Test Employee', Position__c = 'Dev', Sub_Position__c = 'Dev Leader');
        insert emp;

        User testUser = [SELECT Id FROM User WHERE Id = :UserInfo.getUserId()];
        testUser.Current_Employee_Id__c = emp.Id;
        update testUser;
    }

    @IsTest
    static void testGetDraftNotExists() {
        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];
        Test.startTest();
        Opportunity_Draft__c draft = OpportunityDraftHandler.getDraft(opp.Id, 'section1');
        Test.stopTest();

        System.assertEquals(null, draft, 'Draft should not exist initially');
    }

    @IsTest
    static void testUpsertDraft() {
        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];

        Test.startTest();
        Id draftId = OpportunityDraftHandler.upsertDraft(
            opp.Id,
            'section1',
            'Draft',
            '{"test": "data"}'
        );
        Test.stopTest();

        System.assertNotEquals(null, draftId, 'Draft ID should not be null');
    }

    @IsTest
    static void testGetDraftAfterInsert() {
        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];

        OpportunityDraftHandler.upsertDraft(
            opp.Id,
            'section1',
            'Draft',
            '{"test": "data"}'
        );

        Test.startTest();
        Opportunity_Draft__c draft = OpportunityDraftHandler.getDraft(opp.Id, 'section1');
        Test.stopTest();

        System.assertNotEquals(null, draft, 'Draft should exist after insert');
    }

    @IsTest
    static void testUpsertDraftMissingOpportunityId() {
        Test.startTest();
        try {
            OpportunityDraftHandler.upsertDraft(
                null,
                'section1',
                'Draft',
                '{"test": "data"}'
            );
            System.assert(false, 'Should throw AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }
        Test.stopTest();
    }

    @IsTest
    static void testUpsertDraftMissingSectionKey() {
        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];

        Test.startTest();
        try {
            OpportunityDraftHandler.upsertDraft(
                opp.Id,
                '',
                'Draft',
                '{"test": "data"}'
            );
            System.assert(false, 'Should throw AuraHandledException');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }
        Test.stopTest();
    }

    @IsTest
    static void testGetDraftNullOpportunityId() {
        Test.startTest();
        Opportunity_Draft__c draft = OpportunityDraftHandler.getDraft(null, 'section1');
        Test.stopTest();

        System.assertEquals(null, draft);
    }

    @IsTest
    static void testGetDraftBlankSectionKey() {
        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];

        Test.startTest();
        Opportunity_Draft__c draft = OpportunityDraftHandler.getDraft(opp.Id, '');
        Test.stopTest();

        System.assertEquals(null, draft);
    }
}