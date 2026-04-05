import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';

export default class NewOpportunityAction extends LightningElement {
    @track selectedAccountId = null;
    @track isLoading = false;

    get isViewAccountDisabled() {
        return !this.selectedAccountId;
    }

    handleAccountChange(event) {
        this.selectedAccountId = event.detail.value[0] ?? null;
    }

    handleViewAccount() {
        window.open('/' + this.selectedAccountId, '_blank');
    }

    handleSubmit() {
        this.isLoading = true;
    }

    handleSuccess() {
        this.isLoading = false;
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Thành công',
                message: 'Opportunity đã được tạo',
                variant: 'success'
            })
        );
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    handleError() {
        this.isLoading = false;
    }

    handleCancel() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }
}