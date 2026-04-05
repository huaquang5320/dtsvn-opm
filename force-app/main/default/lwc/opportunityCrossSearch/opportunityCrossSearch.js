import { LightningElement, api, track } from 'lwc';
import search from '@salesforce/apex/OpportunityCrossSearchController.search';
import LANG from '@salesforce/i18n/lang';

import searchPlaceholder from '@salesforce/label/c.SearchPlaceholder_Text';
import headerOpps from '@salesforce/label/c.SearchResultHeader_Opportunities';
import headerAccounts from '@salesforce/label/c.SearchResultHeader_Accounts';
import headerCandidates from '@salesforce/label/c.SearchResultHeader_Candidates';
import headerEmployees from '@salesforce/label/c.SearchResultHeader_Employees';
import noResults from '@salesforce/label/c.SearchResult_NoResults';
import searchError from '@salesforce/label/c.SearchResult_Error';
import searchLoading from '@salesforce/label/c.SearchLoading_Text';

const TYPE_BADGE = {
    'Opportunity':  'CƠ HỘI',
    'Account':      'KH',
    'Candidate__c': 'UV',
    'Employee__c':  'NV',
    'text':         'TK'
};

const TYPE_LABEL = {
    'Opportunity':  'Cơ hội',
    'Account':      'Khách hàng',
    'Candidate__c': 'Ứng viên',
    'Employee__c':  'Nhân viên',
    'text':         'Từ khóa'
};

const CHIP_COLOR = {
    'Opportunity':  'chip chip--opportunity',
    'Account':      'chip chip--account',
    'Candidate__c': 'chip chip--candidate',
    'Employee__c':  'chip chip--employee',
    'text':         'chip chip--text'
};

const DOT_CLASS = {
    'Opportunity':  'type-dot type-dot--opportunity',
    'Account':      'type-dot type-dot--account',
    'Candidate__c': 'type-dot type-dot--candidate',
    'Employee__c':  'type-dot type-dot--employee'
};

let chipSeq = 0;

export default class OpportunityCrossSearch extends LightningElement {

    @api maxResults = 15;

    @track chips = [];
    @track currentInput = '';
    @track suggestions = [];
    @track showSuggestions = false;
    @track isLoadingSuggestions = false;
    @track errorMessage = '';

    @track panelActiveFilter = 'all';
    @track currentPage = 1;

    i18n = {};
    debounceTimer = null;
    // Map of chipKey -> SearchResultsWrapper (not @track — we trigger via chips)
    chipResults = {};

    connectedCallback() {
        this.initLocale();
    }

    initLocale() {
        try {
            this.i18n = {
                searchPlaceholder: searchPlaceholder,
                headerOpps:        headerOpps,
                headerAccounts:    headerAccounts,
                headerCandidates:  headerCandidates,
                headerEmployees:   headerEmployees,
                noResults:         noResults,
                searchError:       searchError,
                searchLoading:     searchLoading,
            };
        } catch (e) {
            this.i18n = {
                searchPlaceholder: 'Tìm kiếm Cơ hội, Khách hàng, Ứng viên...',
                headerOpps:        'Cơ hội',
                headerAccounts:    'Khách hàng',
                headerCandidates:  'Ứng viên',
                headerEmployees:   'Nhân viên',
                noResults:         'Không tìm thấy kết quả',
                searchError:       'Lỗi tìm kiếm',
                searchLoading:     'Đang tìm...',
            };
        }
    }

    // ===== GETTERS =====

    get inputPlaceholder() {
        return this.chips.length === 0
            ? (this.i18n.searchPlaceholder || 'Tìm kiếm Cơ hội, Khách hàng, Ứng viên...')
            : 'Thêm điều kiện...';
    }

    get hasSuggestions() {
        return this.suggestions.length > 0;
    }

    get showResultsPanel() {
        return this.chips.length > 0;
    }

    /**
     * Build combined deduplicated result list from all chip searches.
     * Adds cross-check info: if a Candidate's linked Opportunity belongs
     * to a selected Account chip, shows "✅ Đã nộp CV → AccountName".
     */
    get allPanelItems() {
        const opps      = {};   // oppId  -> item
        const accounts  = {};   // accId  -> item
        const candidates = {};  // candId -> item
        const employees = {};   // empId  -> item

        // Map oppId -> accountId (for cross-check)
        const oppToAccount = {};

        // Set of accountIds selected as chips
        const selectedAccIds = new Set(
            this.chips.filter(c => c.type === 'Account').map(c => c.id)
        );

        for (const chip of this.chips) {
            const r = this.chipResults[chip.key];
            if (!r) continue;

            (r.opportunities || []).forEach(opp => {
                if (!opps[opp.opportunityId]) {
                    opps[opp.opportunityId] = {
                        type:      'Opportunity',
                        id:        opp.opportunityId,
                        name:      opp.opportunityName,
                        subtitle:  opp.description,
                        accountId: opp.accountId,
                        key:       'opp-' + opp.opportunityId
                    };
                }
                if (opp.accountId) {
                    oppToAccount[opp.opportunityId] = opp.accountId;
                }
            });

            (r.accounts || []).forEach(acc => {
                if (!accounts[acc.accountId]) {
                    accounts[acc.accountId] = {
                        type:     'Account',
                        id:       acc.accountId,
                        name:     acc.accountName,
                        subtitle: '',
                        key:      'acc-' + acc.accountId
                    };
                }
            });

            (r.candidates || []).forEach(cand => {
                if (!candidates[cand.candidateId]) {
                    candidates[cand.candidateId] = {
                        type:          'Candidate__c',
                        id:            cand.candidateId,
                        name:          cand.candidateName,
                        subtitle:      cand.description,
                        opportunityId: cand.opportunityId,
                        key:           'cand-' + cand.candidateId
                    };
                }
            });

            (r.employees || []).forEach(emp => {
                if (!employees[emp.employeeId]) {
                    employees[emp.employeeId] = {
                        type:     'Employee__c',
                        id:       emp.employeeId,
                        name:     emp.employeeName,
                        subtitle: emp.description,
                        key:      'emp-' + emp.employeeId
                    };
                }
            });
        }

        const items = [];

        Object.values(opps).forEach(item => {
            items.push(this.decorate(item, null));
        });
        Object.values(accounts).forEach(item => {
            items.push(this.decorate(item, null));
        });
        Object.values(candidates).forEach(item => {
            let crossCheckLabel = '';
            let crossCheckClass = '';

            if (selectedAccIds.size > 0 && item.opportunityId) {
                const oppAccId = oppToAccount[item.opportunityId];
                if (oppAccId && selectedAccIds.has(oppAccId)) {
                    const acc = accounts[oppAccId];
                    const accName = acc ? acc.name : '';
                    crossCheckLabel = '✅ Đã nộp CV' + (accName ? ' → ' + accName : '');
                    crossCheckClass = 'cross-check-badge cross-check--applied';
                } else if (selectedAccIds.size > 0) {
                    crossCheckLabel = '✗ Chưa nộp';
                    crossCheckClass = 'cross-check-badge cross-check--none';
                }
            }

            items.push(this.decorate(item, { crossCheckLabel, crossCheckClass }));
        });
        Object.values(employees).forEach(item => {
            items.push(this.decorate(item, null));
        });

        return items;
    }

    decorate(item, extra) {
        return Object.assign({}, item, {
            typeDotClass:    DOT_CLASS[item.type] || 'type-dot',
            typeLabel:       TYPE_LABEL[item.type] || item.type,
            crossCheckLabel: extra && extra.crossCheckLabel ? extra.crossCheckLabel : '',
            crossCheckClass: extra && extra.crossCheckClass ? extra.crossCheckClass : ''
        });
    }

    get filteredPanelItems() {
        const items = this.allPanelItems;
        if (this.panelActiveFilter === 'all') return items;
        return items.filter(i => i.type === this.panelActiveFilter);
    }

    get filteredPanelResults() {
        const start = (this.currentPage - 1) * this.maxResults;
        return this.filteredPanelItems.slice(start, start + this.maxResults);
    }

    get hasPanelResults() {
        return this.allPanelItems.length > 0;
    }

    get totalPages() {
        return Math.max(1, Math.ceil(this.filteredPanelItems.length / this.maxResults));
    }

    get hasPanelPagination() {
        return this.filteredPanelItems.length > this.maxResults;
    }

    get isPreviousDisabled() {
        return this.currentPage <= 1;
    }

    get isNextDisabled() {
        return this.currentPage >= this.totalPages;
    }

    get panelPageInfoText() {
        const total = this.filteredPanelItems.length;
        const start = (this.currentPage - 1) * this.maxResults + 1;
        const end   = Math.min(this.currentPage * this.maxResults, total);
        return start + '-' + end + ' của ' + total;
    }

    get filterTabs() {
        const all   = this.allPanelItems;
        const opps  = all.filter(i => i.type === 'Opportunity').length;
        const accs  = all.filter(i => i.type === 'Account').length;
        const cands = all.filter(i => i.type === 'Candidate__c').length;
        const emps  = all.filter(i => i.type === 'Employee__c').length;

        const tabs = [
            { key: 'tab-all',  value: 'all',          label: 'Tất cả',      count: all.length },
            { key: 'tab-opp',  value: 'Opportunity',   label: 'Cơ hội',      count: opps },
            { key: 'tab-acc',  value: 'Account',       label: 'Khách hàng',  count: accs },
            { key: 'tab-cand', value: 'Candidate__c',  label: 'Ứng viên',    count: cands },
            { key: 'tab-emp',  value: 'Employee__c',   label: 'Nhân viên',   count: emps },
        ];

        return tabs
            .filter(t => t.value === 'all' || t.count > 0)
            .map(t => Object.assign({}, t, {
                tabClass: 'filter-tab' + (this.panelActiveFilter === t.value ? ' filter-tab--active' : ''),
                isActive: this.panelActiveFilter === t.value
            }));
    }

    // ===== EVENT HANDLERS =====

    handleInput(event) {
        this.currentInput = event.target.value;
        this.errorMessage = '';

        clearTimeout(this.debounceTimer);

        if (this.currentInput.length < 2) {
            this.showSuggestions = false;
            this.suggestions = [];
            this.isLoadingSuggestions = false;
            return;
        }

        this.isLoadingSuggestions = true;
        this.debounceTimer = setTimeout(() => {
            this.fetchSuggestions(this.currentInput);
        }, 300);
    }

    handleFocus() {
        if (this.currentInput.length >= 2 && this.suggestions.length > 0) {
            this.showSuggestions = true;
        }
    }

    handleBlur() {
        setTimeout(() => {
            this.showSuggestions = false;
        }, 200);
    }

    handleKeyDown(event) {
        if (event.key === 'Enter' && this.currentInput.trim().length >= 2) {
            this.addChip({ type: 'text', id: null, name: this.currentInput.trim(), subtitle: '' });
            this.showSuggestions = false;
        } else if (event.key === 'Backspace' && this.currentInput === '' && this.chips.length > 0) {
            this.removeChipByKey(this.chips[this.chips.length - 1].key);
        }
    }

    handleSuggestionSelect(event) {
        const el = event.currentTarget;
        this.addChip({
            type:     el.dataset.type,
            id:       el.dataset.id,
            name:     el.dataset.name,
            subtitle: el.dataset.subtitle || ''
        });
        this.showSuggestions = false;
    }

    handleRemoveChip(event) {
        event.stopPropagation();
        this.removeChipByKey(event.currentTarget.dataset.chipKey);
    }

    handleFilterChange(event) {
        this.panelActiveFilter = event.currentTarget.dataset.filter;
        this.currentPage = 1;
    }

    handleNextPage() {
        if (this.currentPage < this.totalPages) this.currentPage++;
    }

    handlePreviousPage() {
        if (this.currentPage > 1) this.currentPage--;
    }

    handleResultClick(event) {
        const recordId = event.currentTarget.dataset.recordId;
        if (recordId) {
            window.location.href = '/' + recordId;
        }
    }

    focusInput() {
        const input = this.template.querySelector('[data-input="search"]');
        if (input) input.focus();
    }

    // ===== LOGIC =====

    addChip(item) {
        const key = 'chip-' + (++chipSeq);
        const chip = {
            key,
            type:      item.type,
            id:        item.id,
            name:      item.name,
            typeBadge: TYPE_BADGE[item.type] || 'TK',
            chipClass: CHIP_COLOR[item.type] || 'chip chip--text'
        };

        this.chips = [...this.chips, chip];
        this.currentInput = '';
        this.currentPage  = 1;

        const input = this.template.querySelector('[data-input="search"]');
        if (input) input.value = '';

        this.fetchChipResults(chip);
    }

    removeChipByKey(key) {
        this.chips = this.chips.filter(c => c.key !== key);
        delete this.chipResults[key];
        this.currentPage = 1;
    }

    fetchSuggestions(keyword) {
        search({ keyword })
            .then(response => {
                this.isLoadingSuggestions = false;
                this.suggestions = response.hasResults ? this.buildSuggestions(response) : [];
                this.showSuggestions = true;
            })
            .catch(err => {
                this.isLoadingSuggestions = false;
                this.suggestions = [];
                console.error('Suggestion error:', err);
            });
    }

    fetchChipResults(chip) {
        search({ keyword: chip.name })
            .then(response => {
                this.chipResults[chip.key] = response;
                this.chips = [...this.chips]; // trigger reactive update
            })
            .catch(err => {
                console.error('Chip search error:', err);
            });
    }

    buildSuggestions(response) {
        const items = [];
        const MAX_PER_GROUP = 6;

        if (response.opportunities && response.opportunities.length > 0) {
            items.push({ isHeader: true, key: 'h-opp', label: this.i18n.headerOpps || 'Cơ hội', count: response.opportunityCount });
            response.opportunities.slice(0, MAX_PER_GROUP).forEach((opp, i) => {
                items.push({ isHeader: false, type: 'Opportunity', id: opp.opportunityId, name: opp.opportunityName, subtitle: opp.description, key: 's-opp-' + i });
            });
        }
        if (response.accounts && response.accounts.length > 0) {
            items.push({ isHeader: true, key: 'h-acc', label: this.i18n.headerAccounts || 'Khách hàng', count: response.accountCount });
            response.accounts.slice(0, MAX_PER_GROUP).forEach((acc, i) => {
                items.push({ isHeader: false, type: 'Account', id: acc.accountId, name: acc.accountName, subtitle: '', key: 's-acc-' + i });
            });
        }
        if (response.candidates && response.candidates.length > 0) {
            items.push({ isHeader: true, key: 'h-cand', label: this.i18n.headerCandidates || 'Ứng viên', count: response.candidateCount });
            response.candidates.slice(0, MAX_PER_GROUP).forEach((cand, i) => {
                items.push({ isHeader: false, type: 'Candidate__c', id: cand.candidateId, name: cand.candidateName, subtitle: cand.description, key: 's-cand-' + i });
            });
        }
        if (response.employees && response.employees.length > 0) {
            items.push({ isHeader: true, key: 'h-emp', label: this.i18n.headerEmployees || 'Nhân viên', count: response.employeeCount });
            response.employees.slice(0, MAX_PER_GROUP).forEach((emp, i) => {
                items.push({ isHeader: false, type: 'Employee__c', id: emp.employeeId, name: emp.employeeName, subtitle: emp.description, key: 's-emp-' + i });
            });
        }

        return items;
    }
}