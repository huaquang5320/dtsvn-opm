@isTest
private class OpportunityCrossSearchControllerTest {

    @TestSetup
    static void setupData() {
        // Account
        Account acc = new Account(Name = 'Acme Corporation', Domain__c = 'acme');
        insert acc;

        // Opportunity
        Opportunity opp = new Opportunity(
            Name = 'Test Opp Acme',
            StageName = 'Draft',
            CloseDate = Date.today().addDays(30),
            AccountId = acc.Id
        );
        insert opp;

        // Candidate linked to Opportunity
        Candidate__c cand = new Candidate__c(
            Name = 'John Candidate',
            Opportunity__c = opp.Id,
            Seniority__c = 'Senior(7+ years)'
        );
        insert cand;

        // Employee
        Employee__c emp = new Employee__c(
            Name = 'Jane Employee',
            Position__c = 'Dev',
            Sub_Position__c = 'Dev Leader'
        );
        insert emp;
    }

    @isTest
    static void testSearchWithValidKeyword() {
        // SOSL requires setting fixed search results in test context
        List<Account> accs = [SELECT Id FROM Account LIMIT 1];
        List<Opportunity> opps = [SELECT Id FROM Opportunity LIMIT 1];
        List<Candidate__c> cands = [SELECT Id FROM Candidate__c LIMIT 1];
        List<Employee__c> emps = [SELECT Id FROM Employee__c LIMIT 1];

        List<Id> fixedSearchResults = new List<Id>();
        fixedSearchResults.add(opps[0].Id);
        fixedSearchResults.add(accs[0].Id);
        fixedSearchResults.add(cands[0].Id);
        fixedSearchResults.add(emps[0].Id);

        Test.setFixedSearchResults(fixedSearchResults);

        Test.startTest();
        OpportunityCrossSearchController.SearchResultsWrapper result =
            OpportunityCrossSearchController.search('Acme');
        Test.stopTest();

        System.assertNotEquals(null, result, 'Result should not be null');
        System.assertEquals(true, result.hasResults, 'Should have results');
        System.assert(result.opportunityCount > 0, 'Should find opportunities');
        System.assert(result.accountCount > 0, 'Should find accounts');
        System.assert(result.candidateCount > 0, 'Should find candidates');
        System.assert(result.employeeCount > 0, 'Should find employees');
        System.assertEquals('', result.error, 'Should have no error');
    }

    @isTest
    static void testSearchBlankKeyword() {
        Test.startTest();
        OpportunityCrossSearchController.SearchResultsWrapper result =
            OpportunityCrossSearchController.search('');
        Test.stopTest();

        System.assertEquals(false, result.hasResults, 'Blank keyword should return no results');
        System.assertEquals(0, result.opportunityCount);
    }

    @isTest
    static void testSearchNullKeyword() {
        Test.startTest();
        OpportunityCrossSearchController.SearchResultsWrapper result =
            OpportunityCrossSearchController.search(null);
        Test.stopTest();

        System.assertEquals(false, result.hasResults, 'Null keyword should return no results');
    }

    @isTest
    static void testSearchSingleCharKeyword() {
        Test.startTest();
        OpportunityCrossSearchController.SearchResultsWrapper result =
            OpportunityCrossSearchController.search('A');
        Test.stopTest();

        System.assertEquals(false, result.hasResults, 'Single char should return no results');
    }

    @isTest
    static void testSearchNoResults() {
        Test.setFixedSearchResults(new List<Id>());

        Test.startTest();
        OpportunityCrossSearchController.SearchResultsWrapper result =
            OpportunityCrossSearchController.search('XYZNoMatch123');
        Test.stopTest();

        System.assertEquals(false, result.hasResults, 'Should have no results');
        System.assertEquals(0, result.opportunityCount);
        System.assertEquals(0, result.accountCount);
        System.assertEquals(0, result.candidateCount);
        System.assertEquals(0, result.employeeCount);
    }

    @isTest
    static void testSearchSpecialCharacters() {
        Test.setFixedSearchResults(new List<Id>());

        Test.startTest();
        OpportunityCrossSearchController.SearchResultsWrapper result =
            OpportunityCrossSearchController.search('test&special!chars');
        Test.stopTest();

        System.assertNotEquals(null, result, 'Should handle special chars without error');
    }

    @isTest
    static void testSearchOnlyAccounts() {
        List<Account> accs = [SELECT Id FROM Account LIMIT 1];
        Test.setFixedSearchResults(new List<Id>{ accs[0].Id });

        Test.startTest();
        OpportunityCrossSearchController.SearchResultsWrapper result =
            OpportunityCrossSearchController.search('Acme');
        Test.stopTest();

        System.assert(result.accountCount > 0, 'Should find accounts');
        // Account search should also pull related Opportunities
        System.assert(result.opportunityCount > 0, 'Should find related opps via account');
    }

    @isTest
    static void testSearchOnlyCandidates() {
        List<Candidate__c> cands = [SELECT Id FROM Candidate__c LIMIT 1];
        Test.setFixedSearchResults(new List<Id>{ cands[0].Id });

        Test.startTest();
        OpportunityCrossSearchController.SearchResultsWrapper result =
            OpportunityCrossSearchController.search('John');
        Test.stopTest();

        System.assert(result.candidateCount > 0, 'Should find candidates');
        // Candidate linked to Opp should also pull that Opp
        System.assert(result.opportunityCount > 0, 'Should find linked opp via candidate');
    }

    @isTest
    static void testSearchOnlyEmployees() {
        List<Employee__c> emps = [SELECT Id FROM Employee__c LIMIT 1];
        Test.setFixedSearchResults(new List<Id>{ emps[0].Id });

        Test.startTest();
        OpportunityCrossSearchController.SearchResultsWrapper result =
            OpportunityCrossSearchController.search('Jane');
        Test.stopTest();

        System.assert(result.employeeCount > 0, 'Should find employees');
    }

    @isTest
    static void testDtoConstructors() {
        Account acc = [SELECT Id, Name FROM Account LIMIT 1];
        Opportunity opp = [SELECT Id, Name, StageName, AccountId, Account.Name FROM Opportunity LIMIT 1];
        Candidate__c cand = [SELECT Id, Name, Opportunity__c, Opportunity__r.Name, Experience__c, Seniority__c FROM Candidate__c LIMIT 1];
        Employee__c emp = [SELECT Id, Name, Sub_Position__c FROM Employee__c LIMIT 1];

        OpportunityCrossSearchController.OpportunitySearchResult oppResult =
            new OpportunityCrossSearchController.OpportunitySearchResult(opp);
        System.assertEquals(opp.Id, oppResult.opportunityId);
        System.assertEquals('Opportunity', oppResult.type);
        System.assertNotEquals(null, oppResult.description);

        OpportunityCrossSearchController.AccountSearchResult accResult =
            new OpportunityCrossSearchController.AccountSearchResult(acc);
        System.assertEquals(acc.Id, accResult.accountId);
        System.assertEquals('Account', accResult.type);

        OpportunityCrossSearchController.CandidateSearchResult candResult =
            new OpportunityCrossSearchController.CandidateSearchResult(cand);
        System.assertEquals(cand.Id, candResult.candidateId);
        System.assertEquals('Candidate__c', candResult.type);

        OpportunityCrossSearchController.EmployeeSearchResult empResult =
            new OpportunityCrossSearchController.EmployeeSearchResult(emp);
        System.assertEquals(emp.Id, empResult.employeeId);
        System.assertEquals('Dev Leader', empResult.subPosition);
        System.assertEquals('Employee__c', empResult.type);
    }
}