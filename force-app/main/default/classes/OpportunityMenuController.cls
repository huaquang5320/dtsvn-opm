public with sharing class OpportunityMenuController {

    @AuraEnabled(cacheable=true)
    public static List<StageMenuDTO> getMenuTree() {

        Map<String, StageMenuDTO> stageMap = new Map<String, StageMenuDTO>();

        for (Side_Menu_Cmdt__mdt m : [
            SELECT Stage__c,
                   Label_Key__c,
                   Action_Type__c,
                   Action_Value__c,
                   Required_Custom_Permissions__c,    // New field only: multiple permissions separated by ';'
                   Sort_Order__c
            FROM Side_Menu_Cmdt__mdt
            WHERE Is_Active__c = true
            ORDER BY Stage__c, Sort_Order__c
        ]) {

            // ==================== PERMISSION CHECK (AND LOGIC) ====================
            boolean hasAllPermissions = true; // Default: allow if no permission is required

            if (!String.isBlank(m.Required_Custom_Permissions__c)) {
                List<String> requiredPerms = m.Required_Custom_Permissions__c.split(';');
                hasAllPermissions = true; // User must have ALL listed permissions to see the menu item

                for (String perm : requiredPerms) {
                    perm = perm.trim();
                    if (String.isNotBlank(perm) && !FeatureManagement.checkPermission(perm)) {
                        hasAllPermissions = false;
                        break; // AND logic: missing even one permission → hide the item
                    }
                }
            }

            if (!hasAllPermissions) {
                continue; // User lacks at least one required permission → skip this menu item
            }
            // ======================================================================

            // Resolve label from Custom Label; fallback to key if not found
            String resolvedLabel;
            try {
                resolvedLabel = Label.get('', m.Label_Key__c);
            } catch (Exception e) {
                resolvedLabel = m.Label_Key__c;
            }

            // Create stage group if it doesn't exist yet
            if (!stageMap.containsKey(m.Stage__c)) {
                stageMap.put(m.Stage__c, new StageMenuDTO(m.Stage__c));
            }

            // Add menu item to the corresponding stage
            stageMap.get(m.Stage__c).children.add(
                new MenuItemDTO(
                    resolvedLabel,
                    m.Action_Type__c,
                    m.Action_Value__c
                )
            );
        }

        return stageMap.values();
    }


    // ==================== DTO CLASSES ====================
    public class StageMenuDTO {
        @AuraEnabled public String label;
        @AuraEnabled public List<MenuItemDTO> children = new List<MenuItemDTO>();

        public StageMenuDTO(String stage) {
            this.label = stage;
        }
    }

    public class MenuItemDTO {
        @AuraEnabled public String label;
        @AuraEnabled public String actionType;
        @AuraEnabled public String actionValue;

        public MenuItemDTO(String label, String actionType, String actionValue) {
            this.label = label;
            this.actionType = actionType;
            this.actionValue = actionValue;
        }
    }
}