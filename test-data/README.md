# Financial Documents Test Data Generator

This directory contains a comprehensive test data generation system for Indian financial documents, designed to test OCR, parsing, and categorization features of finance automation applications.

## 📁 Directory Structure

```
test-data/
├── bank-statements/     # Bank account statements (HDFC, SBI, ICICI)
├── credit-cards/        # Credit card statements  
├── investments/         # SIP & Mutual fund statements
├── loans/              # Loan account statements (Home, Personal, Car loans)
├── others/             # Insurance receipts, FD certificates
├── html_templates/     # HTML templates for all document types
├── *.py               # Python data generators
├── *.json             # Sample transaction data
├── requirements.txt   # Dependencies
└── README.md          # This file
```

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   pip install jinja2 python-dateutil
   ```

2. **Generate sample data:**
   ```bash
   python3 data_generator.py          # Basic transaction data
   python3 pdf_generator.py           # Bank statements (HTML)
   python3 credit_card_generator.py   # Credit card statements
   python3 investment_generator.py    # Investment documents
   python3 loan_generator.py          # Loan statements
   python3 other_documents_generator.py # Insurance, FD certificates
   ```

3. **Generate all documents at once:**
   ```bash
   python3 generate_all_samples.py
   ```

## 📋 Document Types Generated

### Bank Statements
- **HDFC Bank** statements with realistic transaction history
- **State Bank of India** statements with traditional layout
- **ICICI Bank** statements with modern design
- Includes: UPI transactions, NEFT/IMPS transfers, ATM withdrawals, card payments

### Credit Card Statements
- Multiple bank credit card statements (HDFC, ICICI, SBI, Axis)
- Purchase transactions with realistic merchant names
- Payment history, balances, and reward points
- Interest calculations and payment due dates

### Investment Documents
- **SIP (Systematic Investment Plan)** statements
- **Mutual Fund** consolidated account statements (CAS)
- NAV history, transaction details, and performance metrics
- Multiple AMCs: HDFC, ICICI Prudential, SBI Funds, Axis

### Loan Statements  
- **Home Loan** statements with EMI schedules
- **Personal Loan** statements
- **Car Loan** statements
- **Education Loan** statements
- **Business Loan** statements
- Includes: Payment history, amortization schedules, outstanding balances

### Other Financial Documents
- **Life Insurance** premium receipts (LIC, HDFC Life, ICICI Prudential)
- **Fixed Deposit** certificates with maturity calculations
- **Investment** receipts and confirmations

## 🇮🇳 Indian Banking Features

### Realistic Data Format
- ✅ **Currency**: INR (₹) formatting
- ✅ **Dates**: DD/MM/YYYY format
- ✅ **Banks**: Real Indian bank names (HDFC, SBI, ICICI, Axis)
- ✅ **IFSC Codes**: Realistic format (HDFC0001234)
- ✅ **Account Numbers**: Bank-specific numbering patterns
- ✅ **UPI IDs**: Realistic handles (@paytm, @phonepe, @googlepay)

### Transaction Types
- **UPI Payments**: P2P, P2M with realistic reference numbers
- **NEFT/IMPS**: Inter-bank transfers
- **ATM**: Cash withdrawals at common amounts (₹500, ₹1000, ₹2000)
- **Card Payments**: POS transactions at merchants
- **Online Payments**: Bill payments, recharges
- **Salary Credits**: Monthly salary deposits
- **EMI Debits**: Loan payments

### Edge Cases for Testing
- ❌ Negative balances (overdraft scenarios)
- 💰 Large transactions (₹1+ lakh)
- 🔄 Failed transactions and reversals
- 💸 Micro transactions (₹5-₹10)
- 🌍 International transactions
- 📱 Mobile wallet transactions
- 🎁 Refunds and cashbacks

## 📊 Sample Data

### JSON Files
- `sample_transactions.json` - Comprehensive transaction examples
- `sample_hdfc_statement.json` - Complete bank statement data
- Individual JSON files for each document type

### HTML Templates
All document templates are professionally styled to mimic real bank statements:
- Proper bank logos and branding
- Realistic layouts and fonts
- Print-friendly formatting
- Mobile-responsive design

## 🔧 Customization

### Modifying Templates
Edit HTML templates in `html_templates/` directory:
```bash
html_templates/
├── hdfc_statement_template.html      # HDFC Bank layout
├── sbi_statement_template.html       # SBI traditional layout  
├── icici_statement_template.html     # ICICI modern layout
├── credit_card_statement_template.html
├── sip_statement_template.html
├── mutual_fund_statement_template.html
├── loan_statement_template.html
├── insurance_premium_receipt_template.html
└── fd_certificate_template.html
```

### Generating Custom Data
```python
from data_generator import IndianFinancialDataGenerator

generator = IndianFinancialDataGenerator()

# Generate custom bank statement
statement = generator.generate_statement_data(
    bank_code='HDFC',
    num_transactions=50,
    start_date=datetime(2024, 1, 1),
    end_date=datetime(2024, 12, 31)
)

# Generate specific transaction types
transaction = generator.generate_transaction(
    date=datetime.now(),
    force_credit=True  # Force credit transaction
)
```

## 🧪 Testing Recommendations

### OCR Testing
1. Convert HTML files to PDF using browser print function
2. Test with different resolutions and image qualities
3. Validate extraction accuracy for key fields:
   - Account numbers
   - Transaction amounts
   - Dates and descriptions
   - Balance information

### Parser Development
1. Use JSON sample data for unit testing
2. Test transaction categorization with realistic merchant names
3. Validate amount parsing with Indian number formats (₹1,23,456.78)
4. Test date parsing in DD/MM/YYYY format

### Data Validation
1. Cross-reference generated HTML with JSON source data
2. Validate mathematical calculations (balances, EMI amounts)
3. Test edge cases using provided sample scenarios
4. Verify format consistency across different banks

## 🏦 Supported Financial Institutions

### Banks
- **HDFC Bank** - Private sector leader
- **State Bank of India** - Largest public sector bank  
- **ICICI Bank** - Technology-focused private bank
- **Axis Bank** - Modern private sector bank

### Insurance Companies
- **LIC** - Life Insurance Corporation of India
- **HDFC Life** - HDFC Life Insurance
- **ICICI Prudential** - ICICI Prudential Life Insurance
- **SBI Life** - SBI Life Insurance

### Asset Management Companies
- **HDFC AMC** - HDFC Asset Management
- **ICICI Prudential AMC** - ICICI Prudential AMC
- **SBI Funds** - SBI Funds Management
- **Axis AMC** - Axis Asset Management

## 📈 Use Cases

### Finance App Development
- Test document upload and parsing
- Validate transaction categorization
- Test balance calculation accuracy
- Verify date and amount extraction

### Machine Learning Training
- Train OCR models on realistic financial documents
- Create datasets for transaction classification
- Test natural language processing for descriptions
- Validate automated data entry systems

### QA Testing
- End-to-end testing with realistic data
- Performance testing with large transaction volumes
- Edge case testing with unusual scenarios
- Cross-bank compatibility testing

## 🛠 Dependencies

**Required:**
- `jinja2` - Template rendering
- `python-dateutil` - Date manipulation

**Optional:**
- `pdfkit` + `wkhtmltopdf` - PDF generation
- `pytest` - Testing framework

## 📞 Support

For questions about the test data generation:
1. Check individual generator scripts for customization options
2. Modify HTML templates for specific bank layouts
3. Adjust transaction generation parameters in Python scripts
4. Review JSON sample files for data structure examples

## ⚠️ Important Notes

- This is **TEST DATA ONLY** - not for production use
- All generated data is fictional and randomly created
- Account numbers, names, and amounts are not real
- Designed specifically for testing finance automation apps
- Templates mimic real bank layouts but are not official documents

---

**Generated for Finance Automation App Testing**  
*Realistic Indian financial document samples for OCR, parsing, and categorization testing*