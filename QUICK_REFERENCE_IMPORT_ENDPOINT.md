# Quick Reference: Import Transactions API

## Endpoint
```
POST /api/documents/:documentId/import
Authorization: Bearer <token>
```

## Quick Example

### Request
```bash
curl -X POST http://localhost:3001/api/documents/doc-123/import \
  -H "Authorization: Bearer token123" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-456",
    "transactions": [
      {
        "date": "2026-02-09",
        "description": "Salary",
        "amount": 50000,
        "type": "INCOME"
      },
      {
        "date": "2026-02-10",
        "description": "Grocery",
        "amount": -2500,
        "type": "EXPENSE",
        "category": "Food",
        "merchantName": "Big Bazaar"
      }
    ]
  }'
```

### Success Response
```json
{
  "success": true,
  "data": {
    "documentId": "doc-123",
    "accountId": "acc-456",
    "transactionsImported": 2,
    "status": "IMPORTED"
  }
}
```

---

## Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| documentId | URL param | Document to import from |
| transactions | array | List of transactions to import |
| accountId | string | Destination account ID (if not creating new) |
| createAccount | boolean | Set true to create new account |
| accountData | object | Account details (if createAccount=true) |

## Transaction Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| date | string | ✅ | ISO format: "2026-02-09" |
| description | string | ✅ | Transaction description |
| amount | number | ✅ | Can be positive/negative |
| type | string | ✅ | INCOME or EXPENSE |
| categoryId | string | ❌ | Existing category ID |
| category | string | ❌ | Category name (auto-creates) |
| merchantName | string | ❌ | Store/merchant name |
| tags | array | ❌ | ["tag1", "tag2"] |
| notes | string | ❌ | Additional notes |

---

## Frontend Usage

```typescript
// In your React component or service
import { documentService } from '@/services/document.service';

// Import with existing account
const response = await documentService.importTransactions('doc-123', {
  accountId: 'acc-456',
  transactions: [{
    date: '2026-02-09',
    description: 'Salary',
    amount: 50000,
    type: 'INCOME'
  }]
});

if (response.success) {
  console.log(`Imported ${response.data.transactionsImported} transactions`);
}

// Or create new account during import
const response2 = await documentService.importTransactions('doc-123', {
  createAccount: true,
  accountData: {
    name: 'My New Account',
    institution: 'HDFC Bank',
    type: 'SAVINGS'
  },
  transactions: [...]
});
```

---

## Common Error Codes

| Code | Status | Solution |
|------|--------|----------|
| INVALID_INPUT | 400 | Check transactions array is not empty |
| DOCUMENT_NOT_FOUND | 404 | Verify document ID exists |
| FORBIDDEN | 403 | Check you own the document |
| INVALID_STATUS | 400 | Document must be EXTRACTED status |
| DUPLICATE_IMPORT | 409 | Document already imported, skip |
| IMPORT_FAILED | 500 | Check database and try again |

---

## File Locations

| File | Path | Status |
|------|------|--------|
| Backend API | `src/api/documents/import.ts` | ✅ Created |
| Router Mount | `src/api/documents/index.ts` | ✅ Updated |
| Frontend Service | `finance-frontend/src/services/document.service.ts` | ✅ Exists |

---

## Key Features

✅ **Atomic Operations** - All-or-nothing import, no partial updates  
✅ **Duplicate Detection** - Won't import same document twice  
✅ **Account Creation** - Can create new account during import  
✅ **Auto Categories** - Creates categories on-the-fly if needed  
✅ **Balance Updates** - Account balance updated atomically  
✅ **Full Validation** - Comprehensive input and state checks  
✅ **Rollback on Error** - No data corruption on failure  

---

## Document Status Flow

```
UPLOADED → EXTRACTED → REVIEWED → IMPORTED
           ↑
      (ready for import)
```

Only documents with status "EXTRACTED" can be imported.

---

## Account Creation Example

```json
{
  "createAccount": true,
  "accountData": {
    "name": "SBI Savings Account",
    "institution": "State Bank of India",
    "type": "SAVINGS",
    "accountNumber": "10123456789",
    "currency": "INR"
  },
  "transactions": [...]
}
```

---

## For Developers

**Location of API logic:** `src/api/documents/import.ts`  
**Key function:** Line 31 - Main router.post handler  
**Database transaction:** Line 155 - Prisma.$transaction()  
**Error codes:** Lines 48-97 - Validation checks  

**To test locally:**
```bash
cd ~/Local_Development/Finance_app
npm run dev
# Endpoint available at http://localhost:3001/api/documents/:documentId/import
```

---

**Last Updated:** March 6, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
