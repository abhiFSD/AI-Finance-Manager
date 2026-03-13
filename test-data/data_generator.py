#!/usr/bin/env python3
"""
Financial Data Generator for Indian Banking System
Generates realistic sample financial documents for testing finance automation apps.
"""

import random
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
import uuid

class IndianFinancialDataGenerator:
    """Generates realistic Indian financial data for testing purposes."""
    
    # Indian bank names and codes
    BANKS = {
        'HDFC': 'HDFC Bank',
        'SBI': 'State Bank of India',
        'ICICI': 'ICICI Bank',
        'AXIS': 'Axis Bank',
        'KOTAK': 'Kotak Mahindra Bank',
        'BOI': 'Bank of India',
        'PNB': 'Punjab National Bank',
        'CANARA': 'Canara Bank'
    }
    
    # Transaction types
    TRANSACTION_TYPES = [
        'UPI', 'NEFT', 'IMPS', 'ATM', 'DEBIT_CARD', 'CREDIT_CARD',
        'CHEQUE', 'CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'INTEREST_CREDIT',
        'SALARY_CREDIT', 'REFUND', 'CHARGES', 'EMI'
    ]
    
    # UPI handles
    UPI_HANDLES = [
        '@paytm', '@phonepe', '@googlepay', '@amazonpay', '@freecharge',
        '@mobikwik', '@upi', '@okaxis', '@okhdfcbank', '@okicici', '@oksbi'
    ]
    
    # Common transaction descriptions
    TRANSACTION_DESCRIPTIONS = {
        'UPI': [
            'UPI-{}-PAYTM-{}-{}@paytm',
            'UPI-{}-PHONEPE-{}-{}@phonepe',
            'UPI-{}-GPAY-{}-{}@googlepay',
            'UPI/{}-{}/{}',
            'UPI-P2A-{}-{}-{}@upi'
        ],
        'NEFT': [
            'NEFT-{}-{}-FROM-{}',
            'NEFT IN-{}-FROM {}',
            'NEFT OUT-{}-TO {}'
        ],
        'IMPS': [
            'IMPS-IN-{}-FROM-{}',
            'IMPS-OUT-{}-TO-{}',
            'IMPS/{}/{}',
            'IMPS-P2P-{}-{}'
        ],
        'ATM': [
            'ATM WDL-{}-{}',
            'ATM CASH WITHDRAWAL-{}-{}',
            'ATM WD-{}/{}',
            'ATM TXN-{}-{}'
        ],
        'DEBIT_CARD': [
            'POS-{}-{}',
            'POS TXN-{}-{}',
            'CARD PURCHASE-{}-{}',
            'POS/{}/{}'
        ]
    }
    
    # Merchant categories
    MERCHANT_CATEGORIES = {
        'Groceries': ['BigBasket', 'Grofers', 'More Supermarket', 'Spencer\'s', 'Reliance Fresh'],
        'Restaurants': ['Zomato', 'Swiggy', 'McDonald\'s', 'KFC', 'Domino\'s Pizza'],
        'Fuel': ['Indian Oil', 'HP Petrol Pump', 'BPCL', 'Shell'],
        'Shopping': ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Nykaa'],
        'Transportation': ['Ola', 'Uber', 'Metro Card Recharge', 'IRCTC'],
        'Utilities': ['Electricity Board', 'Gas Company', 'Water Board', 'Internet Bill'],
        'Entertainment': ['BookMyShow', 'Netflix', 'Amazon Prime', 'Hotstar'],
        'Healthcare': ['Apollo Pharmacy', 'NetMeds', 'Hospital Payment'],
        'Education': ['School Fee', 'Coaching Classes', 'Online Course'],
        'Investment': ['SIP', 'Mutual Fund', 'Stock Purchase', 'Fixed Deposit']
    }
    
    # Indian names for generating realistic data
    FIRST_NAMES = [
        'Aarav', 'Arjun', 'Rohan', 'Rahul', 'Amit', 'Rajesh', 'Suresh', 'Vikash',
        'Priya', 'Anita', 'Sita', 'Rita', 'Kavya', 'Shreya', 'Anjali', 'Pooja'
    ]
    
    LAST_NAMES = [
        'Sharma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Shah', 'Jain', 'Agarwal',
        'Verma', 'Mishra', 'Yadav', 'Reddy', 'Iyer', 'Nair', 'Pillai', 'Rao'
    ]
    
    def __init__(self):
        """Initialize the data generator with current timestamp."""
        self.current_date = datetime.now()
    
    def generate_account_number(self, bank_code: str) -> str:
        """Generate a realistic Indian bank account number."""
        if bank_code == 'HDFC':
            return f"5021{random.randint(100000000, 999999999)}"
        elif bank_code == 'SBI':
            return f"3000{random.randint(10000000, 99999999)}"
        elif bank_code == 'ICICI':
            return f"0011{random.randint(100000000, 999999999)}"
        elif bank_code == 'AXIS':
            return f"9170{random.randint(10000000, 99999999)}"
        else:
            return f"{random.randint(1000, 9999)}{random.randint(10000000, 99999999)}"
    
    def generate_ifsc_code(self, bank_code: str) -> str:
        """Generate a realistic IFSC code."""
        branch_codes = ['0000123', '0000456', '0000789', '0001234', '0005678']
        return f"{bank_code}{random.choice(branch_codes)}"
    
    def generate_upi_id(self) -> str:
        """Generate a realistic UPI ID."""
        name = f"{random.choice(self.FIRST_NAMES).lower()}"
        number = random.randint(100, 999)
        handle = random.choice(self.UPI_HANDLES)
        return f"{name}{number}{handle}"
    
    def generate_transaction_id(self, transaction_type: str) -> str:
        """Generate a realistic transaction ID based on type."""
        if transaction_type == 'UPI':
            return f"UPI{random.randint(100000000000, 999999999999)}"
        elif transaction_type in ['NEFT', 'IMPS']:
            return f"{transaction_type}{random.randint(1000000000, 9999999999)}"
        elif transaction_type == 'ATM':
            return f"ATM{random.randint(1000000, 9999999)}"
        else:
            return f"{transaction_type}{random.randint(100000, 999999)}"
    
    def generate_amount(self, transaction_type: str = None) -> float:
        """Generate realistic transaction amounts based on type."""
        if transaction_type == 'ATM':
            # ATM withdrawals are typically in multiples of 100
            return random.choice([500, 1000, 1500, 2000, 2500, 3000, 5000, 10000])
        elif transaction_type == 'SALARY_CREDIT':
            # Salary amounts
            return random.randint(25000, 150000)
        elif transaction_type == 'EMI':
            # EMI amounts
            return random.randint(5000, 50000)
        elif transaction_type == 'UPI':
            # UPI transactions are usually smaller amounts
            return round(random.uniform(10, 5000), 2)
        else:
            # General transaction amounts
            return round(random.uniform(100, 25000), 2)
    
    def generate_transaction_description(self, transaction_type: str, amount: float) -> str:
        """Generate realistic transaction description."""
        if transaction_type not in self.TRANSACTION_DESCRIPTIONS:
            return f"{transaction_type} Transaction - Rs.{amount}"
        
        templates = self.TRANSACTION_DESCRIPTIONS[transaction_type]
        template = random.choice(templates)
        
        # Fill template with realistic data
        if transaction_type == 'UPI':
            upi_id = self.generate_upi_id()
            ref_num = random.randint(100000000000, 999999999999)
            return template.format(ref_num, amount, upi_id.split('@')[0])
        elif transaction_type in ['NEFT', 'IMPS']:
            ref_num = random.randint(1000000000, 9999999999)
            name = f"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}"
            return template.format(ref_num, amount, name)
        elif transaction_type == 'ATM':
            location = random.choice(['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'])
            ref_num = random.randint(1000000, 9999999)
            return template.format(ref_num, location)
        else:
            return template.format(random.randint(100000, 999999), amount)
    
    def generate_merchant_name(self, category: str = None) -> str:
        """Generate realistic merchant name."""
        if category and category in self.MERCHANT_CATEGORIES:
            return random.choice(self.MERCHANT_CATEGORIES[category])
        else:
            # Random category
            category = random.choice(list(self.MERCHANT_CATEGORIES.keys()))
            return random.choice(self.MERCHANT_CATEGORIES[category])
    
    def generate_transaction(self, 
                           date: datetime = None, 
                           force_credit: bool = False,
                           force_debit: bool = False,
                           balance: float = None) -> Dict[str, Any]:
        """Generate a single realistic transaction."""
        if date is None:
            date = self.current_date - timedelta(days=random.randint(0, 90))
        
        transaction_type = random.choice(self.TRANSACTION_TYPES)
        amount = self.generate_amount(transaction_type)
        
        # Determine if it's credit or debit
        if force_credit:
            is_credit = True
        elif force_debit:
            is_credit = False
        else:
            # Natural distribution - more debits than credits
            credit_transactions = ['SALARY_CREDIT', 'INTEREST_CREDIT', 'REFUND', 'CASH_DEPOSIT']
            is_credit = transaction_type in credit_transactions or random.random() < 0.3
        
        # Generate description
        description = self.generate_transaction_description(transaction_type, amount)
        
        # Generate merchant/counterparty info
        category = random.choice(list(self.MERCHANT_CATEGORIES.keys()))
        merchant = self.generate_merchant_name(category)
        
        transaction = {
            'transaction_id': self.generate_transaction_id(transaction_type),
            'date': date.strftime('%d/%m/%Y'),
            'time': date.strftime('%H:%M:%S'),
            'description': description,
            'transaction_type': transaction_type,
            'amount': amount,
            'is_credit': is_credit,
            'balance': balance,
            'category': category,
            'merchant': merchant if not is_credit else None,
            'reference_number': f"REF{random.randint(1000000000, 9999999999)}",
            'upi_id': self.generate_upi_id() if transaction_type == 'UPI' else None
        }
        
        return transaction
    
    def generate_account_info(self, bank_code: str = None) -> Dict[str, Any]:
        """Generate realistic account information."""
        if bank_code is None:
            bank_code = random.choice(list(self.BANKS.keys()))
        
        account_info = {
            'account_number': self.generate_account_number(bank_code),
            'bank_name': self.BANKS[bank_code],
            'bank_code': bank_code,
            'ifsc_code': self.generate_ifsc_code(bank_code),
            'account_holder_name': f"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}",
            'branch_name': f"{random.choice(['Central', 'Main', 'Commercial', 'Corporate'])} Branch",
            'account_type': random.choice(['Savings', 'Current', 'Salary'])
        }
        
        return account_info
    
    def generate_statement_data(self, 
                              bank_code: str = None,
                              num_transactions: int = 50,
                              start_date: datetime = None,
                              end_date: datetime = None) -> Dict[str, Any]:
        """Generate complete bank statement data."""
        
        if start_date is None:
            start_date = datetime.now() - timedelta(days=30)
        if end_date is None:
            end_date = datetime.now()
        
        account_info = self.generate_account_info(bank_code)
        
        # Generate opening balance
        opening_balance = random.uniform(5000, 100000)
        current_balance = opening_balance
        
        transactions = []
        current_date = start_date
        
        for i in range(num_transactions):
            # Generate random date within the range
            days_diff = (end_date - start_date).days
            random_days = random.randint(0, days_diff)
            transaction_date = start_date + timedelta(days=random_days)
            
            transaction = self.generate_transaction(transaction_date)
            
            # Update balance
            if transaction['is_credit']:
                current_balance += transaction['amount']
            else:
                current_balance -= transaction['amount']
            
            transaction['balance'] = round(current_balance, 2)
            transactions.append(transaction)
        
        # Sort transactions by date
        transactions.sort(key=lambda x: datetime.strptime(f"{x['date']} {x['time']}", '%d/%m/%Y %H:%M:%S'))
        
        statement_data = {
            'account_info': account_info,
            'statement_period': {
                'start_date': start_date.strftime('%d/%m/%Y'),
                'end_date': end_date.strftime('%d/%m/%Y')
            },
            'opening_balance': round(opening_balance, 2),
            'closing_balance': round(current_balance, 2),
            'total_credits': round(sum(t['amount'] for t in transactions if t['is_credit']), 2),
            'total_debits': round(sum(t['amount'] for t in transactions if not t['is_credit']), 2),
            'transactions': transactions
        }
        
        return statement_data

if __name__ == "__main__":
    # Example usage
    generator = IndianFinancialDataGenerator()
    
    # Generate sample data for HDFC Bank
    hdfc_statement = generator.generate_statement_data('HDFC', num_transactions=30)
    
    # Save to JSON file
    with open('sample_hdfc_statement.json', 'w', encoding='utf-8') as f:
        json.dump(hdfc_statement, f, indent=2, ensure_ascii=False)
    
    print("Sample HDFC statement generated successfully!")
    print(f"Account Number: {hdfc_statement['account_info']['account_number']}")
    print(f"Total Transactions: {len(hdfc_statement['transactions'])}")
    print(f"Opening Balance: ₹{hdfc_statement['opening_balance']:,.2f}")
    print(f"Closing Balance: ₹{hdfc_statement['closing_balance']:,.2f}")