import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import approve from '@salesforce/apex/SaleLeaderApprove.approve';

export default class ConfirmActionModal extends LightningElement {
    @api recordId;
    @api message = 'Xác nhận duyệt cơ hội?';
    isLoading = false;

    handleCancel() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    async handleConfirm() {
        this.isLoading = true;

        try {
            await approve({ recordId: this.recordId });

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Duyệt thành công',
                    variant: 'success'
                })
            );
                this.dispatchEvent(new CloseActionScreenEvent());
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body?.message || 'Có lỗi xảy ra',
                    variant: 'error'
                })
            );
        } finally {
            this.isLoading = false;
        }
    }
}