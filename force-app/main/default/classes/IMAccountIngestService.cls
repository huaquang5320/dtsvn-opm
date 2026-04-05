public with sharing class IMAccountIngestService {

    // DTO for account data
    public class AccountDTO {
        public String name;
        public String domain;
        public String countryCode;
        public Boolean inGroup;
        public String sourceReference;
    }

    // Result item for individual record
    public class IngestResultItem {
        public Boolean success;
        public String message;
        public String accountId;
        public String sourceReference;
        public String upsertKey;
        public String status;
    }

    // Overall result wrapper
    public class IngestResult {
        public List<IngestResultItem> results;
        public Integer totalProcessed;
        public Integer totalSucceeded;
        public Integer totalFailed;

        public IngestResult() {
            this.results = new List<IngestResultItem>();
            this.totalProcessed = 0;
            this.totalSucceeded = 0;
            this.totalFailed = 0;
        }
    }

    // Main ingest method
    public static IngestResult ingest(List<AccountDTO> dtos) {
        IngestResult result = new IngestResult();

        if (dtos == null || dtos.isEmpty()) {
            return result;
        }

        result.totalProcessed = dtos.size();

        for (AccountDTO dto : dtos) {
            IngestResultItem item = new IngestResultItem();

            try {
                if (String.isBlank(dto.domain)) {
                    item.success = false;
                    item.message = 'Missing required field: domain';
                    result.totalFailed++;
                } else {
                    // Create or update account
                    Account acc = new Account();
                    acc.Name = dto.name;
                    acc.Domain__c = dto.domain;
                    acc.BillingCountryCode__c = dto.countryCode;
                    acc.Customer_In_Group__c = dto.inGroup;

                    upsert acc;

                    item.success = true;
                    item.message = 'Account ingested successfully';
                    item.accountId = acc.Id;
                    item.sourceReference = dto.sourceReference;
                    item.status = 'SUCCESS';
                    result.totalSucceeded++;
                }
            } catch (Exception e) {
                item.success = false;
                item.message = 'Error: ' + e.getMessage();
                item.sourceReference = dto.sourceReference;
                item.status = 'ERROR';
                result.totalFailed++;
            }

            result.results.add(item);
        }

        return result;
    }
}