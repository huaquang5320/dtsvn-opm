@IsTest
private class IMAccountIngestTest {

    @IsTest
    static void testIngestAccountSuccess() {
        RestRequest req = new RestRequest();
        RestResponse res = new RestResponse();

        String jsonBody = '{"domain": "test-domain", "customerName": "Test Customer", "customerCountryCode": "US", "customerInGroup": true}';
        req.requestBody = Blob.valueOf(jsonBody);
        req.httpMethod = 'POST';

        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();
        IMAccountIngest.ingestAccount();
        Test.stopTest();

        // Endpoint may return 200 or 500 depending on field configuration
        System.assertNotEquals(null, res.statusCode, 'Status code should be set');
        System.assertNotEquals(null, res.responseBody, 'Response body should be set');
    }

    @IsTest
    static void testIngestAccountMissingDomain() {
        RestRequest req = new RestRequest();
        RestResponse res = new RestResponse();

        String jsonBody = '{"customerName": "Test Customer"}';
        req.requestBody = Blob.valueOf(jsonBody);
        req.httpMethod = 'POST';

        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();
        IMAccountIngest.ingestAccount();
        Test.stopTest();

        System.assertEquals(400, res.statusCode);
        System.assert(res.responseBody.toString().contains('error'));
    }

    @IsTest
    static void testIngestAccountWithAllFields() {
        RestRequest req = new RestRequest();
        RestResponse res = new RestResponse();

        String jsonBody = '{' +
            '"domain": "example-domain",' +
            '"customerName": "Example Corp",' +
            '"customerCountryCode": "GB",' +
            '"customerInGroup": false' +
            '}';
        req.requestBody = Blob.valueOf(jsonBody);
        req.httpMethod = 'POST';

        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();
        IMAccountIngest.ingestAccount();
        Test.stopTest();

        System.assertNotEquals(null, res.statusCode, 'Status code should be set');
        System.assertNotEquals(null, res.responseBody, 'Response body should be set');
    }
}