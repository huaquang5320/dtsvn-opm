public with sharing class OpportunityCrossSearchController {

    @AuraEnabled(cacheable=false)
    public static SearchResultsWrapper search(String keyword) {
        SearchResultsWrapper result = new SearchResultsWrapper();

        if (String.isBlank(keyword) || keyword.length() < 2) {
            return result;
        }

        try {
            String searchTerm = escapeSosl(keyword) + '*';

            List<List<SObject>> searchResults = [
                FIND :searchTerm
                IN ALL FIELDS
                RETURNING
                    Opportunity(
                        Id, Name, StageName, AccountId, Account.Name
                        LIMIT 100
                    ),
                    Account(
                        Id, Name
                        LIMIT 50
                    ),
                    Candidate__c(
                        Id, Name, Opportunity__c, Opportunity__r.Name,
                        Experience__c, Seniority__c
                        LIMIT 50
                    ),
                    Employee__c(
                        Id, Name, Sub_Position__c
                        LIMIT 50
                    )
                WITH USER_MODE
            ];

            // ============ Process Opportunities ============
            List<OpportunitySearchResult> oppResults = new List<OpportunitySearchResult>();
            Set<Id> foundOppIds = new Set<Id>();

            for (Opportunity opp : (List<Opportunity>)searchResults[0]) {
                oppResults.add(new OpportunitySearchResult(opp));
                foundOppIds.add(opp.Id);
            }

            // ============ Process Accounts → fetch related Opps ============
            List<AccountSearchResult> accResults = new List<AccountSearchResult>();
            Set<Id> accountIds = new Set<Id>();

            for (Account acc : (List<Account>)searchResults[1]) {
                accResults.add(new AccountSearchResult(acc));
                accountIds.add(acc.Id);
            }
            result.accounts = accResults;
            result.accountCount = accResults.size();

            if (!accountIds.isEmpty()) {
                for (Opportunity opp : [
                    SELECT Id, Name, StageName, AccountId, Account.Name
                    FROM Opportunity
                    WHERE AccountId IN :accountIds
                    WITH USER_MODE
                    LIMIT 100
                ]) {
                    if (!foundOppIds.contains(opp.Id)) {
                        oppResults.add(new OpportunitySearchResult(opp));
                        foundOppIds.add(opp.Id);
                    }
                }
            }

            // ============ Process Candidates → resolve linked Opp ============
            List<CandidateSearchResult> candResults = new List<CandidateSearchResult>();
            Set<Id> candidateLinkedOppIds = new Set<Id>();

            for (Candidate__c cand : (List<Candidate__c>)searchResults[2]) {
                candResults.add(new CandidateSearchResult(cand));
                if (cand.Opportunity__c != null && !foundOppIds.contains(cand.Opportunity__c)) {
                    candidateLinkedOppIds.add(cand.Opportunity__c);
                }
            }
            result.candidates = candResults;
            result.candidateCount = candResults.size();

            if (!candidateLinkedOppIds.isEmpty()) {
                for (Opportunity opp : [
                    SELECT Id, Name, StageName, AccountId, Account.Name
                    FROM Opportunity
                    WHERE Id IN :candidateLinkedOppIds
                    WITH USER_MODE
                    LIMIT 50
                ]) {
                    if (!foundOppIds.contains(opp.Id)) {
                        oppResults.add(new OpportunitySearchResult(opp));
                        foundOppIds.add(opp.Id);
                    }
                }
            }

            // ============ Process Employees → fetch linked Opps ============
            List<EmployeeSearchResult> empResults = new List<EmployeeSearchResult>();
            Set<Id> employeeIds = new Set<Id>();

            for (Employee__c emp : (List<Employee__c>)searchResults[3]) {
                empResults.add(new EmployeeSearchResult(emp));
                employeeIds.add(emp.Id);
            }
            result.employees = empResults;
            result.employeeCount = empResults.size();

            if (!employeeIds.isEmpty()) {
                for (Opportunity opp : [
                    SELECT Id, Name, StageName, AccountId, Account.Name
                    FROM Opportunity
                    WHERE Responsible_Employee__c IN :employeeIds
                       OR Customer_Responsible_Employee__c IN :employeeIds
                    WITH USER_MODE
                    LIMIT 100
                ]) {
                    if (!foundOppIds.contains(opp.Id)) {
                        oppResults.add(new OpportunitySearchResult(opp));
                        foundOppIds.add(opp.Id);
                    }
                }
            }

            result.opportunities = oppResults;
            result.opportunityCount = oppResults.size();

            result.hasResults =
                !oppResults.isEmpty() ||
                !accResults.isEmpty() ||
                !candResults.isEmpty() ||
                !empResults.isEmpty();

        } catch (Exception e) {
            result.error = System.Label.SearchResult_Error + ': ' + e.getMessage();
        }

        return result;
    }

    // ============ DTO Classes ============

    public class SearchResultsWrapper {
        @AuraEnabled public List<OpportunitySearchResult> opportunities = new List<OpportunitySearchResult>();
        @AuraEnabled public List<AccountSearchResult> accounts = new List<AccountSearchResult>();
        @AuraEnabled public List<CandidateSearchResult> candidates = new List<CandidateSearchResult>();
        @AuraEnabled public List<EmployeeSearchResult> employees = new List<EmployeeSearchResult>();

        @AuraEnabled public Integer opportunityCount = 0;
        @AuraEnabled public Integer accountCount = 0;
        @AuraEnabled public Integer candidateCount = 0;
        @AuraEnabled public Integer employeeCount = 0;

        @AuraEnabled public Boolean hasResults = false;
        @AuraEnabled public String error = '';
    }

    public class OpportunitySearchResult {
        @AuraEnabled public Id opportunityId;
        @AuraEnabled public String opportunityName;
        @AuraEnabled public String stageName;
        @AuraEnabled public Id accountId;
        @AuraEnabled public String accountName;
        @AuraEnabled public String type = 'Opportunity';
        @AuraEnabled public String description;

        public OpportunitySearchResult(Opportunity opp) {
            this.opportunityId = opp.Id;
            this.opportunityName = opp.Name;
            this.stageName = opp.StageName;
            this.accountId = opp.AccountId;
            this.accountName = opp.Account?.Name ?? '';
            List<String> parts = new List<String>();
            if (!String.isBlank(this.accountName)) parts.add(this.accountName);
            if (!String.isBlank(this.stageName)) parts.add(this.stageName);
            this.description = String.join(parts, ' • ');
        }
    }

    public class AccountSearchResult {
        @AuraEnabled public Id accountId;
        @AuraEnabled public String accountName;
        @AuraEnabled public String type = 'Account';

        public AccountSearchResult(Account acc) {
            this.accountId = acc.Id;
            this.accountName = acc.Name;
        }
    }

    public class CandidateSearchResult {
        @AuraEnabled public Id candidateId;
        @AuraEnabled public String candidateName;
        @AuraEnabled public Id opportunityId;
        @AuraEnabled public String opportunityName;
        @AuraEnabled public String type = 'Candidate__c';
        @AuraEnabled public String description;

        public CandidateSearchResult(Candidate__c cand) {
            this.candidateId = cand.Id;
            this.candidateName = cand.Name;
            this.opportunityId = cand.Opportunity__c;
            this.opportunityName = cand.Opportunity__r?.Name ?? '';
            List<String> parts = new List<String>();
            if (!String.isBlank(this.opportunityName)) parts.add(this.opportunityName);
            if (!String.isBlank(cand.Seniority__c)) parts.add(cand.Seniority__c);
            this.description = parts.isEmpty() ? '' : String.join(parts, ' • ');
        }
    }

    public class EmployeeSearchResult {
        @AuraEnabled public Id employeeId;
        @AuraEnabled public String employeeName;
        @AuraEnabled public String subPosition;
        @AuraEnabled public String type = 'Employee__c';
        @AuraEnabled public String description;

        public EmployeeSearchResult(Employee__c emp) {
            this.employeeId = emp.Id;
            this.employeeName = emp.Name;
            this.subPosition = emp.Sub_Position__c ?? '';
            this.description = this.subPosition;
        }
    }

    // ============ Utility ============

    private static String escapeSosl(String input) {
        return String.escapeSingleQuotes(input)
            .replaceAll('[&|!{}\\[\\]()^~*?:\\\\"]', '');
    }
}