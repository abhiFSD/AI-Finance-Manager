import { ThemeToggle } from "@/components/ui/theme-toggle"
import { BarChart3 } from "lucide-react"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <BarChart3 className="mr-2 h-6 w-6" />
          Finance App
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "This finance app has saved me countless hours in managing my finances. 
              The automated document processing is a game changer."
            </p>
            <footer className="text-sm">Sofia Davis</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="absolute right-4 top-4 md:right-8 md:top-8">
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <Link href="/" className="flex items-center justify-center space-x-2 lg:hidden">
              <BarChart3 className="h-6 w-6" />
              <span className="font-bold">Finance App</span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}