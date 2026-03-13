#!/usr/bin/env python3
"""
Master Sample Generator
Generates all types of financial documents for testing the finance automation app.
"""

import os
import sys
from datetime import datetime

# Import all generators
from data_generator import IndianFinancialDataGenerator
from pdf_generator import BankStatementPDFGenerator
from credit_card_generator import CreditCardDataGenerator
from investment_generator import InvestmentDataGenerator
from loan_generator import LoanDataGenerator
from other_documents_generator import OtherDocumentsGenerator

def generate_all_sample_data():
    """Generate all types of financial sample data."""
    
    print("=" * 60)
    print("INDIAN FINANCE AUTOMATION APP - SAMPLE DATA GENERATOR")
    print("=" * 60)
    print(f"Starting generation at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    generated_files = []
    
    try:
        # 1. Generate Bank Statements
        print("📊 GENERATING BANK STATEMENTS...")
        print("-" * 40)
        
        bank_generator = BankStatementPDFGenerator()
        bank_files = bank_generator.generate_all_bank_statements(num_transactions=25)
        generated_files.extend(bank_files)
        
        print(f"✅ Generated {len(bank_files)} bank statements")
        for file_path in bank_files:
            print(f"   • {os.path.basename(file_path)}")
        print()
        
        # 2. Generate Credit Card Statements
        print("💳 GENERATING CREDIT CARD STATEMENTS...")
        print("-" * 40)
        
        cc_generator = CreditCardDataGenerator()
        cc_files = []
        
        for bank in ['HDFC', 'ICICI', 'SBI', 'AXIS']:
            file_path = cc_generator.generate_credit_card_pdf(bank, num_transactions=20)
            cc_files.append(file_path)
            generated_files.append(file_path)
        
        print(f"✅ Generated {len(cc_files)} credit card statements")
        for file_path in cc_files:
            print(f"   • {os.path.basename(file_path)}")
        print()
        
        # 3. Generate Investment Documents
        print("📈 GENERATING INVESTMENT DOCUMENTS...")
        print("-" * 40)
        
        investment_generator = InvestmentDataGenerator()
        investment_files = investment_generator.generate_investment_documents()
        generated_files.extend(investment_files)
        
        print(f"✅ Generated {len(investment_files)} investment documents")
        for file_path in investment_files:
            print(f"   • {os.path.basename(file_path)}")
        print()
        
        # 4. Generate Loan Statements
        print("🏠 GENERATING LOAN STATEMENTS...")
        print("-" * 40)
        
        loan_generator = LoanDataGenerator()
        loan_files = loan_generator.generate_loan_documents()
        generated_files.extend(loan_files)
        
        print(f"✅ Generated {len(loan_files)} loan statements")
        for file_path in loan_files:
            print(f"   • {os.path.basename(file_path)}")
        print()
        
        # 5. Generate Other Financial Documents
        print("📋 GENERATING OTHER FINANCIAL DOCUMENTS...")
        print("-" * 40)
        
        other_generator = OtherDocumentsGenerator()
        other_files = other_generator.generate_other_documents()
        generated_files.extend(other_files)
        
        print(f"✅ Generated {len(other_files)} other financial documents")
        for file_path in other_files:
            print(f"   • {os.path.basename(file_path)}")
        print()
        
        # 6. Generate Additional Sample JSON Data
        print("📝 GENERATING SAMPLE JSON DATA...")
        print("-" * 40)
        
        # Basic transaction data
        base_generator = IndianFinancialDataGenerator()
        
        # Generate various bank statement samples
        banks = ['HDFC', 'SBI', 'ICICI', 'AXIS']
        for bank in banks:
            statement_data = base_generator.generate_statement_data(bank, num_transactions=30)
            json_file = f"bank-statements/sample_{bank.lower()}_statement.json"
            
            import json
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(statement_data, f, indent=2, ensure_ascii=False)
            
            generated_files.append(json_file)
        
        print("✅ Generated additional JSON sample data files")
        print("   • Sample bank statement data for all major banks")
        print("   • Edge cases and test scenarios included")
        print()
        
        # 7. Generate Documentation
        print("📚 GENERATING DOCUMENTATION...")
        print("-" * 40)
        
        create_readme_file(len(generated_files))
        create_requirements_file()
        
        print("✅ Generated documentation files")
        print("   • README.md with usage instructions")
        print("   • requirements.txt for dependencies")
        print()
        
        # Summary
        print("=" * 60)
        print("🎉 GENERATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print(f"Total files generated: {len(generated_files)}")
        print(f"Completion time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        print("📁 DIRECTORY STRUCTURE:")
        print("test-data/")
        print("├── bank-statements/     (Bank account statements)")
        print("├── credit-cards/        (Credit card statements)")  
        print("├── investments/         (SIP & Mutual fund statements)")
        print("├── loans/              (Loan account statements)")
        print("├── others/             (Insurance, FD certificates)")
        print("├── html_templates/     (HTML templates for all documents)")
        print("└── *.py                (Python generators)")
        print()
        
        print("🔧 NEXT STEPS:")
        print("1. Review generated sample documents in respective directories")
        print("2. Test OCR and parsing with these realistic documents") 
        print("3. Use JSON files for unit testing and validation")
        print("4. Install additional dependencies if needed:")
        print("   pip install -r requirements.txt")
        print()
        
        print("🎯 TESTING SCENARIOS COVERED:")
        print("✓ Normal transactions and payments")
        print("✓ Edge cases (negative balances, large amounts)")
        print("✓ Various transaction types (UPI, NEFT, IMPS, ATM)")
        print("✓ Different Indian banks and financial institutions")
        print("✓ Multiple document formats and layouts")
        print("✓ Realistic Indian financial data (INR, DD/MM/YYYY, etc.)")
        
    except Exception as e:
        print(f"❌ Error during generation: {str(e)}")
        print("Please check the error and try again.")
        sys.exit(1)

def create_readme_file(total_files: int):
    """Create a README file with instructions."""
    
    readme_content = f"""# Financial Documents Test Data

This directory contains sample financial documents generated for testing the finance automation app.

## Generated Content

- **Total Files**: {total_files}
- **Generation Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Directory Structure

```
test-data/
├── bank-statements/     # Bank account statements (HDFC, SBI, ICICI)
├── credit-cards/        # Credit card statements  
├── investments/         # SIP & Mutual fund statements
├── loans/              # Loan account statements (Home, Personal, Car loans)
├── others/             # Insurance receipts, FD certificates
├── html_templates/     # HTML templates for all document types
└── *.py               # Python data generators
```

## Document Types

### Bank Statements
- HDFC Bank statements
- State Bank of India statements  
- ICICI Bank statements
- Realistic transaction history with Indian banking formats

### Credit Card Statements
- Multiple bank credit card statements
- Purchase transactions, payments, and balances
- Realistic merchant names and categories

### Investment Documents
- SIP (Systematic Investment Plan) statements
- Mutual fund consolidated account statements (CAS)
- NAV history and transaction details

### Loan Statements  
- Home loan statements
- Personal loan statements
- Car loan statements
- Education loan statements
- EMI schedules and payment history

### Other Financial Documents
- Life insurance premium receipts
- Fixed deposit certificates
- Investment receipts

## Key Features

### Realistic Indian Financial Data
- ✅ INR currency format (₹)
- ✅ DD/MM/YYYY date format
- ✅ Indian bank names and IFSC codes
- ✅ UPI transaction IDs and handles
- ✅ Realistic account numbers and reference numbers
- ✅ Indian names and addresses

### Transaction Types Covered
- UPI payments (@paytm, @phonepe, @googlepay, etc.)
- NEFT/IMPS transfers
- ATM withdrawals  
- Debit/Credit card transactions
- Online payments and bill payments
- Salary credits and EMI debits

### Edge Cases for Testing
- Negative account balances
- Large transaction amounts
- Failed transactions
- Refunds and reversals
- International transactions
- Micro transactions (₹5-₹10)

## Usage Instructions

### For OCR Testing
1. Use the HTML files in each category directory
2. Convert to PDF using a browser's print function if needed
3. Test OCR accuracy with different document layouts

### For Parser Development  
1. Use the JSON sample data files for unit testing
2. Test transaction categorization with realistic merchant names
3. Validate amount parsing with Indian number formats

### For Data Validation
1. Cross-reference generated data with JSON files
2. Test edge cases using the sample_transactions.json
3. Validate calculations (balances, EMI amounts, etc.)

## Dependencies

Install required Python packages:
```bash
pip install -r requirements.txt
```

## Regenerating Data

To generate new sample data:
```bash
python generate_all_samples.py
```

To generate specific document types:
```bash
python pdf_generator.py          # Bank statements
python credit_card_generator.py  # Credit card statements  
python investment_generator.py   # Investment documents
python loan_generator.py         # Loan statements
python other_documents_generator.py  # Other documents
```

## Document Formats

All documents are generated as HTML files that closely mimic real bank statement layouts. They can be converted to PDF for testing if needed.

### Template Customization
- HTML templates are in `html_templates/` directory
- Modify templates to match specific bank layouts
- CSS styling mimics real bank document formatting

## Testing Recommendations

1. **OCR Testing**: Test with different document qualities and resolutions
2. **Parser Testing**: Validate extraction of key data points (amounts, dates, account numbers)
3. **Categorization**: Test automatic transaction categorization
4. **Edge Cases**: Ensure robust handling of unusual scenarios
5. **Format Validation**: Test with different banks and document layouts

## Support

For issues or questions about the generated test data, check the individual generator scripts for customization options.
"""

    with open('README.md', 'w', encoding='utf-8') as f:
        f.write(readme_content)

def create_requirements_file():
    """Create a requirements.txt file."""
    
    requirements_content = """# Finance Test Data Generator Dependencies

# Core dependencies
jinja2>=3.1.0           # Template rendering
python-dateutil>=2.8.0 # Date manipulation

# Optional dependencies (for PDF generation)
pdfkit>=1.0.0          # PDF generation from HTML
wkhtmltopdf            # System dependency for pdfkit

# Additional utilities
requests>=2.28.0       # For web-based features (if needed)

# Development and testing
pytest>=7.0.0          # For unit testing
pytest-cov>=4.0.0     # Coverage reporting

# Data processing (if extending functionality)
pandas>=1.5.0          # Data analysis
numpy>=1.20.0          # Numerical operations

# Installation instructions:
# 
# 1. Install Python dependencies:
#    pip install -r requirements.txt
#
# 2. Install wkhtmltopdf (for PDF generation):
#    
#    Ubuntu/Debian:
#    sudo apt-get install wkhtmltopdf
#    
#    macOS (with Homebrew):
#    brew install wkhtmltopdf
#    
#    Windows:
#    Download from: https://wkhtmltopdf.org/downloads.html
#
# 3. Note: PDF generation is optional. HTML files work fine for testing.
"""

    with open('requirements.txt', 'w', encoding='utf-8') as f:
        f.write(requirements_content)

if __name__ == "__main__":
    generate_all_sample_data()