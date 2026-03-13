#!/usr/bin/env python3
"""
Investment Document Generator for Indian Mutual Funds and SIPs
Generates realistic SIP statements, mutual fund statements, and investment documents.
"""

import random
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from jinja2 import Template
import os

class InvestmentDataGenerator:
    """Generates realistic investment document data for Indian mutual funds."""
    
    # Asset Management Companies
    AMC_DATA = {
        'HDFC': {
            'name': 'HDFC Asset Management Company Limited',
            'customer_care': '1800-4000-9999',
            'website': 'www.hdfcfund.com',
            'registered_office': 'HDFC House, 165-166, Backbay Reclamation, H.T. Parekh Marg, Mumbai - 400020',
            'cin': 'L65991MH1999PLC123456',
            'sebi_registration': 'INZ000123456'
        },
        'ICICI': {
            'name': 'ICICI Prudential Asset Management Company Limited',
            'customer_care': '1800-222-999',
            'website': 'www.icicipruamc.com',
            'registered_office': 'One BKC, C-Wing, 12th Floor, Bandra Kurla Complex, Mumbai - 400051',
            'cin': 'L65991MH1993PLC234567',
            'sebi_registration': 'INZ000234567'
        },
        'SBI': {
            'name': 'SBI Funds Management Pvt. Ltd.',
            'customer_care': '1800-123-1100',
            'website': 'www.sbimf.com',
            'registered_office': 'SBI Funds Management Building, New Delhi - 110001',
            'cin': 'L65991DL1992PLC345678',
            'sebi_registration': 'INZ000345678'
        },
        'AXIS': {
            'name': 'Axis Asset Management Company Limited',
            'customer_care': '1800-233-3444',
            'website': 'www.axismf.com',
            'registered_office': 'Axis House, C-2, Wadia International Centre, Mumbai - 400025',
            'cin': 'L65991MH2009PLC456789',
            'sebi_registration': 'INZ000456789'
        }
    }
    
    # Mutual Fund Schemes
    FUND_SCHEMES = {
        'HDFC': [
            'HDFC Equity Fund - Growth',
            'HDFC Top 100 Fund - Direct Plan',
            'HDFC Balanced Advantage Fund',
            'HDFC Small Cap Fund - Growth',
            'HDFC Mid-Cap Opportunities Fund',
            'HDFC Tax Saver Fund (ELSS)',
            'HDFC Liquid Fund - Growth',
            'HDFC Corporate Bond Fund'
        ],
        'ICICI': [
            'ICICI Prudential Blue Chip Fund',
            'ICICI Prudential Technology Fund',
            'ICICI Prudential Value Discovery Fund',
            'ICICI Prudential Focused Equity Fund',
            'ICICI Prudential Long Term Equity Fund (ELSS)',
            'ICICI Prudential Balanced Advantage Fund',
            'ICICI Prudential Liquid Fund',
            'ICICI Prudential Corporate Bond Fund'
        ],
        'SBI': [
            'SBI Blue Chip Fund - Direct Growth',
            'SBI Small Cap Fund',
            'SBI Technology Fund',
            'SBI Contra Fund',
            'SBI Long Term Equity Fund',
            'SBI Balanced Hybrid Fund',
            'SBI Liquid Fund',
            'SBI Corporate Bond Fund'
        ],
        'AXIS': [
            'Axis Blue Chip Fund - Growth',
            'Axis Small Cap Fund - Direct',
            'Axis Focused 25 Fund',
            'Axis Long Term Equity Fund',
            'Axis Hybrid Fund - Aggressive',
            'Axis Banking & PSU Debt Fund',
            'Axis Liquid Fund',
            'Axis Treasury Advantage Fund'
        ]
    }
    
    # Investment categories and risk levels
    FUND_CATEGORIES = ['Equity', 'Debt', 'Hybrid', 'ELSS', 'Liquid', 'Sectoral']
    RISK_LEVELS = ['Low', 'Low to Moderate', 'Moderate', 'Moderately High', 'High', 'Very High']
    PLAN_TYPES = ['Regular', 'Direct']
    OPTION_TYPES = ['Growth', 'Dividend Payout', 'Dividend Reinvestment']
    
    # Names for generating data
    FIRST_NAMES = [
        'Rahul', 'Priya', 'Amit', 'Sunita', 'Rohan', 'Kavya',
        'Vikash', 'Anjali', 'Arjun', 'Neha', 'Ravi', 'Pooja'
    ]
    
    LAST_NAMES = [
        'Sharma', 'Gupta', 'Singh', 'Patel', 'Kumar', 'Shah',
        'Jain', 'Agarwal', 'Verma', 'Mishra', 'Reddy', 'Nair'
    ]
    
    def __init__(self):
        self.current_date = datetime.now()
    
    def generate_folio_number(self, amc_code: str) -> str:
        """Generate a realistic folio number."""
        prefix_map = {
            'HDFC': 'HD',
            'ICICI': 'IC',
            'SBI': 'SB',
            'AXIS': 'AX'
        }
        prefix = prefix_map.get(amc_code, 'MF')
        number = random.randint(10000000, 99999999)
        return f"{prefix}{number}"
    
    def generate_pan_number(self) -> str:
        """Generate a realistic PAN number format."""
        letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        digits = '0123456789'
        return f"{''.join(random.choices(letters, k=5))}{''.join(random.choices(digits, k=4))}{''.join(random.choices(letters, k=1))}"
    
    def generate_isin_number(self) -> str:
        """Generate a realistic ISIN number for Indian mutual funds."""
        return f"INF{random.randint(100000, 999999)}{random.choice(['01', '02', '03'])}{random.randint(10, 99)}"
    
    def calculate_nav_series(self, start_date: datetime, end_date: datetime, initial_nav: float = None) -> List[Dict]:
        """Generate a realistic NAV series with market-like fluctuations."""
        if initial_nav is None:
            initial_nav = round(random.uniform(20.0, 200.0), 4)
        
        nav_series = []
        current_nav = initial_nav
        current_date = start_date
        
        while current_date <= end_date:
            # Skip weekends
            if current_date.weekday() < 5:  # Monday = 0, Friday = 4
                # Generate realistic NAV fluctuation (-2% to +2% daily change)
                change_percent = random.uniform(-0.02, 0.02)
                current_nav = current_nav * (1 + change_percent)
                current_nav = round(current_nav, 4)
                
                nav_series.append({
                    'date': current_date.strftime('%d/%m/%Y'),
                    'nav': current_nav
                })
            
            current_date += timedelta(days=1)
        
        return nav_series
    
    def generate_sip_transactions(self, 
                                sip_amount: float, 
                                start_date: datetime, 
                                end_date: datetime,
                                nav_series: List[Dict]) -> List[Dict]:
        """Generate SIP transaction history."""
        transactions = []
        cumulative_units = 0.0
        
        # Generate monthly SIP transactions
        current_date = datetime(start_date.year, start_date.month, 10)  # 10th of each month
        
        while current_date <= end_date:
            # Find NAV for this date or closest date
            nav_for_date = None
            for nav_entry in nav_series:
                nav_date = datetime.strptime(nav_entry['date'], '%d/%m/%Y')
                if nav_date.date() == current_date.date():
                    nav_for_date = nav_entry['nav']
                    break
            
            if nav_for_date is None:
                # Find closest NAV
                closest_nav = min(nav_series, 
                                key=lambda x: abs(datetime.strptime(x['date'], '%d/%m/%Y') - current_date))
                nav_for_date = closest_nav['nav']
            
            # Calculate units allotted
            units_allotted = round(sip_amount / nav_for_date, 4)
            cumulative_units += units_allotted
            
            # Occasionally skip a SIP (insufficient balance scenario)
            status = "Successful" if random.random() > 0.05 else "Failed - Insufficient Balance"
            
            if status == "Successful":
                transaction = {
                    'date': current_date.strftime('%d/%m/%Y'),
                    'transaction_type': 'SIP Purchase',
                    'amount': f"{sip_amount:,.2f}",
                    'nav': f"{nav_for_date:.4f}",
                    'units_allotted': f"{units_allotted:.4f}",
                    'cumulative_units': f"{cumulative_units:.4f}",
                    'charges': "0.00",
                    'status': status
                }
                transactions.append(transaction)
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        return transactions, cumulative_units
    
    def generate_sip_statement(self, 
                             amc_code: str = None,
                             sip_amount: float = None,
                             start_date: datetime = None,
                             end_date: datetime = None) -> Dict[str, Any]:
        """Generate complete SIP statement data."""
        
        if amc_code is None:
            amc_code = random.choice(list(self.AMC_DATA.keys()))
        
        if start_date is None:
            start_date = datetime.now() - timedelta(days=365)  # 1 year ago
        if end_date is None:
            end_date = datetime.now()
        
        if sip_amount is None:
            sip_amount = random.choice([1000, 2000, 3000, 5000, 10000, 15000, 25000])
        
        amc_info = self.AMC_DATA[amc_code]
        
        # Generate investor information
        investor_name = f"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}"
        folio_number = self.generate_folio_number(amc_code)
        pan_number = self.generate_pan_number()
        
        # Generate scheme information
        scheme_name = random.choice(self.FUND_SCHEMES[amc_code])
        plan_type = random.choice(self.PLAN_TYPES)
        option_type = random.choice(self.OPTION_TYPES)
        risk_level = random.choice(self.RISK_LEVELS)
        
        # Generate NAV series
        nav_series = self.calculate_nav_series(start_date, end_date)
        current_nav = nav_series[-1]['nav'] if nav_series else 50.0
        
        # Generate SIP transactions
        transactions, total_units = self.generate_sip_transactions(sip_amount, start_date, end_date, nav_series)
        
        # Calculate investment summary
        total_invested = len(transactions) * sip_amount
        current_value = total_units * current_nav
        total_gain_loss = current_value - total_invested
        xirr_return = round(random.uniform(8.5, 15.2), 2)  # Typical equity fund returns
        
        sip_statement = {
            'amc_name': amc_info['name'],
            'customer_care': amc_info['customer_care'],
            'website': amc_info['website'],
            'registered_office': amc_info['registered_office'],
            'investor_name': investor_name,
            'folio_number': folio_number,
            'pan_number': pan_number,
            'mobile_number': f"+91-{random.randint(7000000000, 9999999999)}",
            'email_id': f"{investor_name.lower().replace(' ', '.')}@email.com",
            'statement_date': end_date.strftime('%d/%m/%Y'),
            'generation_date': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
            'start_date': start_date.strftime('%d/%m/%Y'),
            'end_date': end_date.strftime('%d/%m/%Y'),
            'sip_start_date': start_date.strftime('%d/%m/%Y'),
            'sip_status': 'Active',
            'nominee_name': f"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}",
            'scheme_name': scheme_name,
            'plan_type': plan_type,
            'option_type': option_type,
            'risk_level': risk_level,
            'sip_amount': f"{sip_amount:,.2f}",
            'total_invested': f"{total_invested:,.2f}",
            'current_value': f"{current_value:,.2f}",
            'total_gain_loss': f"{total_gain_loss:,.2f}",
            'total_units': f"{total_units:.4f}",
            'current_nav': f"{current_nav:.4f}",
            'xirr_return': f"{xirr_return}",
            'transactions': transactions
        }
        
        return sip_statement
    
    def generate_mutual_fund_statement(self, 
                                     amc_code: str = None,
                                     num_schemes: int = 3) -> Dict[str, Any]:
        """Generate consolidated mutual fund statement."""
        
        if amc_code is None:
            amc_code = random.choice(list(self.AMC_DATA.keys()))
        
        amc_info = self.AMC_DATA[amc_code]
        
        # Generate investor information
        investor_name = f"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}"
        pan_number = self.generate_pan_number()
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)  # 3 months
        
        # Generate multiple schemes
        schemes = []
        folio_numbers = []
        total_investment = 0
        total_current_value = 0
        
        for i in range(num_schemes):
            folio_number = self.generate_folio_number(amc_code)
            folio_numbers.append(folio_number)
            
            scheme_name = random.choice(self.FUND_SCHEMES[amc_code])
            plan_type = random.choice(self.PLAN_TYPES)
            option_type = random.choice(self.OPTION_TYPES)
            isin = self.generate_isin_number()
            
            # Generate scheme data
            units_held = round(random.uniform(100, 10000), 4)
            current_nav = round(random.uniform(20, 200), 4)
            invested_amount = round(random.uniform(10000, 500000), 2)
            current_value = units_held * current_nav
            gain_loss = current_value - invested_amount
            
            total_investment += invested_amount
            total_current_value += current_value
            
            # Generate recent transactions for this scheme
            transactions = self.generate_scheme_transactions(start_date, end_date, current_nav)
            
            scheme_data = {
                'name': scheme_name,
                'folio_number': folio_number,
                'isin': isin,
                'plan_type': plan_type,
                'option_type': option_type,
                'units_held': f"{units_held:.4f}",
                'current_nav': f"{current_nav:.4f}",
                'invested_amount': f"{invested_amount:,.2f}",
                'current_value': f"{current_value:,.2f}",
                'gain_loss': f"{gain_loss:,.2f}",
                'gain_loss_class': 'gain-positive' if gain_loss >= 0 else 'gain-negative',
                'transactions': transactions
            }
            
            schemes.append(scheme_data)
        
        total_gain_loss = total_current_value - total_investment
        absolute_return = (total_gain_loss / total_investment) * 100 if total_investment > 0 else 0
        
        statement_data = {
            'amc_name': amc_info['name'],
            'customer_care': amc_info['customer_care'],
            'website': amc_info['website'],
            'registered_office': amc_info['registered_office'],
            'cin': amc_info['cin'],
            'sebi_registration': amc_info['sebi_registration'],
            'investor_name': investor_name,
            'pan_number': pan_number,
            'address': f"{random.randint(1, 999)} {random.choice(['MG Road', 'Brigade Road', 'Park Street', 'Civil Lines'])}, {random.choice(['Mumbai', 'Delhi', 'Bangalore', 'Chennai'])} - {random.randint(400001, 600001)}",
            'mobile_number': f"+91-{random.randint(7000000000, 9999999999)}",
            'email_id': f"{investor_name.lower().replace(' ', '.')}@email.com",
            'statement_date': end_date.strftime('%d/%m/%Y'),
            'generation_date': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
            'start_date': start_date.strftime('%d/%m/%Y'),
            'end_date': end_date.strftime('%d/%m/%Y'),
            'folio_numbers': ', '.join(folio_numbers),
            'advisor_name': f"{random.choice(self.FIRST_NAMES)} {random.choice(self.LAST_NAMES)}",
            'distributor_name': f"{random.choice(['XYZ Financial Services', 'ABC Investments', 'Direct Investment'])}",
            'total_investment': f"{total_investment:,.2f}",
            'current_value': f"{total_current_value:,.2f}",
            'total_gain_loss': f"{total_gain_loss:,.2f}",
            'gain_loss_class': 'gain-positive' if total_gain_loss >= 0 else 'gain-negative',
            'absolute_return': f"{absolute_return:.2f}",
            'return_class': 'gain-positive' if absolute_return >= 0 else 'gain-negative',
            'current_financial_year': f"{datetime.now().year}-{datetime.now().year + 1}",
            'dividend_received': f"{random.uniform(0, 5000):,.2f}",
            'tds_on_dividend': f"{random.uniform(0, 500):,.2f}",
            'capital_gains_realized': f"{random.uniform(0, 10000):,.2f}",
            'total_stt_paid': f"{random.uniform(10, 100):,.2f}",
            'schemes': schemes
        }
        
        return statement_data
    
    def generate_scheme_transactions(self, start_date: datetime, end_date: datetime, current_nav: float) -> List[Dict]:
        """Generate transactions for a mutual fund scheme."""
        transactions = []
        num_transactions = random.randint(3, 8)
        
        for i in range(num_transactions):
            # Random date within period
            days_diff = (end_date - start_date).days
            random_days = random.randint(0, days_diff)
            transaction_date = start_date + timedelta(days=random_days)
            
            transaction_type = random.choice(['Purchase', 'Redemption', 'SIP', 'Dividend'])
            amount = round(random.uniform(1000, 50000), 2)
            nav = round(random.uniform(current_nav * 0.9, current_nav * 1.1), 4)
            
            if transaction_type in ['Purchase', 'SIP']:
                units = round(amount / nav, 4)
                type_class = 'purchase'
            else:
                units = -round(amount / nav, 4)
                type_class = 'redemption'
            
            transaction = {
                'date': transaction_date.strftime('%d/%m/%Y'),
                'type': transaction_type,
                'type_class': type_class,
                'amount': f"{amount:,.2f}",
                'nav': f"{nav:.4f}",
                'units': f"{units:.4f}",
                'load': f"{random.uniform(0, 1):.2f}",
                'stt': f"{random.uniform(1, 50):,.2f}",
                'status': 'Confirmed'
            }
            
            transactions.append(transaction)
        
        # Sort by date
        transactions.sort(key=lambda x: datetime.strptime(x['date'], '%d/%m/%Y'))
        
        return transactions
    
    def generate_investment_documents(self, output_dir: str = 'investments') -> List[str]:
        """Generate all investment document types."""
        os.makedirs(output_dir, exist_ok=True)
        generated_files = []
        
        # Generate SIP statements
        for amc in ['HDFC', 'ICICI', 'SBI']:
            sip_data = self.generate_sip_statement(amc)
            
            # Load template and render
            template_path = os.path.join('html_templates', 'sip_statement_template.html')
            with open(template_path, 'r', encoding='utf-8') as f:
                html_template = f.read()
            
            template = Template(html_template)
            rendered_html = template.render(**sip_data)
            
            # Save file
            filename = f"{amc}_SIP_Statement_{sip_data['folio_number'][-6:]}.html"
            file_path = os.path.join(output_dir, filename)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(rendered_html)
            
            generated_files.append(file_path)
        
        # Generate mutual fund statements
        for amc in ['HDFC', 'ICICI']:
            mf_data = self.generate_mutual_fund_statement(amc, num_schemes=3)
            
            # Load template and render
            template_path = os.path.join('html_templates', 'mutual_fund_statement_template.html')
            with open(template_path, 'r', encoding='utf-8') as f:
                html_template = f.read()
            
            template = Template(html_template)
            rendered_html = template.render(**mf_data)
            
            # Save file
            filename = f"{amc}_MF_CAS_{mf_data['pan_number'][-4:]}.html"
            file_path = os.path.join(output_dir, filename)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(rendered_html)
            
            generated_files.append(file_path)
        
        return generated_files

def main():
    """Generate sample investment documents."""
    print("Investment Document Generator")
    print("=" * 40)
    
    generator = InvestmentDataGenerator()
    
    # Generate all investment documents
    generated_files = generator.generate_investment_documents()
    
    print(f"\nGenerated {len(generated_files)} investment documents:")
    for file_path in generated_files:
        print(f"  - {os.path.basename(file_path)}")
    
    # Generate sample JSON data
    sample_sip = generator.generate_sip_statement('HDFC')
    with open('investments/sample_sip_data.json', 'w', encoding='utf-8') as f:
        json.dump(sample_sip, f, indent=2, ensure_ascii=False)
    
    sample_mf = generator.generate_mutual_fund_statement('ICICI')
    with open('investments/sample_mutual_fund_data.json', 'w', encoding='utf-8') as f:
        json.dump(sample_mf, f, indent=2, ensure_ascii=False)
    
    print("\nSample JSON data files created:")
    print("  - investments/sample_sip_data.json")
    print("  - investments/sample_mutual_fund_data.json")

if __name__ == "__main__":
    main()