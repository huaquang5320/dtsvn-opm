# Salesforce Deployment Guide: opm-honban -> opm-targetDE

## Tong quan

- **Source Org**: opm-honban (dev.manager@dtsvn.com)
- **Target Org**: opm-targetDE (mquangdw20.520724c56209@agentforce.com)
- **Ket qua cuoi**: 679/679 components deployed thanh cong
- **Van de chinh**: Source project thieu nhieu metadata dependencies (custom fields tren standard objects, QuickActions, ListViews, Reports...) vi chung khong duoc retrieve vao project tu dau.

---

## Phan 1: CHECKLIST TRUOC KHI DEPLOY

### 1.1 Enable Features tren Target Org (bang UI)

Kiem tra va enable cac features sau tren target org truoc khi deploy:

- [ ] **Quote Settings**: Setup > Quote Settings > Enable Quotes
- [ ] **Opportunity Team Settings**: Setup > Opportunity Team Settings > Enable Team Selling
- [ ] **State & Country/Territory Picklists**: Setup > State and Country/Territory Picklists > Enable
  - Luu y: Thao tac nay KHONG THE REVERT. Can scan & migrate data truoc.
  - Kiem tra nhanh: `sf org open -p "/lightning/setup/AddressCleanerOverview/home" -o opm-targetDE`
- [ ] **Digital Experiences (Communities)**: Neu project co site pages (SiteLogin, SiteRegister...), can enable Communities tren target org. Neu khong, phai exclude cac pages nay.

### 1.2 Kiem tra Custom Fields tren Standard Objects

Day la nguyen nhan LON NHAT gay loi. Cac custom fields tren standard objects (Account, Contact, Opportunity, User, Quote) thuong KHONG duoc retrieve vao project nhung code lai reference chung.

**Cach tim tat ca custom fields tren 1 object tu source org:**

```bash
sf sobject describe -s Opportunity -o opm-honban --json | python3 -c "
import sys,json
data=json.load(sys.stdin)
fields=[f['name'] for f in data['result']['fields'] if f['name'].endswith('__c')]
for f in sorted(fields): print(f)
"
```

**Cach retrieve tat ca custom fields cua 1 standard object:**

```bash
sf project retrieve start -m \
  "CustomField:Opportunity.Status__c" \
  "CustomField:Opportunity.Field2__c" \
  ... \
  -o opm-honban
```

**Lam tuong tu cho: Account, Contact, User, Quote**

### 1.3 Kiem tra Dependent Picklist Values

Neu co dependent picklist (vd: `Status__c` phu thuoc `StageName`), phai deploy controlling field values truoc.

```bash
# Retrieve va deploy StandardValueSet truoc
sf project retrieve start -m "StandardValueSet:OpportunityStage" -o opm-honban
sf project deploy start -m "StandardValueSet:OpportunityStage" -o opm-targetDE
```

---

## Phan 2: THU TU DEPLOY (QUAN TRONG!)

Salesforce co dependency chain nghiem ngat. Deploy SAI THU TU se fail. Thu tu dung:

### Step 1: StandardValueSets (Picklist values)
```bash
sf project deploy start -m "StandardValueSet:OpportunityStage" -o opm-targetDE
```

### Step 2: Custom Labels
```bash
sf project deploy start -m "CustomLabels" -o opm-targetDE
```

### Step 3: Custom Objects (khong co action overrides)
Neu custom objects co `<type>Flexipage</type>` action overrides, TAM DOI sang `<type>Default</type>` truoc, deploy object, roi deploy FlexiPage, roi khoi phuc override.

```bash
sf project deploy start -m \
  "CustomObject:Employee__c" \
  "CustomObject:Action_History__c" \
  "CustomObject:Candidate__c" \
  ... \
  -o opm-targetDE
```

**Xu ly circular dependency (Object <-> FlexiPage):**
1. Sua object XML: doi action override tu `Flexipage` sang `Default`
2. Deploy object
3. Deploy FlexiPage
4. Khoi phuc object XML ve `Flexipage`
5. Deploy object lai (hoac de full deploy cuoi xu ly)

### Step 4: Custom Fields tren Standard Objects
```bash
sf project deploy start -m \
  "CustomField:Account.Domain__c" \
  "CustomField:Opportunity.Status__c" \
  ... \
  -o opm-targetDE
```

### Step 5: Custom Metadata Types
```bash
sf project deploy start -m "CustomObject:Side_Menu_Cmdt__mdt" -o opm-targetDE
```

### Step 6: Apex Classes (controllers cho LWC/Aura)
```bash
sf project deploy start -m "ApexClass:OpportunityMenuController" -o opm-targetDE
```

### Step 7: Lightning Components (LWC/Aura)
```bash
sf project deploy start -m \
  "LightningComponentBundle:sideMenu" \
  "LightningComponentBundle:actionHistoryCustom" \
  -o opm-targetDE
```

### Step 8: QuickActions
```bash
# Retrieve TAT CA QuickActions cua Opportunity tu source
sf project retrieve start -m "QuickAction:Opportunity.Cancel_Opportunity" "QuickAction:Opportunity.Accept_Opportunity" ... -o opm-honban

# Deploy
sf project deploy start -m "QuickAction:Opportunity.Cancel_Opportunity" ... -o opm-targetDE
```

### Step 9: ListViews
```bash
sf project retrieve start -m "ListView:Opportunity.Accepted_List" ... -o opm-honban
```

### Step 10: ContentAssets
```bash
sf project retrieve start -m "ContentAsset:DTSVN_Logo" -o opm-honban
sf project deploy start -m "ContentAsset:DTSVN_Logo" -o opm-targetDE
```

### Step 11: Full Deploy
```bash
sf project deploy start --source-dir force-app -o opm-targetDE
```

---

## Phan 3: XU LY CAC LOI THUONG GAP

### 3.1 "No CustomField named X found" (trong Profiles)

**Nguyen nhan**: Profile reference field chua ton tai tren target org.

**Cach fix**:
1. Retrieve field tu source org
2. Deploy field truoc
3. Deploy lai profiles

### 3.2 "Unknown user permission: X"

**Nguyen nhan**: Target org khong ho tro permission do (khac edition hoac feature chua enable).

**Cach fix**: Xoa permission block khoi profiles bang script:

```python
import os, re

profiles_dir = 'force-app/main/default/profiles'
permissions_to_remove = [
    'ShareFilesWithNetworks',
    'ManageMobileAppSecurity',
    'ManageCssUsers',
    'PrmEnhancedPortalUser',
    'ViewGlobalHeader',
    'ManagePartners'
]

pattern = re.compile(
    r'\s*<userPermissions>\s*<enabled>(?:true|false)</enabled>\s*<name>(?:' +
    '|'.join(permissions_to_remove) +
    r')</name>\s*</userPermissions>',
    re.DOTALL
)

for f in os.listdir(profiles_dir):
    if f.endswith('.profile-meta.xml'):
        path = os.path.join(profiles_dir, f)
        with open(path, 'r', encoding='utf-8') as fh:
            content = fh.read()
        new_content, n = pattern.subn('', content)
        if n > 0:
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(new_content)
```

### 3.3 "Component c:sitepoweredby does not exist" (va cac site components)

**Nguyen nhan**: Day la Aura components mac dinh cua Salesforce Communities/Digital Experiences. Chung chi ton tai khi Communities duoc enable.

**Cach fix**: Xoa cac site-related ApexPages va controllers khoi source:
- Pages: `BandwidthExceeded`, `ChangePassword`, `CommunitiesSelfRegConfirm`, `Exception`, `FileNotFound`, `ForgotPassword`, `ForgotPasswordConfirm`, `InMaintenance`, `SiteLogin`, `SiteRegister`, `SiteRegisterConfirm`, `SiteTemplate`, `StdExceptionTemplate`, `Unauthorized`, `UnderConstruction`
- Community Pages: `CommunitiesLanding`, `CommunitiesLogin`, `CommunitiesSelfReg`, `CommunitiesTemplate`, `MicrobatchSelfReg`, `MyProfilePage`, `AnswersHome`, `IdeasHome`
- Controllers: `CommunitiesSelfRegConfirmController`, `CommunitiesLoginController`, `MicrobatchSelfRegController`, `MyProfilePageController`, `SiteLoginController`, `SiteRegisterController`, `ForgotPasswordController`, `ChangePasswordController`, `LightningForgotPasswordController`, `LightningLoginFormController`, `LightningSelfRegisterController` (+ test classes)

**QUAN TRONG**: Sau khi xoa pages/classes, phai xoa luon `<pageAccesses>` va `<classAccesses>` tuong ung trong TAT CA profiles. Dung script tuong tu nhu 3.2.

### 3.4 "Parent entity failed to deploy" (Layouts)

**Nguyen nhan**: Object cha chua ton tai tren target (vd: `AccountBrand`, `DelegatedAccount`).

**Cach fix**:
- Xoa layout file khoi source
- Xoa `<layoutAssignments>` tuong ung trong tat ca profiles:

```python
pattern = re.compile(
    r'\s*<layoutAssignments>\s*<layout>AccountBrand-Account Brand Layout</layout>\s*</layoutAssignments>',
    re.DOTALL
)
```

### 3.5 "no QuickAction named X found" (trong FlexiPages)

**Nguyen nhan**: QuickActions thuong KHONG duoc retrieve vao project. FlexiPages reference chung nhung chung khong co trong source.

**Cach fix**: Retrieve TAT CA QuickActions cua object tu source org TRUOC khi deploy:

```bash
# Liet ke tat ca QuickActions tren source org
sf project retrieve start -m "QuickAction:Opportunity.Cancel_Opportunity" \
  "QuickAction:Opportunity.Accept_Opportunity" \
  "QuickAction:Opportunity.Submit_to_Sale_Leader" \
  ... -o opm-honban
```

**Meo**: Loi nay xuat hien TUNG CAI MOT. Moi lan fix 1 QuickAction, deploy lai se bao loi QuickAction tiep theo. Nen retrieve HET 1 luc.

### 3.6 "Invalid reportName X - no reports found" (trong FlexiPages)

**Nguyen nhan**: FlexiPages reference Reports/Dashboards chua co tren target.

**Cach fix**:
- Thu retrieve reports tu source: `sf project retrieve start -m "Report:ReportName" -o opm-honban`
- Neu report nam trong folder: `sf project retrieve start -m "Report:FolderName/ReportName" -o opm-honban`
- Neu report khong ton tai tren source: xoa report chart component khoi FlexiPage XML

### 3.7 "no UserLicense named Guest User License found"

**Nguyen nhan**: Target org khong co Guest User License.

**Cach fix**: Exclude profiles su dung license nay bang `.forceignore` hoac xoa khoi source.

### 3.8 "referenceTo value of 'X' does not resolve to a valid sObject type"

**Nguyen nhan**: Lookup field reference 1 custom object chua deploy.

**Cach fix**: Deploy custom object TRUOC, roi deploy field.

### 3.9 "Control field value 'X' not found" (Dependent Picklist)

**Nguyen nhan**: Dependent picklist reference controlling field value chua ton tai.

**Cach fix**: Deploy controlling field values (StandardValueSet) TRUOC.

### 3.10 Custom Action "edit_opportunity" / Custom Buttons khong ton tai

**Nguyen nhan**: FlexiPage reference custom button/action khong ton tai tren ca source va target.

**Cach fix**: Xoa `<valueListItems>` block chua reference do khoi FlexiPage XML.

---

## Phan 4: SCRIPT TIEN ICH

### 4.1 Script xoa permissions khong hop le khoi profiles

```python
# remove_invalid_permissions.py
import os, re

profiles_dir = 'force-app/main/default/profiles'
permissions_to_remove = [
    'ShareFilesWithNetworks',
    'ManageMobileAppSecurity',
    'ManageCssUsers',
    'PrmEnhancedPortalUser',
    'ViewGlobalHeader',
    'ManagePartners'
]

pattern = re.compile(
    r'\s*<userPermissions>\s*<enabled>(?:true|false)</enabled>\s*<name>(?:' +
    '|'.join(permissions_to_remove) +
    r')</name>\s*</userPermissions>',
    re.DOTALL
)

count = 0
for f in os.listdir(profiles_dir):
    if f.endswith('.profile-meta.xml'):
        path = os.path.join(profiles_dir, f)
        with open(path, 'r', encoding='utf-8') as fh:
            content = fh.read()
        new_content, n = pattern.subn('', content)
        if n > 0:
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(new_content)
            count += n
            print(f'  {f}: removed {n}')
print(f'Total: removed {count} permission blocks')
```

### 4.2 Script xoa layout assignments khoi profiles

```python
# remove_layout_assignments.py
import os, re

profiles_dir = 'force-app/main/default/profiles'
layouts_to_remove = [
    'AccountBrand-Account Brand Layout',
    'DelegatedAccount-External Managed Account Layout'
]

for layout in layouts_to_remove:
    pattern = re.compile(
        r'\s*<layoutAssignments>\s*<layout>' + re.escape(layout) + r'</layout>\s*</layoutAssignments>',
        re.DOTALL
    )
    count = 0
    for f in os.listdir(profiles_dir):
        if f.endswith('.profile-meta.xml'):
            path = os.path.join(profiles_dir, f)
            with open(path, 'r', encoding='utf-8') as fh:
                content = fh.read()
            new_content, n = pattern.subn('', content)
            if n > 0:
                with open(path, 'w', encoding='utf-8') as fh:
                    fh.write(new_content)
                count += n
    print(f'Removed {count} refs to: {layout}')
```

### 4.3 Script xoa page/class access khoi profiles

```python
# remove_page_class_access.py
import os, re

profiles_dir = 'force-app/main/default/profiles'

deleted_pages = [
    'BandwidthExceeded', 'ChangePassword', 'CommunitiesSelfRegConfirm',
    'Exception', 'FileNotFound', 'ForgotPassword', 'ForgotPasswordConfirm',
    'InMaintenance', 'SiteLogin', 'SiteRegister', 'SiteRegisterConfirm',
    'SiteTemplate', 'StdExceptionTemplate', 'Unauthorized', 'UnderConstruction',
    'AnswersHome', 'IdeasHome', 'CommunitiesLanding', 'CommunitiesLogin',
    'CommunitiesSelfReg', 'CommunitiesTemplate', 'MicrobatchSelfReg', 'MyProfilePage'
]

deleted_classes = [
    'CommunitiesSelfRegConfirmController', 'CommunitiesSelfRegConfirmControllerTest',
    'CommunitiesSelfRegController', 'CommunitiesSelfRegControllerTest',
    'CommunitiesLoginController', 'CommunitiesLoginControllerTest',
    'MicrobatchSelfRegController', 'MicrobatchSelfRegControllerTest',
    'MyProfilePageController', 'MyProfilePageControllerTest',
    'SiteLoginController', 'SiteLoginControllerTest',
    'SiteRegisterController', 'SiteRegisterControllerTest',
    'ForgotPasswordController', 'ForgotPasswordControllerTest',
    'ChangePasswordController', 'ChangePasswordControllerTest',
    'LightningForgotPasswordController', 'LightningForgotPasswordControllerTest',
    'LightningLoginFormController', 'LightningLoginFormControllerTest',
    'LightningSelfRegisterController', 'LightningSelfRegisterControllerTest',
    'AssignPermissionGroup', 'AssignPermissionGroupTest'
]

page_pattern = re.compile(
    r'\s*<pageAccesses>\s*<apexPage>(?:' + '|'.join(deleted_pages) +
    r')</apexPage>\s*<enabled>(?:true|false)</enabled>\s*</pageAccesses>',
    re.DOTALL
)

class_pattern = re.compile(
    r'\s*<classAccesses>\s*<apexClass>(?:' + '|'.join(deleted_classes) +
    r')</apexClass>\s*<enabled>(?:true|false)</enabled>\s*</classAccesses>',
    re.DOTALL
)

page_count = 0
class_count = 0
for f in os.listdir(profiles_dir):
    if f.endswith('.profile-meta.xml'):
        path = os.path.join(profiles_dir, f)
        with open(path, 'r', encoding='utf-8') as fh:
            content = fh.read()
        content, n1 = page_pattern.subn('', content)
        content, n2 = class_pattern.subn('', content)
        if n1 + n2 > 0:
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(content)
            page_count += n1
            class_count += n2

print(f'Removed {page_count} pageAccess + {class_count} classAccess refs')
```

---

## Phan 5: BAI HOC RUT RA

### Bai hoc 1: Retrieve DAY DU truoc khi deploy
- Custom fields tren standard objects (Account, Contact, Opportunity, User, Quote) THUONG KHONG duoc retrieve tu dong.
- QuickActions, ListViews, Reports, Dashboards, ContentAssets cung thuong bi thieu.
- **Lam truoc**: Chay `sf sobject describe` cho moi standard object de liet ke tat ca custom fields, roi retrieve chung.

### Bai hoc 2: Thu tu deploy la TAT CA
- Dependencies phai duoc deploy truoc: StandardValueSets > CustomLabels > Custom Objects > Custom Fields > Apex > LWC > QuickActions > Flows > FlexiPages > Profiles
- Circular dependencies (Object <-> FlexiPage) phai xu ly bang cach tam bo action overrides.

### Bai hoc 3: Profiles la "source of pain"
- Profiles reference MOI THU: fields, pages, classes, permissions, layouts, licenses.
- Khi xoa bat ky metadata nao khoi source, PHAI xoa luon references trong profiles.
- Dung scripts de xu ly hang loat, khong lam bang tay.

### Bai hoc 4: Loi cascade va loi tung-cai-mot
- 1 field thieu co the gay 50+ loi (tat ca profiles reference no deu fail).
- QuickActions trong FlexiPages bao loi TUNG CAI MOT (fix 1 cai, lai hien cai tiep theo). Nen retrieve HET QuickActions truoc.
- Deploy that bai se ROLLBACK toan bo batch, ke ca nhung component da thanh cong -> deploy rieng dependencies truoc.

### Bai hoc 5: `.forceignore` KHONG AP DUNG voi `--source-dir`
- `.forceignore` chi hoat dong voi `sf project deploy start` (khong co flag), `push`, `pull`.
- Khi dung `--source-dir`, phai XOA FILES truc tiep khoi source thay vi dung `.forceignore`.

### Bai hoc 6: Nen dung `--source-dir` thay vi khong co flag
- Tu December 2025, `sf project deploy start` yeu cau `--metadata`, `--source-dir`, hoac `--manifest` cho non-source-tracking orgs.

### Bai hoc 7: Kiem tra features truoc khi deploy
- Quote object can enable rieng.
- OppportunityTeamMember can enable rieng.
- State/Country Picklists can enable rieng (khong revert duoc).
- Communities/Digital Experiences can enable rieng.
- AccountBrand, DelegatedAccount la standard objects dac biet, co the khong co tren moi org.

### Bai hoc 8: Quy trinh deploy ly tuong

```
1. Kiem tra & enable features tren target org (UI)
2. Retrieve TAT CA custom fields tren standard objects tu source
3. Retrieve TAT CA QuickActions, ListViews, Reports, ContentAssets tu source
4. Chay scripts de xoa:
   - Unknown permissions
   - Site pages/controllers/refs (neu Communities chua enable)
   - Layout assignments cho objects khong ton tai
5. Deploy theo thu tu:
   StandardValueSets -> CustomLabels -> Custom Objects -> Custom Fields
   -> Apex -> LWC -> QuickActions -> Full deploy
6. Kiem tra loi, fix, deploy lai
```

---

## Phan 6: DANH SACH METADATA DA RETRIEVE TU SOURCE ORG

### Custom Fields da retrieve:

**Account**: Domain__c, BillingCountryCode__c, Customer_In_Group__c, Is_Internal_Group__c, Country_Code__c, HubSpot_Company_ID__c

**Contact**: HubSpot_Contact_ID__c

**User**: Current_Employee_Id__c

**Opportunity** (36 fields): Status__c, Status_Reason__c, Responsible_Employee__c, Previous_Responsible_Employee__c, Customer_Feedback__c, Revision_Reason__c, Last_Submitted_To_Customer__c, Customer_Responsible_Employee__c, Tender_Responsible__c, Need_Rework__c, Tech_Stack__c, Industry__c, Pricing_Model__c, Expected_Start_Date__c, Need_Technical_Proposal__c, Quick_Note__c, Feature_Categories__c, Team_Size_Expected__c, Currency__c, Customer_Concerns__c, Delivery_Model__c, Estimated_Screens__c, Expected_End_Date__c, Has_Requirement_Document__c, Industry_From_Account__c, Risk_Level__c, Short_Description__c, Estimated_Apis__c, Risk_Categories__c, Win_Lose_Reason_Details__c, Win_Lose_Reason_Type__c, Win_Lose_Reason_Type_Other__c, CurrentGenerators__c, DeliveryInstallationStatus__c, MainCompetitors__c, OrderNumber__c, TrackingNumber__c

**Quote**: Quote_Document_URL__c

### QuickActions da retrieve:
Opportunity.Cancel_Opportunity, Accept_Opportunity, Approve_Proposal_Quote_CV, RESUBMIT_PROPOSAL_FOR_DEV_REVIEW, Submit_To_SaleManager, Request_Dev_Manager_Review, Reject_Opportunity, Request_Revision_By_SaleLeader, Submit_to_Customer, Assign_Dev_Manager, Capture_Customer_Feedback, Assigned_To_Dev_Leader, Approve_By_SaleManager, Confirm_By_SaleLeader, Submit_to_Sale_Leader, Submit_to_Sale_Manager, Cancelled_Opportunity, Closed_Opportunity, Hold_Opportunity, New_Opportunity, Revise_After_Feedback, UpdateCandidateCV, Update_Customer_Review, Update_Opp_Status, Update_Proposal, Update_Quote

### Khac:
- StandardValueSet: OpportunityStage
- ContentAsset: DTSVN_Logo
- 20+ ListViews cho Opportunity
- CustomLabels
