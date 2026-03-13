#!/usr/bin/env python3
"""
Other Financial Documents Generator
Generates various other financial documents like insurance receipts, FD certificates, etc.
"""

import random
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from jinja2 import Template
import os

class OtherDocumentsGenerator:
    """Generates various other financial documents."""
    
    # Insurance companies
    INSURANCE_COMPANIES = {
        'LIC': {
            'name': 'Life Insurance Corporation of India',
            'customer_care': '1251',
            'website': 'www.licindia.in',
            'registered_office': 'Yogakshema Building, Jeevan Bima Marg, Mumbai - 400021'
        },
        'ICICI_PRUDENTIAL': {
            'name': 'ICICI Prudential Life Insurance',
            'customer_care': '1860-266-7766',
            'website': 'www.iciciprulife.com',
            'registered_office': 'ICICI PruLife Towers, 1089, Appasaheb Marathe Marg, Mumbai - 400025'
        },
        'HDFC_LIFE': {
            'name': 'HDFC Life Insurance Company Limited',
            'customer_care': '1860-267-9999',
            'website': 'www.hdfclife.com',
            'registered_office': 'Lodha Excelus, 13th Floor, Apollo Mills Compound, Mumbai - 400013'
        },
        'SBI_LIFE': {
            'name': 'SBI Life Insurance Company Limited',
            'customer_care': '1800-267-9090',
            'website': 'www.sbilife.co.in',
            'registered_office': 'Natraj, M.V. Road, Andheri (East), Mumbai - 400069'
        }
    }
    
    # Policy types
    POLICY_TYPES = [
        'Term Life Insurance',
        'Whole Life Insurance',
        'Endowment Policy',
        'Unit Linked Insurance Plan (ULIP)',
        'Money Back Policy',
        'Child Education Plan',
        'Pension Plan',
        'Health Insurance'
    ]
    
    # Bank data for FD certificates
    BANKS_FD = {
        'SBI': {
            'name': 'State Bank of India',
            'tagline': 'Pure Banking Nothing Else'
        },
        'HDFC': {
            'name': 'HDFC Bank Limited',
            'tagline': 'We understand your world'
        },
        'ICICI': {
            'name': 'ICICI Bank Limited',
            'tagline': 'Hum Hai Na'
        }
    }
    
    # Names for generating data
    FIRST_NAMES = [
        'Rajesh', 'Priya', 'Amit', 'Sunita', 'Rohan', 'Kavya',
        'Vikash', 'Anjali', 'Arjun', 'Neha', 'Ravi', 'Pooja'
    ]
    
    LAST_NAMES = [
        'Sharma', 'Gupta', 'Singh', 'Patel', 'Kumar', 'Shah',
        'Jain', 'Agarwal', 'Verma', 'Mishra', 'Reddy', 'Nair'
    ]
    
    LOCATIONS = [
        'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata',
        'Pune', 'Hyderabad', 'Ahmedabad', 'Jaipur', 'Chandigarh'
    ]
    
    def __init__(self):
        self.current_date = datetime.now()
    
    def generate_policy_number(self, company_code: str) -> str:
        """Generate a realistic insurance policy number."""
        prefixes = {
            'LIC': 'LIC',
            'ICICI_PRUDENTIAL': 'ICP',
            'HDFC_LIFE': 'HDL',
            'SBI_LIFE': 'SBL'
        }
        
        prefix = prefixes.get(company_code, 'INS')
        number = random.randint(100000000, 999999999)
        return f"{prefix}{number}"
    
    def generate_receipt_number(self) -> str:
        """Generate a receipt number."""
        return f"RCP{random.randint(100000000, 999999999)}"
    
    def generate_fd_receipt_number(self) -> str:
        """Generate FD receipt number."""
        return f"FD{random.randint(100000000000, 999999999999)}"
    
    def generate_certificate_number(self) -> str:
        """Generate certificate number."""
        return f"CERT{random.randint(10000000, 99999999)}"
    
    def calculate_fd_maturity(self, principal: float, rate: float, tenure_months: int) -> float:
        """Calculate FD maturity amount with compound interest."""
        # Quarterly compounding
        quarterly_rate = rate / 4 / 100
        quarters = tenure_months / 3
        maturity_amount = principal * ((1 + quarterly_rate) ** quarters)
        return round(maturity_amount, 2)
    
    def generate_insurance_receipt(self, company_code: str = None) -> Dict[str, Any]:
        """Generate insurance premium receipt."""
        
        if company_code is None:
            company_code = random.choice(list(self.INSURANCE_COMPANIES.keys()))
        
        company_info = self.INSURANCE_COMPANIES[company_code]
        
        # Generate policy details
        policy_holder_name = f"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}"
        life_assured_name = policy_holder_name  # Usually same for individual policies
        policy_type = random.choice(self.POLICY_TYPES)
        policy_number = self.generate_policy_number(company_code)
        receipt_number = self.generate_receipt_number()
        
        # Generate amounts
        sum_assured = random.choice([500000, 1000000, 1500000, 2000000, 2500000, 3000000, 5000000])
        basic_premium = round(sum_assured * random.uniform(0.02, 0.05), 2)  # 2-5% of sum assured
        service_tax = round(basic_premium * 0.18, 2)  # 18% GST
        total_premium = basic_premium + service_tax
        
        # Generate dates
        payment_date = datetime.now() - timedelta(days=random.randint(1, 30))
        due_date = payment_date - timedelta(days=random.randint(0, 15))
        
        # Payment modes
        payment_modes = ['Online Banking', 'Credit Card', 'Debit Card', 'UPI', 'NEFT', 'Cheque']
        payment_mode = random.choice(payment_modes)
        
        # Premium terms
        premium_terms = ['Annual', 'Half-Yearly', 'Quarterly', 'Monthly']
        premium_term = random.choice(premium_terms)
        
        receipt_data = {
            'insurance_company': company_info['name'],
            'customer_care': company_info['customer_care'],
            'website': company_info['website'],
            'registered_office': company_info['registered_office'],
            'policy_number': policy_number,
            'policy_type': policy_type,
            'policy_holder_name': policy_holder_name,
            'life_assured_name': life_assured_name,
            'sum_assured': f"{sum_assured:,}",
            'receipt_number': receipt_number,
            'payment_date': payment_date.strftime('%d/%m/%Y'),
            'due_date': due_date.strftime('%d/%m/%Y'),
            'payment_mode': payment_mode,
            'premium_term': premium_term,
            'basic_premium': f"{basic_premium:,.2f}",
            'service_tax': f"{service_tax:,.2f}",
            'total_premium': f"{total_premium:,.2f}"
        }\n        \n        return receipt_data\n    \n    def generate_fd_certificate(self, bank_code: str = None) -> Dict[str, Any]:\n        \"\"\"Generate Fixed Deposit certificate.\"\"\"\n        \n        if bank_code is None:\n            bank_code = random.choice(list(self.BANKS_FD.keys()))\n        \n        bank_info = self.BANKS_FD[bank_code]\n        \n        # Generate depositor details\n        depositor_name = f\"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}\"\n        nominee_name = f\"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}\"\n        \n        # Generate FD details\n        fd_receipt_number = self.generate_fd_receipt_number()\n        certificate_number = self.generate_certificate_number()\n        \n        # Generate amounts and terms\n        principal_amount = random.choice([25000, 50000, 100000, 200000, 500000, 1000000, 2000000])\n        tenure_months = random.choice([6, 12, 18, 24, 36, 60])\n        interest_rate = round(random.uniform(5.5, 8.5), 2)\n        \n        # Calculate maturity amount\n        maturity_amount = self.calculate_fd_maturity(principal_amount, interest_rate, tenure_months)\n        \n        # Generate dates\n        deposit_date = datetime.now() - timedelta(days=random.randint(30, 365))\n        maturity_date = deposit_date + timedelta(days=tenure_months * 30)\n        issue_date = deposit_date + timedelta(days=1)\n        \n        branch_location = random.choice(self.LOCATIONS)\n        \n        fd_data = {\n            'bank_name': bank_info['name'],\n            'bank_tagline': bank_info['tagline'],\n            'certificate_number': certificate_number,\n            'depositor_name': depositor_name,\n            'fd_receipt_number': fd_receipt_number,\n            'principal_amount': f\"{principal_amount:,}\",\n            'deposit_date': deposit_date.strftime('%d/%m/%Y'),\n            'maturity_date': maturity_date.strftime('%d/%m/%Y'),\n            'tenure': tenure_months,\n            'interest_rate': interest_rate,\n            'maturity_amount': f\"{maturity_amount:,}\",\n            'nominee_name': nominee_name,\n            'issue_date': issue_date.strftime('%d/%m/%Y'),\n            'branch_location': branch_location\n        }\n        \n        return fd_data\n    \n    def generate_other_documents(self, output_dir: str = 'others') -> List[str]:\n        \"\"\"Generate all other financial documents.\"\"\"\n        os.makedirs(output_dir, exist_ok=True)\n        generated_files = []\n        \n        # Generate insurance premium receipts\n        for company in ['LIC', 'HDFC_LIFE', 'ICICI_PRUDENTIAL']:\n            receipt_data = self.generate_insurance_receipt(company)\n            \n            # Load template and render\n            template_path = os.path.join('html_templates', 'insurance_premium_receipt_template.html')\n            with open(template_path, 'r', encoding='utf-8') as f:\n                html_template = f.read()\n            \n            template = Template(html_template)\n            rendered_html = template.render(**receipt_data)\n            \n            # Save file\n            company_name = receipt_data['insurance_company'].replace(' ', '_')\n            filename = f\"{company}_Premium_Receipt_{receipt_data['receipt_number'][-6:]}.html\"\n            file_path = os.path.join(output_dir, filename)\n            \n            with open(file_path, 'w', encoding='utf-8') as f:\n                f.write(rendered_html)\n            \n            generated_files.append(file_path)\n        \n        # Generate FD certificates\n        for bank in ['SBI', 'HDFC', 'ICICI']:\n            fd_data = self.generate_fd_certificate(bank)\n            \n            # Load template and render\n            template_path = os.path.join('html_templates', 'fd_certificate_template.html')\n            with open(template_path, 'r', encoding='utf-8') as f:\n                html_template = f.read()\n            \n            template = Template(html_template)\n            rendered_html = template.render(**fd_data)\n            \n            # Save file\n            filename = f\"{bank}_FD_Certificate_{fd_data['certificate_number'][-6:]}.html\"\n            file_path = os.path.join(output_dir, filename)\n            \n            with open(file_path, 'w', encoding='utf-8') as f:\n                f.write(rendered_html)\n            \n            generated_files.append(file_path)\n        \n        return generated_files\n\ndef main():\n    \"\"\"Generate sample other financial documents.\"\"\"\n    print(\"Other Financial Documents Generator\")\n    print(\"=\" * 50)\n    \n    generator = OtherDocumentsGenerator()\n    \n    # Generate all other documents\n    generated_files = generator.generate_other_documents()\n    \n    print(f\"\\nGenerated {len(generated_files)} other financial documents:\")\n    for file_path in generated_files:\n        print(f\"  - {os.path.basename(file_path)}\")\n    \n    # Generate sample JSON data\n    sample_insurance = generator.generate_insurance_receipt('LIC')\n    with open('others/sample_insurance_receipt.json', 'w', encoding='utf-8') as f:\n        json.dump(sample_insurance, f, indent=2, ensure_ascii=False)\n    \n    sample_fd = generator.generate_fd_certificate('HDFC')\n    with open('others/sample_fd_certificate.json', 'w', encoding='utf-8') as f:\n        json.dump(sample_fd, f, indent=2, ensure_ascii=False)\n    \n    print(\"\\nSample JSON data files created:\")\n    print(\"  - others/sample_insurance_receipt.json\")\n    print(\"  - others/sample_fd_certificate.json\")\n\nif __name__ == \"__main__\":\n    main()"
        
        return receipt_data
    
    def generate_fd_certificate(self, bank_code: str = None) -> Dict[str, Any]:
        """Generate Fixed Deposit certificate."""
        
        if bank_code is None:
            bank_code = random.choice(list(self.BANKS_FD.keys()))
        
        bank_info = self.BANKS_FD[bank_code]
        
        # Generate depositor details
        depositor_name = f"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}"
        nominee_name = f"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}"
        
        # Generate FD details
        fd_receipt_number = self.generate_fd_receipt_number()
        certificate_number = self.generate_certificate_number()
        
        # Generate amounts and terms
        principal_amount = random.choice([25000, 50000, 100000, 200000, 500000, 1000000, 2000000])
        tenure_months = random.choice([6, 12, 18, 24, 36, 60])
        interest_rate = round(random.uniform(5.5, 8.5), 2)
        
        # Calculate maturity amount
        maturity_amount = self.calculate_fd_maturity(principal_amount, interest_rate, tenure_months)
        
        # Generate dates
        deposit_date = datetime.now() - timedelta(days=random.randint(30, 365))
        maturity_date = deposit_date + timedelta(days=tenure_months * 30)
        issue_date = deposit_date + timedelta(days=1)
        
        branch_location = random.choice(self.LOCATIONS)
        
        fd_data = {
            'bank_name': bank_info['name'],
            'bank_tagline': bank_info['tagline'],
            'certificate_number': certificate_number,
            'depositor_name': depositor_name,
            'fd_receipt_number': fd_receipt_number,
            'principal_amount': f"{principal_amount:,}",
            'deposit_date': deposit_date.strftime('%d/%m/%Y'),
            'maturity_date': maturity_date.strftime('%d/%m/%Y'),
            'tenure': tenure_months,
            'interest_rate': interest_rate,
            'maturity_amount': f"{maturity_amount:,}",
            'nominee_name': nominee_name,
            'issue_date': issue_date.strftime('%d/%m/%Y'),
            'branch_location': branch_location
        }
        
        return fd_data
    
    def generate_other_documents(self, output_dir: str = 'others') -> List[str]:
        """Generate all other financial documents."""
        os.makedirs(output_dir, exist_ok=True)
        generated_files = []
        
        # Generate insurance premium receipts
        for company in ['LIC', 'HDFC_LIFE', 'ICICI_PRUDENTIAL']:
            receipt_data = self.generate_insurance_receipt(company)
            
            # Load template and render
            template_path = os.path.join('html_templates', 'insurance_premium_receipt_template.html')
            with open(template_path, 'r', encoding='utf-8') as f:
                html_template = f.read()
            
            template = Template(html_template)
            rendered_html = template.render(**receipt_data)
            
            # Save file
            company_name = receipt_data['insurance_company'].replace(' ', '_')
            filename = f"{company}_Premium_Receipt_{receipt_data['receipt_number'][-6:]}.html"
            file_path = os.path.join(output_dir, filename)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(rendered_html)
            
            generated_files.append(file_path)
        
        # Generate FD certificates
        for bank in ['SBI', 'HDFC', 'ICICI']:
            fd_data = self.generate_fd_certificate(bank)
            
            # Load template and render
            template_path = os.path.join('html_templates', 'fd_certificate_template.html')
            with open(template_path, 'r', encoding='utf-8') as f:
                html_template = f.read()
            
            template = Template(html_template)
            rendered_html = template.render(**fd_data)
            
            # Save file
            filename = f"{bank}_FD_Certificate_{fd_data['certificate_number'][-6:]}.html"
            file_path = os.path.join(output_dir, filename)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(rendered_html)
            
            generated_files.append(file_path)
        
        return generated_files

def main():
    """Generate sample other financial documents."""
    print("Other Financial Documents Generator")
    print("=" * 50)
    
    generator = OtherDocumentsGenerator()
    
    # Generate all other documents
    generated_files = generator.generate_other_documents()
    
    print(f"\nGenerated {len(generated_files)} other financial documents:")
    for file_path in generated_files:
        print(f"  - {os.path.basename(file_path)}")
    
    # Generate sample JSON data
    sample_insurance = generator.generate_insurance_receipt('LIC')
    with open('others/sample_insurance_receipt.json', 'w', encoding='utf-8') as f:
        json.dump(sample_insurance, f, indent=2, ensure_ascii=False)
    
    sample_fd = generator.generate_fd_certificate('HDFC')
    with open('others/sample_fd_certificate.json', 'w', encoding='utf-8') as f:
        json.dump(sample_fd, f, indent=2, ensure_ascii=False)
    
    print("\nSample JSON data files created:")
    print("  - others/sample_insurance_receipt.json")
    print("  - others/sample_fd_certificate.json")

if __name__ == "__main__":
    main()