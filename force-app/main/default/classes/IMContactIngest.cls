@RestResource(urlMapping='/IMContactIngest')
global with sharing class IMContactIngest {

    @HttpPost
    global static void ingestContact() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        try {
            Map<String, Object> body =
                (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());

            // Validate required fields
            if (body.get('email') == null) {
                res.statusCode = 400;
                res.responseBody =
                    Blob.valueOf('{"error":"Missing required field: email"}');
                return;
            }

            // ---- Resolve Account by domain ----
            Id accountId;
            if (body.containsKey('company')) {
                Map<String, Object> company =
                    (Map<String, Object>) body.get('company');

                String domain = (String) company.get('domain');
                if (String.isNotBlank(domain)) {
                    List<Account> accs = [
                        SELECT Id
                        FROM Account
                        WHERE Domain__c = :domain
                        LIMIT 1
                    ];
                    if (!accs.isEmpty()) {
                        accountId = accs[0].Id;
                    }else{
                        Account newAccount  = new Account();
                        newAccount.Name = (String) company.get('name');
                        newAccount.Domain__c = (String) company.get('domain');
                        newAccount.Is_Internal_Group__c = (Boolean) company.get('isInternalGroup');
                        insert newAccount;
                        accountId = newAccount.Id;
                    }
                }
            }

            // ---- Build Contact ----
            Contact c = new Contact();
            c.HubSpot_Contact_ID__c = (String) body.get('hubspotContactId');
            c.FirstName = (String) body.get('firstName');
            c.LastName = (String) body.get('lastName');
            c.Department = (String) body.get('department');
            c.Title = (String) body.get('jobTitle');
            c.Email = (String) body.get('email');
            c.Description = (String) body.get('note');

            if (accountId != null) {
                c.AccountId = accountId;
            }

            upsert c HubSpot_Contact_ID__c;

            res.statusCode = 200;
            res.responseBody =
                Blob.valueOf('{"success": true, "contactId": "' + c.Id + '"}');

        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody =
                Blob.valueOf('{"error": "' + e.getMessage() + '"}');
        }
    }
}