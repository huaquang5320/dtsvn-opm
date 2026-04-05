import { LightningElement, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getMenuTree from '@salesforce/apex/OpportunityMenuController.getMenuTree';

export default class SideMenu extends NavigationMixin(LightningElement) {

    treeItems = [];

    @wire(getMenuTree)
    wiredMenu({ data, error }) {
        if (data) {
            this.treeItems = data.map(stage => ({
                label: stage.label,
                name: stage.label,
                expanded: true,
                items: stage.children.map(item => ({
                    label: item.label,
                    name: `${item.actionType}:${item.actionValue}`,
                    actionType: item.actionType,
                    actionValue: item.actionValue
                }))
            }));
        } else if (error) {
            console.error(error);
        }
    }

    handleSelect(event) {
        const selectedName = event.detail.name;
        const node = this.findNode(this.treeItems, selectedName);
        if (!node) return;

        this.navigate(node);
    }
    navigate(node) {
        switch (node.actionType) {

            case 'ListView':
                this[NavigationMixin.Navigate]({
                    type: 'standard__objectPage',
                    attributes: {
                        objectApiName: 'Opportunity',
                        actionName: 'list'
                    },
                    state: {
                        filterName: node.actionValue
                    }
                });
                break;

            case 'New Create':
                this[NavigationMixin.Navigate]({
                    type: 'standard__objectPage',
                    attributes: {
                        objectApiName: 'Opportunity',
                        actionName: 'new'
                    }
                });
                break;

            case 'RecordPage':
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: node.actionValue,
                        objectApiName: 'Opportunity',
                        actionName: 'view'
                    }
                });
                break;

            case 'Flow':
                this[NavigationMixin.Navigate]({
                    type: 'standard__flow',
                    attributes: {
                        flowApiName: node.actionValue
                    }
                });
                break;

            case 'NavItem':
                this[NavigationMixin.Navigate]({
                    type: 'standard__navItemPage',
                    attributes: {
                        apiName: node.actionValue
                    }
                });
                break;

            case 'URL':
                window.open(node.actionValue, '_self');
                break;

            default:
                console.warn('Unknown action type:', node.actionType);
        }
    }
    findNode(nodes, name) {
        for (const node of nodes) {
            if (node.name === name) return node;
            if (node.items) {
                const found = this.findNode(node.items, name);
                if (found) return found;
            }
        }
        return null;
    }
}