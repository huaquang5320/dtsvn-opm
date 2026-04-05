global with sharing class IMAccountIngestServiceSoap {
    // SOAP-exposed DTO mirroring IMAccountIngestService.AccountDTO
    global class AccountDTO {
        public String name;
        public String domain;
        public String countryCode;
        public Boolean inGroup;
        public String sourceReference;

        global AccountDTO() {}
    }

    // SOAP-exposed result item mirroring IMAccountIngestService.IngestResultItem
    global class IngestResultItem {
        public Boolean success;
        public String message;
        public String accountId;
        public String sourceReference;
        public String upsertKey;
        public String status;

        global IngestResultItem() {}
    }

    // SOAP-exposed wrapper result mirroring IMAccountIngestService.IngestResult
    global class IngestResult {
        public List<IngestResultItem> results;
        public Integer totalProcessed;
        public Integer totalSucceeded;
        public Integer totalFailed;

        global IngestResult() {}
    }

    // Single SOAP entry point (no DML/SOQL/business logic; delegate to internal service)
    webservice static IngestResult ingest(List<AccountDTO> dtos) {
        // Map inbound SOAP DTOs to internal service DTOs
        List<IMAccountIngestService.AccountDTO> internalDtos = new List<IMAccountIngestService.AccountDTO>();
        if (dtos != null) {
            for (AccountDTO d : dtos) {
                IMAccountIngestService.AccountDTO x = new IMAccountIngestService.AccountDTO();
                x.name = d != null ? d.name : null;
                x.domain = d != null ? d.domain : null;
                x.countryCode = d != null ? d.countryCode : null;
                x.inGroup = d != null ? d.inGroup : null;
                x.sourceReference = d != null ? d.sourceReference : null;
                internalDtos.add(x);
            }
        }

        // Delegate to internal ingestion service (contains all business logic, validation, CRUD/FLS, logging)
        IMAccountIngestService.IngestResult internalRes = IMAccountIngestService.ingest(internalDtos);

        // Map internal response to SOAP response structure
        IngestResult outRes = new IngestResult();
        outRes.results = new List<IngestResultItem>();
        outRes.totalProcessed = internalRes != null ? internalRes.totalProcessed : 0;
        outRes.totalSucceeded = internalRes != null ? internalRes.totalSucceeded : 0;
        outRes.totalFailed = internalRes != null ? internalRes.totalFailed : 0;

        if (internalRes != null && internalRes.results != null) {
            for (IMAccountIngestService.IngestResultItem i : internalRes.results) {
                IngestResultItem oi = new IngestResultItem();
                if (i != null) {
                    oi.success = i.success;
                    oi.message = i.message;
                    oi.accountId = i.accountId;
                    oi.sourceReference = i.sourceReference;
                    oi.upsertKey = i.upsertKey;
                    oi.status = i.status;
                }
                outRes.results.add(oi);
            }
        }

        return outRes;
    }
}