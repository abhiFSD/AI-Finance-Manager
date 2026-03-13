#!/usr/bin/env python3
"""
Loan Statement Generator for Indian Banking System
Generates realistic loan statements including home loans, personal loans, car loans, etc.
"""

import random
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from jinja2 import Template
import os
import math

class LoanDataGenerator:
    """Generates realistic loan statement data for Indian banks."""
    
    # Banks and their loan products
    BANK_DATA = {
        'HDFC': {
            'name': 'HDFC Bank Limited',
            'tagline': 'We understand your world',
            'customer_care': '1800-266-4332',
            'loan_helpline': '1800-202-6161',
            'website': 'www.hdfcbank.com',
            'support_email': 'support@hdfcbank.com',
            'registered_office': 'HDFC Bank House, Senapati Bapat Marg, Lower Parel, Mumbai - 400013'
        },
        'SBI': {
            'name': 'State Bank of India',
            'tagline': 'Pure Banking Nothing Else',
            'customer_care': '1800-11-2211',
            'loan_helpline': '1800-11-1111',
            'website': 'www.sbi.co.in',
            'support_email': 'support@sbi.co.in',
            'registered_office': 'State Bank Bhavan, Nariman Point, Mumbai - 400021'
        },
        'ICICI': {
            'name': 'ICICI Bank Limited',
            'tagline': 'Hum Hai Na',
            'customer_care': '1860-120-7777',
            'loan_helpline': '1860-120-7777',
            'website': 'www.icicibank.com',
            'support_email': 'customer.care@icicibank.com',
            'registered_office': 'ICICI Bank Towers, Bandra Kurla Complex, Mumbai - 400051'
        },
        'AXIS': {
            'name': 'Axis Bank Limited',
            'tagline': 'Badhti ka naam zindagi',
            'customer_care': '1860-419-5555',
            'loan_helpline': '1860-419-5555',
            'website': 'www.axisbank.com',
            'support_email': 'customercare@axisbank.com',
            'registered_office': 'Axis Bank House, C-2, Wadia International Centre, Mumbai - 400025'
        }
    }
    
    # Loan types and their characteristics
    LOAN_TYPES = {
        'Home Loan': {
            'min_amount': 500000,
            'max_amount': 10000000,
            'min_tenure': 60,  # months
            'max_tenure': 360,
            'interest_rate_range': (6.5, 9.5),
            'prepayment_charges': 'Nil for floating rate loans'
        },
        'Personal Loan': {
            'min_amount': 50000,
            'max_amount': 4000000,
            'min_tenure': 12,
            'max_tenure': 84,
            'interest_rate_range': (10.5, 21.0),
            'prepayment_charges': '2-4% of outstanding amount'
        },
        'Car Loan': {
            'min_amount': 100000,
            'max_amount': 2000000,
            'min_tenure': 12,
            'max_tenure': 84,
            'interest_rate_range': (7.5, 15.0),
            'prepayment_charges': '3-5% of outstanding amount'
        },
        'Education Loan': {
            'min_amount': 100000,
            'max_amount': 7500000,
            'min_tenure': 60,
            'max_tenure': 180,
            'interest_rate_range': (8.5, 14.0),
            'prepayment_charges': 'Nil after moratorium period'
        },
        'Business Loan': {
            'min_amount': 500000,
            'max_amount': 50000000,
            'min_tenure': 12,
            'max_tenure': 120,
            'interest_rate_range': (9.0, 18.0),
            'prepayment_charges': '2-3% of outstanding amount'
        }
    }
    
    # Names for realistic data generation
    FIRST_NAMES = [
        'Rajesh', 'Priya', 'Amit', 'Sunita', 'Rohan', 'Kavya',
        'Vikash', 'Anjali', 'Arjun', 'Neha', 'Ravi', 'Pooja',
        'Suresh', 'Meera', 'Deepak', 'Ritika', 'Ankit', 'Shreya'
    ]
    
    LAST_NAMES = [
        'Sharma', 'Gupta', 'Singh', 'Patel', 'Kumar', 'Shah',
        'Jain', 'Agarwal', 'Verma', 'Mishra', 'Reddy', 'Nair'
    ]
    
    # Branch locations
    BRANCH_LOCATIONS = [
        'Andheri West, Mumbai',
        'Connaught Place, New Delhi',
        'Koramangala, Bangalore',
        'Anna Nagar, Chennai',
        'Park Street, Kolkata',
        'Sector 17, Chandigarh',
        'MG Road, Pune',
        'Banjara Hills, Hyderabad'
    ]
    
    def __init__(self):
        self.current_date = datetime.now()
    
    def generate_loan_account_number(self, bank_code: str, loan_type: str) -> str:
        """Generate a realistic loan account number."""
        bank_prefixes = {
            'HDFC': 'HL',
            'SBI': 'SB',
            'ICICI': 'IC',
            'AXIS': 'AX'
        }
        
        loan_prefixes = {
            'Home Loan': 'HL',
            'Personal Loan': 'PL',
            'Car Loan': 'CL',
            'Education Loan': 'EL',
            'Business Loan': 'BL'
        }
        
        bank_prefix = bank_prefixes.get(bank_code, 'LN')
        loan_prefix = loan_prefixes.get(loan_type, 'LN')
        number = random.randint(10000000000, 99999999999)
        
        return f"{bank_prefix}{loan_prefix}{number}"
    
    def calculate_emi(self, principal: float, rate: float, tenure_months: int) -> float:
        """Calculate EMI using the standard formula."""
        monthly_rate = rate / (12 * 100)
        if monthly_rate == 0:
            return principal / tenure_months
        
        emi = (principal * monthly_rate * ((1 + monthly_rate) ** tenure_months)) / \
              (((1 + monthly_rate) ** tenure_months) - 1)
        
        return round(emi, 2)
    
    def generate_payment_history(self, 
                                emi_amount: float, 
                                start_date: datetime, 
                                tenure_months: int,
                                principal: float,
                                interest_rate: float) -> List[Dict]:
        """Generate realistic payment history with amortization."""
        
        monthly_rate = interest_rate / (12 * 100)
        remaining_principal = principal
        payment_history = []
        
        # Generate payments for the last 12 months or total tenure, whichever is less
        months_to_generate = min(12, tenure_months)
        current_date = start_date
        
        for month in range(months_to_generate):
            due_date = current_date.replace(day=5)  # EMI due on 5th of every month
            
            # Calculate interest and principal components
            interest_amount = remaining_principal * monthly_rate
            principal_amount = emi_amount - interest_amount
            
            # Ensure principal doesn't become negative
            if principal_amount > remaining_principal:
                principal_amount = remaining_principal
                interest_amount = emi_amount - principal_amount
            
            remaining_principal -= principal_amount
            
            # Generate payment status (95% on time, 5% delayed)
            is_late = random.random() < 0.05
            late_fee = random.uniform(100, 500) if is_late else 0
            
            # Payment date (on time or 1-5 days late)
            if is_late:
                payment_date = due_date + timedelta(days=random.randint(1, 5))
                status = 'Paid (Late)'
                status_class = 'payment_due'
            else:
                payment_date = due_date - timedelta(days=random.randint(0, 2))
                status = 'Paid'
                status_class = 'payment-made'
            
            payment = {
                'payment_date': payment_date.strftime('%d/%m/%Y'),
                'due_date': due_date.strftime('%d/%m/%Y'),
                'principal_amount': f"{principal_amount:,.2f}",
                'interest_amount': f"{interest_amount:,.2f}",
                'total_payment': f"{emi_amount + late_fee:,.2f}",
                'late_fee': f"{late_fee:,.2f}",
                'outstanding_balance': f"{remaining_principal:,.2f}",
                'status': status,
                'status_class': status_class
            }
            
            payment_history.append(payment)
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        return payment_history, remaining_principal
    
    def generate_upcoming_schedule(self, 
                                 emi_amount: float, 
                                 outstanding_principal: float,
                                 interest_rate: float,
                                 start_month: datetime,
                                 emi_number_start: int) -> List[Dict]:
        """Generate upcoming EMI schedule for next 6 months."""
        
        monthly_rate = interest_rate / (12 * 100)
        remaining_principal = outstanding_principal
        upcoming_schedule = []
        
        current_date = start_month
        
        for i in range(6):  # Next 6 months
            due_date = current_date.replace(day=5)
            
            # Calculate interest and principal components
            interest_amount = remaining_principal * monthly_rate
            principal_amount = emi_amount - interest_amount
            
            # Ensure principal doesn't become negative
            if principal_amount > remaining_principal:
                principal_amount = remaining_principal
                interest_amount = emi_amount - principal_amount
            
            remaining_principal -= principal_amount
            
            schedule_item = {
                'emi_number': emi_number_start + i,
                'due_date': due_date.strftime('%d/%m/%Y'),
                'principal': f"{principal_amount:,.2f}",
                'interest': f"{interest_amount:,.2f}",
                'emi_amount': f"{emi_amount:,.2f}",
                'balance': f"{remaining_principal:,.2f}"
            }
            
            upcoming_schedule.append(schedule_item)
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        return upcoming_schedule
    
    def generate_loan_statement(self, 
                              bank_code: str = None,
                              loan_type: str = None,
                              loan_amount: float = None) -> Dict[str, Any]:
        """Generate complete loan statement data."""
        
        if bank_code is None:
            bank_code = random.choice(list(self.BANK_DATA.keys()))
        
        if loan_type is None:
            loan_type = random.choice(list(self.LOAN_TYPES.keys()))
        
        bank_info = self.BANK_DATA[bank_code]
        loan_info = self.LOAN_TYPES[loan_type]
        
        # Generate loan parameters
        if loan_amount is None:
            loan_amount = random.uniform(loan_info['min_amount'], loan_info['max_amount'])
            loan_amount = round(loan_amount, 2)
        
        tenure_months = random.randint(loan_info['min_tenure'], loan_info['max_tenure'])
        interest_rate = round(random.uniform(*loan_info['interest_rate_range']), 2)\n        \n        # Generate borrower information\n        borrower_name = f\"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}\"\n        co_borrower_name = f\"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}\"\n        loan_account_number = self.generate_loan_account_number(bank_code, loan_type)\n        customer_id = f\"CID{random.randint(100000, 999999)}\"\n        \n        # Generate dates\n        sanction_date = datetime.now() - timedelta(days=random.randint(180, 1095))  # 6 months to 3 years ago\n        end_date = datetime.now()\n        start_date = end_date - timedelta(days=90)  # Last 3 months\n        \n        # Calculate EMI\n        emi_amount = self.calculate_emi(loan_amount, interest_rate, tenure_months)\n        \n        # Generate payment history\n        payment_history, outstanding_principal = self.generate_payment_history(\n            emi_amount, sanction_date, tenure_months, loan_amount, interest_rate\n        )\n        \n        # Calculate total interest paid so far\n        total_interest_paid = sum(float(p['interest_amount'].replace(',', '')) for p in payment_history)\n        \n        # Generate next payment details\n        next_due_date = datetime.now() + timedelta(days=random.randint(1, 30))\n        monthly_rate = interest_rate / (12 * 100)\n        next_interest_amount = outstanding_principal * monthly_rate\n        next_principal_amount = emi_amount - next_interest_amount\n        \n        # Generate upcoming EMI schedule\n        months_elapsed = len(payment_history)\n        upcoming_schedule = self.generate_upcoming_schedule(\n            emi_amount, outstanding_principal, interest_rate, \n            next_due_date, months_elapsed + 1\n        )\n        \n        # Generate auto-debit account number (last 4 digits)\n        auto_debit_account = f\"XXXX{random.randint(1000, 9999)}\"\n        \n        loan_statement = {\n            'bank_name': bank_info['name'],\n            'bank_tagline': bank_info['tagline'],\n            'customer_care': bank_info['customer_care'],\n            'loan_helpline': bank_info['loan_helpline'],\n            'website': bank_info['website'],\n            'support_email': bank_info['support_email'],\n            'registered_office': bank_info['registered_office'],\n            'loan_type': loan_type,\n            'borrower_name': borrower_name,\n            'co_borrower_name': co_borrower_name,\n            'loan_account_number': loan_account_number,\n            'customer_id': customer_id,\n            'mobile_number': f\"+91-{random.randint(7000000000, 9999999999)}\",\n            'branch_name': random.choice(self.BRANCH_LOCATIONS),\n            'sanction_date': sanction_date.strftime('%d/%m/%Y'),\n            'interest_rate': interest_rate,\n            'tenure_years': round(tenure_months / 12, 1),\n            'tenure_months': tenure_months,\n            'start_date': start_date.strftime('%d/%m/%Y'),\n            'end_date': end_date.strftime('%d/%m/%Y'),\n            'statement_date': end_date.strftime('%d/%m/%Y'),\n            'generation_date': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),\n            'original_loan_amount': f\"{loan_amount:,.2f}\",\n            'outstanding_principal': f\"{outstanding_principal:,.2f}\",\n            'emi_amount': f\"{emi_amount:,.2f}\",\n            'total_interest_paid': f\"{total_interest_paid:,.2f}\",\n            'next_due_date': next_due_date.strftime('%d/%m/%Y'),\n            'next_principal_amount': f\"{next_principal_amount:,.2f}\",\n            'next_interest_amount': f\"{next_interest_amount:,.2f}\",\n            'emi_due_date': '5th',\n            'prepayment_charges': loan_info['prepayment_charges'],\n            'default_period': '90',\n            'auto_debit_account': auto_debit_account,\n            'payment_history': payment_history,\n            'upcoming_schedule': upcoming_schedule\n        }\n        \n        return loan_statement\n    \n    def generate_loan_documents(self, output_dir: str = 'loans') -> List[str]:\n        \"\"\"Generate loan statements for different types and banks.\"\"\"\n        os.makedirs(output_dir, exist_ok=True)\n        generated_files = []\n        \n        # Generate statements for different combinations\n        combinations = [\n            ('HDFC', 'Home Loan'),\n            ('SBI', 'Personal Loan'),\n            ('ICICI', 'Car Loan'),\n            ('AXIS', 'Education Loan'),\n            ('HDFC', 'Business Loan')\n        ]\n        \n        for bank_code, loan_type in combinations:\n            loan_data = self.generate_loan_statement(bank_code, loan_type)\n            \n            # Load template and render\n            template_path = os.path.join('html_templates', 'loan_statement_template.html')\n            with open(template_path, 'r', encoding='utf-8') as f:\n                html_template = f.read()\n            \n            template = Template(html_template)\n            rendered_html = template.render(**loan_data)\n            \n            # Save file\n            loan_type_short = loan_type.replace(' ', '_')\n            filename = f\"{bank_code}_{loan_type_short}_{loan_data['loan_account_number'][-6:]}.html\"\n            file_path = os.path.join(output_dir, filename)\n            \n            with open(file_path, 'w', encoding='utf-8') as f:\n                f.write(rendered_html)\n            \n            generated_files.append(file_path)\n        \n        return generated_files\n\ndef main():\n    \"\"\"Generate sample loan statements.\"\"\"\n    print(\"Loan Statement Generator\")\n    print(\"=\" * 40)\n    \n    generator = LoanDataGenerator()\n    \n    # Generate all loan statements\n    generated_files = generator.generate_loan_documents()\n    \n    print(f\"\\nGenerated {len(generated_files)} loan statements:\")\n    for file_path in generated_files:\n        print(f\"  - {os.path.basename(file_path)}\")\n    \n    # Generate sample JSON data\n    sample_home_loan = generator.generate_loan_statement('HDFC', 'Home Loan', 5000000)\n    with open('loans/sample_home_loan_data.json', 'w', encoding='utf-8') as f:\n        json.dump(sample_home_loan, f, indent=2, ensure_ascii=False)\n    \n    sample_personal_loan = generator.generate_loan_statement('ICICI', 'Personal Loan', 500000)\n    with open('loans/sample_personal_loan_data.json', 'w', encoding='utf-8') as f:\n        json.dump(sample_personal_loan, f, indent=2, ensure_ascii=False)\n    \n    print(\"\\nSample JSON data files created:\")\n    print(\"  - loans/sample_home_loan_data.json\")\n    print(\"  - loans/sample_personal_loan_data.json\")\n\nif __name__ == \"__main__\":\n    main()"
        
        # Generate borrower information
        borrower_name = f"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}"
        co_borrower_name = f"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}"
        loan_account_number = self.generate_loan_account_number(bank_code, loan_type)
        customer_id = f"CID{random.randint(100000, 999999)}"
        
        # Generate dates
        sanction_date = datetime.now() - timedelta(days=random.randint(180, 1095))  # 6 months to 3 years ago
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)  # Last 3 months
        
        # Calculate EMI
        emi_amount = self.calculate_emi(loan_amount, interest_rate, tenure_months)
        
        # Generate payment history
        payment_history, outstanding_principal = self.generate_payment_history(
            emi_amount, sanction_date, tenure_months, loan_amount, interest_rate
        )
        
        # Calculate total interest paid so far
        total_interest_paid = sum(float(p['interest_amount'].replace(',', '')) for p in payment_history)
        
        # Generate next payment details
        next_due_date = datetime.now() + timedelta(days=random.randint(1, 30))
        monthly_rate = interest_rate / (12 * 100)
        next_interest_amount = outstanding_principal * monthly_rate
        next_principal_amount = emi_amount - next_interest_amount
        
        # Generate upcoming EMI schedule
        months_elapsed = len(payment_history)
        upcoming_schedule = self.generate_upcoming_schedule(
            emi_amount, outstanding_principal, interest_rate, 
            next_due_date, months_elapsed + 1
        )
        
        # Generate auto-debit account number (last 4 digits)
        auto_debit_account = f"XXXX{random.randint(1000, 9999)}"
        
        loan_statement = {
            'bank_name': bank_info['name'],
            'bank_tagline': bank_info['tagline'],
            'customer_care': bank_info['customer_care'],
            'loan_helpline': bank_info['loan_helpline'],
            'website': bank_info['website'],
            'support_email': bank_info['support_email'],
            'registered_office': bank_info['registered_office'],
            'loan_type': loan_type,
            'borrower_name': borrower_name,
            'co_borrower_name': co_borrower_name,
            'loan_account_number': loan_account_number,
            'customer_id': customer_id,
            'mobile_number': f"+91-{random.randint(7000000000, 9999999999)}",
            'branch_name': random.choice(self.BRANCH_LOCATIONS),
            'sanction_date': sanction_date.strftime('%d/%m/%Y'),
            'interest_rate': interest_rate,
            'tenure_years': round(tenure_months / 12, 1),
            'tenure_months': tenure_months,
            'start_date': start_date.strftime('%d/%m/%Y'),
            'end_date': end_date.strftime('%d/%m/%Y'),
            'statement_date': end_date.strftime('%d/%m/%Y'),
            'generation_date': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
            'original_loan_amount': f"{loan_amount:,.2f}",
            'outstanding_principal': f"{outstanding_principal:,.2f}",
            'emi_amount': f"{emi_amount:,.2f}",
            'total_interest_paid': f"{total_interest_paid:,.2f}",
            'next_due_date': next_due_date.strftime('%d/%m/%Y'),
            'next_principal_amount': f"{next_principal_amount:,.2f}",
            'next_interest_amount': f"{next_interest_amount:,.2f}",
            'emi_due_date': '5th',
            'prepayment_charges': loan_info['prepayment_charges'],
            'default_period': '90',
            'auto_debit_account': auto_debit_account,
            'payment_history': payment_history,
            'upcoming_schedule': upcoming_schedule
        }
        
        return loan_statement
    
    def generate_loan_documents(self, output_dir: str = 'loans') -> List[str]:
        """Generate loan statements for different types and banks."""
        os.makedirs(output_dir, exist_ok=True)
        generated_files = []
        
        # Generate statements for different combinations
        combinations = [
            ('HDFC', 'Home Loan'),
            ('SBI', 'Personal Loan'),
            ('ICICI', 'Car Loan'),
            ('AXIS', 'Education Loan'),
            ('HDFC', 'Business Loan')
        ]
        
        for bank_code, loan_type in combinations:
            loan_data = self.generate_loan_statement(bank_code, loan_type)
            
            # Load template and render
            template_path = os.path.join('html_templates', 'loan_statement_template.html')
            with open(template_path, 'r', encoding='utf-8') as f:
                html_template = f.read()
            
            template = Template(html_template)
            rendered_html = template.render(**loan_data)
            
            # Save file
            loan_type_short = loan_type.replace(' ', '_')
            filename = f"{bank_code}_{loan_type_short}_{loan_data['loan_account_number'][-6:]}.html"
            file_path = os.path.join(output_dir, filename)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(rendered_html)
            
            generated_files.append(file_path)
        
        return generated_files

def main():
    """Generate sample loan statements."""
    print("Loan Statement Generator")
    print("=" * 40)
    
    generator = LoanDataGenerator()
    
    # Generate all loan statements
    generated_files = generator.generate_loan_documents()
    
    print(f"\nGenerated {len(generated_files)} loan statements:")
    for file_path in generated_files:
        print(f"  - {os.path.basename(file_path)}")
    
    # Generate sample JSON data
    sample_home_loan = generator.generate_loan_statement('HDFC', 'Home Loan', 5000000)
    with open('loans/sample_home_loan_data.json', 'w', encoding='utf-8') as f:
        json.dump(sample_home_loan, f, indent=2, ensure_ascii=False)
    
    sample_personal_loan = generator.generate_loan_statement('ICICI', 'Personal Loan', 500000)
    with open('loans/sample_personal_loan_data.json', 'w', encoding='utf-8') as f:
        json.dump(sample_personal_loan, f, indent=2, ensure_ascii=False)
    
    print("\nSample JSON data files created:")
    print("  - loans/sample_home_loan_data.json")
    print("  - loans/sample_personal_loan_data.json")

if __name__ == "__main__":
    main()