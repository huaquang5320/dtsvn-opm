trigger OpportunityTrigger on Opportunity (after update) {
    OpportunityTriggerHandler.run(Trigger.oldMap, Trigger.new);
}