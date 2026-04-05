import { LightningElement, api } from 'lwc';

export default class OpenAccountButton extends LightningElement {

    @api recordId; // nhận từ Flow lookup binding

    showModal = false;

    get isButtonDisabled() {
        return !this.recordId;
    }

    handleClick() {
        if (!this.recordId) return;
        this.showModal = true;
    }

    handleClose() {
        this.showModal = false;
    }
}