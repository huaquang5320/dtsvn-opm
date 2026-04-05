@RestResource(urlMapping='/IMAccountIngest')
global with sharing class IMAccountIngest {
    
    @HttpPost
    global static void ingestAccount() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        
        try {
            Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());
            
            if (body.get('domain') == null) {
                res.statusCode = 400;
                res.responseBody = Blob.valueOf('{"error": "Missing required field: domain"}');
                return;
            }
            
            Account acc = new Account();
            acc.Name = (String) body.get('customerName');
            acc.BillingCountryCode__c = (String) body.get('customerCountryCode');
            acc.Customer_In_Group__c = (Boolean) body.get('customerInGroup');
            // acc.Domain__c = (String) body.get('domain');
            
            upsert acc ;
            
            
            res.statusCode = 200;
            res.responseBody = Blob.valueOf('{"success": true, "accountId": "' + acc.Id + '"}');
            
        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf('{"error": "' + e.getMessage() + '"}');
        }
    }
}