#!/usr/bin/env python3
"""
Credit Card Statement Generator for Indian Banking System
Generates realistic credit card statements with transactions and balances.
"""

import random
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from jinja2 import Template
import os

class CreditCardDataGenerator:
    """Generates realistic credit card data for Indian banks."""
    
    BANKS = {
        'HDFC': {
            'name': 'HDFC Bank',
            'card_types': ['Platinum', 'Titanium', 'Regalia', 'Diners Club Black', 'Infinia'],
            'customer_care': '1800-266-4332',
            'website': 'www.hdfcbank.com',
            'lost_card': '1800-267-4332'
        },
        'ICICI': {
            'name': 'ICICI Bank',
            'card_types': ['Platinum', 'Sapphiro', 'Emeralde', 'Manchester United', 'Amazon Pay'],
            'customer_care': '1860-120-7777',
            'website': 'www.icicibank.com',
            'lost_card': '1860-120-7777'
        },
        'SBI': {
            'name': 'State Bank of India',
            'card_types': ['Simply Save', 'Simply Click', 'Prime', 'Elite', 'Signature'],
            'customer_care': '1800-180-1290',
            'website': 'www.sbi.co.in',
            'lost_card': '1800-425-1290'
        },
        'AXIS': {
            'name': 'Axis Bank',
            'card_types': ['My Zone', 'Flipkart', 'Neo', 'Select', 'Reserve'],
            'customer_care': '1860-419-5555',
            'website': 'www.axisbank.com',
            'lost_card': '1860-419-5555'
        }
    }
    
    # Credit Card transaction categories and merchants
    MERCHANT_CATEGORIES = {
        'Dining': [
            'Zomato', 'Swiggy', 'McDonald\'s India', 'KFC', 'Pizza Hut',
            'Domino\'s Pizza', 'Burger King', 'Starbucks', 'CCD', 'Subway'
        ],
        'Shopping': [
            'Amazon.in', 'Flipkart', 'Myntra', 'Ajio', 'Nykaa',
            'BigBasket', 'Grofers', 'Reliance Digital', 'Croma', 'Westside'
        ],
        'Fuel': [
            'Indian Oil Petrol Pump', 'HP Petrol Pump', 'BPCL',
            'Shell Petrol Pump', 'Essar Petrol Pump'
        ],
        'Entertainment': [
            'BookMyShow', 'Netflix India', 'Amazon Prime Video',
            'Disney+ Hotstar', 'PVR Cinemas', 'INOX Movies'
        ],
        'Travel': [
            'MakeMyTrip', 'Goibibo', 'Cleartrip', 'IRCTC',
            'Ola Cabs', 'Uber India', 'SpiceJet', 'IndiGo'
        ],
        'Utilities': [
            'Airtel Payments', 'Jio Recharge', 'BSES Bill Payment',
            'Mahanagar Gas', 'Tata Sky', 'Amazon Pay'
        ],
        'Healthcare': [
            'Apollo Pharmacy', 'NetMeds', 'Practo',
            'Apollo Hospitals', 'Fortis Healthcare'
        ],
        'Education': [
            'BYJU\'S', 'Unacademy', 'Vedantu',
            'School Fee Payment', 'University Fee'
        ]
    }
    
    # Names for generating realistic data
    FIRST_NAMES = [
        'Rajesh', 'Priya', 'Amit', 'Sunita', 'Vikash', 'Anjali',
        'Rohan', 'Kavya', 'Arjun', 'Neha', 'Ravi', 'Pooja',
        'Suresh', 'Meera', 'Ankit', 'Shreya', 'Deepak', 'Ritika'
    ]
    
    LAST_NAMES = [
        'Sharma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Shah',
        'Jain', 'Agarwal', 'Verma', 'Mishra', 'Yadav', 'Reddy'
    ]
    
    def __init__(self):
        self.current_date = datetime.now()
    
    def generate_card_number(self, bank_code: str) -> str:
        """Generate a realistic credit card number (masked for security)."""
        prefixes = {
            'HDFC': ['4130', '4031', '5242'],
            'ICICI': ['4043', '5241', '4506'],
            'SBI': ['4570', '4571', '5218'],
            'AXIS': ['4174', '5555', '4316']
        }
        
        prefix = random.choice(prefixes.get(bank_code, ['4000']))
        # Generate 12 more digits for a 16-digit card
        remaining_digits = ''.join([str(random.randint(0, 9)) for _ in range(12)])
        full_number = prefix + remaining_digits
        
        # Return masked version for display
        return f"{full_number[:4]} XXXX XXXX {full_number[-4:]}"
    
    def generate_transaction_id(self) -> str:
        """Generate a realistic transaction reference number."""
        return f"CC{random.randint(100000000000, 999999999999)}"
    
    def generate_merchant_transaction(self, date: datetime, outstanding: float) -> Dict[str, Any]:
        """Generate a single credit card transaction."""
        category = random.choice(list(self.MERCHANT_CATEGORIES.keys()))
        merchant = random.choice(self.MERCHANT_CATEGORIES[category])
        
        # Generate transaction amounts based on category
        amount_ranges = {
            'Dining': (150, 3000),
            'Shopping': (500, 15000),
            'Fuel': (1000, 5000),
            'Entertainment': (200, 2000),
            'Travel': (2000, 50000),
            'Utilities': (300, 3000),
            'Healthcare': (500, 10000),
            'Education': (1000, 25000)
        }
        
        min_amount, max_amount = amount_ranges.get(category, (100, 5000))
        amount = round(random.uniform(min_amount, max_amount), 2)
        
        # Most transactions are debits (purchases), some are credits (refunds)
        is_credit = random.random() < 0.05  # 5% chance of refund
        if is_credit:
            amount = -amount
        
        outstanding += amount
        
        transaction = {
            'date': date.strftime('%d/%m/%Y'),
            'reference_number': self.generate_transaction_id(),
            'description': f"{category} - {merchant}",
            'merchant': merchant,
            'amount': amount,
            'outstanding': round(outstanding, 2),
            'category': category,
            'is_credit': is_credit
        }
        
        return transaction, outstanding
    
    def generate_payment_transaction(self, date: datetime, outstanding: float) -> Dict[str, Any]:
        """Generate a payment transaction."""
        # Payment amounts are usually significant portions of the outstanding
        payment_percentage = random.uniform(0.3, 1.0)
        payment_amount = -round(outstanding * payment_percentage, 2)
        outstanding += payment_amount
        
        payment_methods = [
            'Online Payment via Net Banking',
            'Auto Debit - Savings Account',
            'UPI Payment',
            'NEFT Transfer',
            'Cheque Payment'
        ]
        
        transaction = {
            'date': date.strftime('%d/%m/%Y'),
            'reference_number': self.generate_transaction_id(),
            'description': random.choice(payment_methods),
            'merchant': 'Payment Received',
            'amount': payment_amount,
            'outstanding': round(outstanding, 2),
            'category': 'Payment',
            'is_credit': True
        }
        
        return transaction, outstanding
    
    def generate_credit_card_statement(self, 
                                     bank_code: str = None,
                                     num_transactions: int = 30,
                                     start_date: datetime = None,
                                     end_date: datetime = None) -> Dict[str, Any]:
        """Generate complete credit card statement data."""
        
        if bank_code is None:
            bank_code = random.choice(list(self.BANKS.keys()))
        
        if start_date is None:
            start_date = datetime.now() - timedelta(days=30)
        if end_date is None:
            end_date = datetime.now()
        
        bank_info = self.BANKS[bank_code]
        
        # Generate basic card information
        cardholder_name = f"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}"
        card_type = random.choice(bank_info['card_types'])
        card_number_masked = self.generate_card_number(bank_code)
        customer_id = f"CC{random.randint(1000000, 9999999)}"
        
        # Generate credit limits
        credit_limit = random.choice([50000, 100000, 200000, 300000, 500000])
        cash_limit = credit_limit * 0.3  # 30% of credit limit
        
        # Generate previous balance
        previous_balance = round(random.uniform(5000, credit_limit * 0.4), 2)
        
        # Generate transactions
        transactions = []
        current_outstanding = previous_balance
        payment_made = False
        
        for i in range(num_transactions):
            # Generate random date within the statement period
            days_diff = (end_date - start_date).days
            random_days = random.randint(0, days_diff)
            transaction_date = start_date + timedelta(days=random_days)
            
            # Add a payment transaction occasionally
            if not payment_made and i > 5 and random.random() < 0.3:
                transaction, current_outstanding = self.generate_payment_transaction(
                    transaction_date, current_outstanding
                )
                payment_made = True
            else:
                transaction, current_outstanding = self.generate_merchant_transaction(
                    transaction_date, current_outstanding
                )
            
            transactions.append(transaction)
        
        # Sort transactions by date
        transactions.sort(key=lambda x: datetime.strptime(x['date'], '%d/%m/%Y'))
        
        # Calculate summary amounts
        total_purchases = sum(t['amount'] for t in transactions if t['amount'] > 0)
        total_payments = abs(sum(t['amount'] for t in transactions if t['amount'] < 0))
        current_outstanding = round(current_outstanding, 2)
        
        # Calculate payment information
        minimum_due = max(round(current_outstanding * 0.05, 2), 500)  # 5% or Rs 500, whichever is higher
        total_due = current_outstanding
        available_limit = credit_limit - current_outstanding
        
        # Generate payment due date (typically 20 days from statement date)
        payment_due_date = (end_date + timedelta(days=20)).strftime('%d/%m/%Y')
        
        # Generate reward points (typically 1 point per Rs 100 spent)
        reward_points = int(total_purchases / 100)
        
        statement_data = {
            'bank_name': bank_info['name'],
            'card_type': card_type,
            'cardholder_name': cardholder_name,
            'card_number_masked': card_number_masked,
            'customer_id': customer_id,
            'statement_date': end_date.strftime('%d/%m/%Y'),
            'generation_date': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
            'start_date': start_date.strftime('%d/%m/%Y'),
            'end_date': end_date.strftime('%d/%m/%Y'),
            'credit_limit': f"{credit_limit:,.2f}",
            'cash_limit': f"{cash_limit:,.2f}",
            'available_limit': f"{available_limit:,.2f}",
            'previous_balance': f"{previous_balance:,.2f}",
            'total_payments': f"{total_payments:,.2f}",
            'current_outstanding': f"{current_outstanding:,.2f}",
            'minimum_due': f"{minimum_due:,.2f}",
            'total_due': f"{total_due:,.2f}",
            'payment_due_date': payment_due_date,
            'reward_points': f"{reward_points:,}",
            'reward_validity': 24,
            'interest_rate': 3.5,
            'customer_care_number': bank_info['customer_care'],
            'website': bank_info['website'],
            'lost_card_number': bank_info['lost_card'],
            'transactions': transactions
        }
        
        return statement_data
    
    def generate_credit_card_pdf(self, 
                               bank_code: str = None, 
                               num_transactions: int = 30,
                               output_dir: str = 'credit-cards') -> str:
        """Generate credit card statement PDF."""
        
        statement_data = self.generate_credit_card_statement(bank_code, num_transactions)
        
        # Load HTML template
        template_path = os.path.join('html_templates', 'credit_card_statement_template.html')
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                html_template = f.read()
        except FileNotFoundError:
            raise FileNotFoundError(f"Template not found: {template_path}")
        
        # Render template
        template = Template(html_template)
        rendered_html = template.render(**statement_data)
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate filename
        bank_name = statement_data['bank_name'].replace(' ', '_')
        card_last_digits = statement_data['card_number_masked'][-4:]
        output_filename = f"{bank_name}_CreditCard_{card_last_digits}.html"
        output_path = os.path.join(output_dir, output_filename)
        
        # Save HTML file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(rendered_html)
        
        return output_path

def main():
    """Generate sample credit card statements."""
    print("Credit Card Statement Generator")
    print("=" * 40)
    
    generator = CreditCardDataGenerator()
    
    # Generate statements for different banks
    banks = ['HDFC', 'ICICI', 'SBI', 'AXIS']
    generated_files = []
    
    for bank in banks:
        print(f"Generating {bank} Credit Card Statement...")
        file_path = generator.generate_credit_card_pdf(bank, num_transactions=25)
        generated_files.append(file_path)
        print(f"  Generated: {os.path.basename(file_path)}")
    
    print(f"\nGenerated {len(generated_files)} credit card statements in 'credit-cards' directory")
    
    # Also generate sample JSON data
    sample_data = generator.generate_credit_card_statement('HDFC', 20)
    with open('credit-cards/sample_credit_card_data.json', 'w', encoding='utf-8') as f:
        json.dump(sample_data, f, indent=2, ensure_ascii=False)
    
    print("Sample JSON data saved as: credit-cards/sample_credit_card_data.json")

if __name__ == "__main__":
    main()