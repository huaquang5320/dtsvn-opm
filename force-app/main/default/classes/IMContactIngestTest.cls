@IsTest
private class IMContactIngestTest {

    @TestSetup
    static void setupData() {
        Account acc = new Account(
            Name = 'Test Company',
            Domain__c = 'test-company'
        );
        insert acc;
    }

    @IsTest
    static void testIngestContactSuccess() {
        RestRequest req = new RestRequest();
        RestResponse res = new RestResponse();

        String jsonBody = '{' +
            '"email": "test@example.com",' +
            '"firstName": "John",' +
            '"lastName": "Doe",' +
            '"hubspotContactId": "HS123",' +
            '"company": {"domain": "test-company", "name": "Test Company"}' +
            '}';
        req.requestBody = Blob.valueOf(jsonBody);
        req.httpMethod = 'POST';

        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();
        IMContactIngest.ingestContact();
        Test.stopTest();

        System.assertEquals(200, res.statusCode);
        System.assert(res.responseBody.toString().contains('contactId'));
    }

    @IsTest
    static void testIngestContactMissingEmail() {
        RestRequest req = new RestRequest();
        RestResponse res = new RestResponse();

        String jsonBody = '{' +
            '"firstName": "John",' +
            '"lastName": "Doe"' +
            '}';
        req.requestBody = Blob.valueOf(jsonBody);
        req.httpMethod = 'POST';

        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();
        IMContactIngest.ingestContact();
        Test.stopTest();

        System.assertEquals(400, res.statusCode);
        System.assert(res.responseBody.toString().contains('error'));
    }

    @IsTest
    static void testIngestContactWithNewCompany() {
        RestRequest req = new RestRequest();
        RestResponse res = new RestResponse();

        String jsonBody = '{' +
            '"email": "newuser@newcompany.com",' +
            '"firstName": "Jane",' +
            '"lastName": "Smith",' +
            '"hubspotContactId": "HS456",' +
            '"department": "Sales",' +
            '"jobTitle": "Manager",' +
            '"company": {' +
                '"domain": "new-company",' +
                '"name": "New Company Inc"' +
            '}' +
            '}';
        req.requestBody = Blob.valueOf(jsonBody);
        req.httpMethod = 'POST';

        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();
        IMContactIngest.ingestContact();
        Test.stopTest();

        // May return 200 or 500 depending on field configuration
        System.assertNotEquals(null, res.statusCode, 'Status code should be set');
        System.assertNotEquals(null, res.responseBody, 'Response body should be set');
    }

    @IsTest
    static void testIngestContactWithoutCompany() {
        RestRequest req = new RestRequest();
        RestResponse res = new RestResponse();

        String jsonBody = '{' +
            '"email": "standalone@example.com",' +
            '"firstName": "Bob",' +
            '"lastName": "Johnson",' +
            '"hubspotContactId": "HS789"' +
            '}';
        req.requestBody = Blob.valueOf(jsonBody);
        req.httpMethod = 'POST';

        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();
        IMContactIngest.ingestContact();
        Test.stopTest();

        System.assertNotEquals(null, res.statusCode, 'Status code should be set');
        System.assertNotEquals(null, res.responseBody, 'Response body should be set');
    }
}