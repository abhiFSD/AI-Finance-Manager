#!/usr/bin/env python3
"""
PDF Generator for Indian Bank Statements
Creates realistic PDF bank statements using HTML templates and sample data.
"""

import os
import json
import random
from datetime import datetime, timedelta
from jinja2 import Template
from data_generator import IndianFinancialDataGenerator

try:
    import pdfkit
    PDFKIT_AVAILABLE = True
except ImportError:
    PDFKIT_AVAILABLE = False
    print("Warning: pdfkit not available. Install with: pip install pdfkit")
    print("Also ensure wkhtmltopdf is installed: https://wkhtmltopdf.org/downloads.html")

class BankStatementPDFGenerator:
    """Generates PDF bank statements from HTML templates and sample data."""
    
    def __init__(self, templates_dir: str = 'html_templates', output_dir: str = 'generated_pdfs'):
        self.templates_dir = templates_dir
        self.output_dir = output_dir
        self.data_generator = IndianFinancialDataGenerator()
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
        # PDF generation options
        self.pdf_options = {
            'page-size': 'A4',
            'margin-top': '0.75in',
            'margin-right': '0.75in',
            'margin-bottom': '0.75in',
            'margin-left': '0.75in',
            'encoding': "UTF-8",
            'no-outline': None,
            'enable-local-file-access': None
        }
    
    def load_html_template(self, template_name: str) -> str:
        """Load HTML template from file."""
        template_path = os.path.join(self.templates_dir, template_name)
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            raise FileNotFoundError(f"Template not found: {template_path}")
    
    def generate_additional_account_data(self, bank_code: str) -> dict:
        """Generate additional data needed for templates."""
        additional_data = {
            'generation_date': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
            'statement_date': datetime.now().strftime('%d/%m/%Y'),
            'branch_address': self._get_branch_address(bank_code),
            'customer_id': f"CID{random.randint(100000, 999999)}",
            'cif_number': f"CIF{random.randint(10000000, 99999999)}",
            'micr_code': f"{random.randint(110000000, 999999999)}",
            'branch_code': f"BR{random.randint(1000, 9999)}",
            'mobile_number': f"+91-{random.randint(7000000000, 9999999999)}",
            'email_id': f"customer{random.randint(100, 999)}@email.com"
        }
        return additional_data
    
    def _get_branch_address(self, bank_code: str) -> str:
        """Get realistic branch address based on bank."""
        addresses = {
            'HDFC': [
                "Ground Floor, Phoenix Mills, Senapati Bapat Marg, Lower Parel, Mumbai - 400013",
                "Plot No. 10, Sector 15, CBD Belapur, Navi Mumbai - 400614",
                "123 MG Road, Brigade Road, Bangalore - 560001"
            ],
            'SBI': [
                "State Bank Bhavan, Nariman Point, Mumbai - 400021",
                "Local Head Office, 11 Parliament Street, New Delhi - 110001",
                "SBI Building, 1st Floor, Anna Salai, Chennai - 600002"
            ],
            'ICICI': [
                "ICICI Bank Towers, Bandra Kurla Complex, Mumbai - 400051",
                "Plot C-59, G Block, Bandra Kurla Complex, Mumbai - 400051",
                "5th Floor, Tower A, Peninsula Business Park, Ganpatrao Kadam Marg, Mumbai - 400013"
            ]
        }
        
        if bank_code in addresses:
            return random.choice(addresses[bank_code])
        else:
            return "123 Bank Street, Financial District, Mumbai - 400001"
    
    def generate_hdfc_statement(self, num_transactions: int = 30) -> str:
        """Generate HDFC Bank statement PDF."""
        if not PDFKIT_AVAILABLE:
            return self._generate_html_only('hdfc', num_transactions)
        
        # Generate sample data
        statement_data = self.data_generator.generate_statement_data('HDFC', num_transactions)
        
        # Add additional template data
        template_data = {
            **statement_data,
            **self.generate_additional_account_data('HDFC')
        }
        
        # Load and render template
        html_template = self.load_html_template('hdfc_statement_template.html')
        template = Template(html_template)
        rendered_html = template.render(**template_data)
        
        # Generate PDF
        output_filename = f"HDFC_Statement_{template_data['account_info']['account_number'][-4:]}.pdf"
        output_path = os.path.join(self.output_dir, output_filename)
        
        try:
            pdfkit.from_string(rendered_html, output_path, options=self.pdf_options)
            return output_path
        except Exception as e:
            # Fallback to HTML
            html_path = output_path.replace('.pdf', '.html')
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(rendered_html)
            print(f"PDF generation failed, saved HTML instead: {html_path}")
            return html_path
    
    def generate_sbi_statement(self, num_transactions: int = 30) -> str:
        """Generate SBI Bank statement PDF."""
        if not PDFKIT_AVAILABLE:
            return self._generate_html_only('sbi', num_transactions)
        
        # Generate sample data
        statement_data = self.data_generator.generate_statement_data('SBI', num_transactions)
        
        # Add additional template data
        template_data = {
            **statement_data,
            **self.generate_additional_account_data('SBI')
        }
        
        # Load and render template
        html_template = self.load_html_template('sbi_statement_template.html')
        template = Template(html_template)
        rendered_html = template.render(**template_data)
        
        # Generate PDF
        output_filename = f"SBI_Statement_{template_data['account_info']['account_number'][-4:]}.pdf"
        output_path = os.path.join(self.output_dir, output_filename)
        
        try:
            pdfkit.from_string(rendered_html, output_path, options=self.pdf_options)
            return output_path
        except Exception as e:
            # Fallback to HTML
            html_path = output_path.replace('.pdf', '.html')
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(rendered_html)
            print(f"PDF generation failed, saved HTML instead: {html_path}")
            return html_path
    
    def generate_icici_statement(self, num_transactions: int = 30) -> str:
        """Generate ICICI Bank statement PDF."""
        if not PDFKIT_AVAILABLE:
            return self._generate_html_only('icici', num_transactions)
        
        # Generate sample data
        statement_data = self.data_generator.generate_statement_data('ICICI', num_transactions)
        
        # Add additional template data
        template_data = {
            **statement_data,
            **self.generate_additional_account_data('ICICI')
        }
        
        # Load and render template
        html_template = self.load_html_template('icici_statement_template.html')
        template = Template(html_template)
        rendered_html = template.render(**template_data)
        
        # Generate PDF
        output_filename = f"ICICI_Statement_{template_data['account_info']['account_number'][-4:]}.pdf"
        output_path = os.path.join(self.output_dir, output_filename)
        
        try:
            pdfkit.from_string(rendered_html, output_path, options=self.pdf_options)
            return output_path
        except Exception as e:
            # Fallback to HTML
            html_path = output_path.replace('.pdf', '.html')
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(rendered_html)
            print(f"PDF generation failed, saved HTML instead: {html_path}")
            return html_path
    
    def _generate_html_only(self, bank_code: str, num_transactions: int) -> str:
        """Generate HTML when PDF generation is not available."""
        statement_data = self.data_generator.generate_statement_data(bank_code.upper(), num_transactions)
        template_data = {
            **statement_data,
            **self.generate_additional_account_data(bank_code.upper())
        }
        
        template_file = f"{bank_code}_statement_template.html"
        html_template = self.load_html_template(template_file)
        template = Template(html_template)
        rendered_html = template.render(**template_data)
        
        output_filename = f"{bank_code.upper()}_Statement_{template_data['account_info']['account_number'][-4:]}.html"
        output_path = os.path.join(self.output_dir, output_filename)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(rendered_html)
        
        return output_path
    
    def generate_all_bank_statements(self, num_transactions: int = 30) -> list:
        """Generate statements for all supported banks."""
        generated_files = []
        
        print("Generating HDFC Bank Statement...")
        hdfc_file = self.generate_hdfc_statement(num_transactions)
        generated_files.append(hdfc_file)
        
        print("Generating SBI Bank Statement...")
        sbi_file = self.generate_sbi_statement(num_transactions)
        generated_files.append(sbi_file)
        
        print("Generating ICICI Bank Statement...")
        icici_file = self.generate_icici_statement(num_transactions)
        generated_files.append(icici_file)
        
        return generated_files

def main():
    """Main function to generate sample bank statements."""
    print("Indian Bank Statement PDF Generator")
    print("=" * 50)
    
    # Create the generator
    generator = BankStatementPDFGenerator()
    
    # Generate statements for all banks
    generated_files = generator.generate_all_bank_statements(num_transactions=25)
    
    print(f"\nGenerated {len(generated_files)} bank statements:")
    for file_path in generated_files:
        print(f"  - {os.path.basename(file_path)}")
    
    print(f"\nFiles saved in: {generator.output_dir}")
    
    if not PDFKIT_AVAILABLE:
        print("\nNote: PDF generation requires pdfkit and wkhtmltopdf.")
        print("HTML files have been generated instead.")
        print("To install pdfkit: pip install pdfkit")
        print("To install wkhtmltopdf: https://wkhtmltopdf.org/downloads.html")

if __name__ == "__main__":
    main()