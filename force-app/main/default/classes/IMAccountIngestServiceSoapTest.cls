@IsTest
private class IMAccountIngestServiceSoapTest {

    @IsTest
    static void testAccountDTOCreation() {
        IMAccountIngestServiceSoap.AccountDTO dto = new IMAccountIngestServiceSoap.AccountDTO();
        dto.name = 'Test Account';
        dto.domain = 'test-domain';
        dto.countryCode = 'US';
        dto.inGroup = true;
        dto.sourceReference = 'REF001';

        System.assertEquals('Test Account', dto.name);
        System.assertEquals('test-domain', dto.domain);
    }

    @IsTest
    static void testIngestResultItemCreation() {
        IMAccountIngestServiceSoap.IngestResultItem item = new IMAccountIngestServiceSoap.IngestResultItem();
        item.success = true;
        item.message = 'Success';
        item.accountId = 'ACC123';

        System.assertEquals(true, item.success);
        System.assertEquals('Success', item.message);
    }

    @IsTest
    static void testIngestResultCreation() {
        IMAccountIngestServiceSoap.IngestResult result = new IMAccountIngestServiceSoap.IngestResult();
        result.totalProcessed = 5;
        result.totalSucceeded = 3;
        result.totalFailed = 2;

        System.assertEquals(5, result.totalProcessed);
        System.assertEquals(3, result.totalSucceeded);
        System.assertEquals(2, result.totalFailed);
    }
}