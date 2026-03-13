import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { 
  BarChart3, 
  FileText, 
  Shield, 
  Zap, 
  Target, 
  TrendingUp,
  Users,
  Clock,
  CheckCircle
} from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container px-4 py-24 md:py-32">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Smart Finance Management
                <br className="hidden sm:inline" />
                <span className="text-primary"> Made Simple</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                Automate your financial tracking with AI-powered document processing. 
                Upload bank statements, get instant insights, and take control of your money.
              </p>
            </div>
            <div className="space-x-4">
              <Button asChild size="lg">
                <Link href="/register">Get Started Free</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container px-4 py-24 md:py-32 bg-muted/50">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
              Everything you need to manage your finances
            </h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              From document processing to advanced analytics, we&apos;ve got you covered.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 mt-16 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-primary" />
                <CardTitle>Smart Document Processing</CardTitle>
                <CardDescription>
                  Upload bank statements, credit card bills, and investment documents. 
                  Our AI automatically extracts and categorizes transactions.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-primary" />
                <CardTitle>Real-time Analytics</CardTitle>
                <CardDescription>
                  Get instant insights into your spending patterns, cash flow, 
                  and financial trends with interactive charts and graphs.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary" />
                <CardTitle>Bank-level Security</CardTitle>
                <CardDescription>
                  Your financial data is protected with enterprise-grade security, 
                  encryption, and compliance standards.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-primary" />
                <CardTitle>Automation First</CardTitle>
                <CardDescription>
                  Set up rules and automation to categorize transactions, 
                  create budgets, and track goals without manual work.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Target className="h-10 w-10 text-primary" />
                <CardTitle>Goal Tracking</CardTitle>
                <CardDescription>
                  Set financial goals and track your progress with visual 
                  indicators and personalized recommendations.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary" />
                <CardTitle>Investment Insights</CardTitle>
                <CardDescription>
                  Monitor your investment portfolio performance and get 
                  recommendations for better financial decisions.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* How it works */}
        <section className="container px-4 py-24 md:py-32">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
              How it works
            </h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              Get started in minutes with our simple 3-step process
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 mt-16 md:grid-cols-3">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-bold">Upload Documents</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Drag and drop your bank statements, credit card bills, or investment documents. 
                We support PDF, JPG, and PNG formats.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold">AI Processing</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Our advanced AI reads and processes your documents, extracting transactions, 
                amounts, dates, and merchant information automatically.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-bold">Get Insights</h3>
              <p className="text-gray-500 dark:text-gray-400">
                View your financial data in beautiful dashboards with charts, trends, 
                and actionable insights to improve your financial health.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="container px-4 py-24 md:py-32 bg-muted/50">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-4">
            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="text-3xl font-bold">10K+</div>
              <div className="text-gray-500 dark:text-gray-400">Documents Processed</div>
            </div>
            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-gray-500 dark:text-gray-400">Accuracy Rate</div>
            </div>
            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="text-3xl font-bold">5K+</div>
              <div className="text-gray-500 dark:text-gray-400">Happy Users</div>
            </div>
            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-gray-500 dark:text-gray-400">Processing</div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container px-4 py-24 md:py-32">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
              Ready to take control of your finances?
            </h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              Join thousands of users who have simplified their financial management 
              with our platform. Get started for free today.
            </p>
            <div className="space-x-4">
              <Button size="lg" asChild>
                <Link href="/register">Start Free Trial</Link>
              </Button>
              <Button variant="outline" size="lg">
                View Demo
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container px-4 py-12 md:py-16">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6" />
                <span className="font-bold">Finance App</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Smart finance management made simple with AI-powered automation.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><Link href="/features">Features</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/security">Security</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><Link href="/about">About</Link></li>
                <li><Link href="/blog">Blog</Link></li>
                <li><Link href="/careers">Careers</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Support</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><Link href="/help">Help Center</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/api">API Docs</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>&copy; 2024 Finance App. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
