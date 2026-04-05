@IsTest
private class OpportunityMenuControllerTest {

    @IsTest
    static void testGetMenuTree() {
        Test.startTest();
        List<OpportunityMenuController.StageMenuDTO> menuTree = OpportunityMenuController.getMenuTree();
        Test.stopTest();

        System.assertNotEquals(null, menuTree);
    }

    @IsTest
    static void testStageMenuDTO() {
        OpportunityMenuController.StageMenuDTO stageDTO = new OpportunityMenuController.StageMenuDTO('Prospecting');
        System.assertEquals('Prospecting', stageDTO.label);
        System.assertEquals(0, stageDTO.children.size());
    }

    @IsTest
    static void testMenuItemDTO() {
        OpportunityMenuController.MenuItemDTO menuItem = new OpportunityMenuController.MenuItemDTO(
            'Test Label',
            'Action',
            'Value'
        );
        System.assertEquals('Test Label', menuItem.label);
        System.assertEquals('Action', menuItem.actionType);
        System.assertEquals('Value', menuItem.actionValue);
    }

    @IsTest
    static void testStageMenuDTOWithChildren() {
        OpportunityMenuController.StageMenuDTO stageDTO = new OpportunityMenuController.StageMenuDTO('Prospecting');
        OpportunityMenuController.MenuItemDTO menuItem = new OpportunityMenuController.MenuItemDTO(
            'Menu Item',
            'Type',
            'Value'
        );
        stageDTO.children.add(menuItem);
        System.assertEquals(1, stageDTO.children.size());
        System.assertEquals('Menu Item', stageDTO.children[0].label);
    }
}