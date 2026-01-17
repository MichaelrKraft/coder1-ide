import { FileQuestion, Home, Search, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 illustration */}
        <div className="mx-auto w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center mb-6">
          <FileQuestion className="h-10 w-10 text-violet-400" />
        </div>

        {/* Error code */}
        <div className="text-7xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-4">
          404
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">
          Page not found
        </h1>
        <p className="text-zinc-400 mb-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
          It might have been moved, deleted, or never existed.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Button
            asChild
            className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
          >
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/campaigns">
              <ArrowLeft className="h-4 w-4 mr-2" />
              View Campaigns
            </Link>
          </Button>
        </div>

        {/* Suggested links */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-medium text-zinc-300 mb-4 flex items-center justify-center gap-2">
            <Search className="h-4 w-4" />
            Looking for something?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/campaigns"
              className="text-sm text-zinc-400 hover:text-violet-400 transition-colors p-2 rounded-md hover:bg-zinc-800/50"
            >
              Campaigns
            </Link>
            <Link
              href="/discovery"
              className="text-sm text-zinc-400 hover:text-violet-400 transition-colors p-2 rounded-md hover:bg-zinc-800/50"
            >
              Discovery
            </Link>
            <Link
              href="/pipeline"
              className="text-sm text-zinc-400 hover:text-violet-400 transition-colors p-2 rounded-md hover:bg-zinc-800/50"
            >
              Pipeline
            </Link>
            <Link
              href="/analytics"
              className="text-sm text-zinc-400 hover:text-violet-400 transition-colors p-2 rounded-md hover:bg-zinc-800/50"
            >
              Analytics
            </Link>
            <Link
              href="/content"
              className="text-sm text-zinc-400 hover:text-violet-400 transition-colors p-2 rounded-md hover:bg-zinc-800/50"
            >
              Content
            </Link>
            <Link
              href="/outreach"
              className="text-sm text-zinc-400 hover:text-violet-400 transition-colors p-2 rounded-md hover:bg-zinc-800/50"
            >
              Outreach
            </Link>
          </div>
        </div>

        {/* Support */}
        <p className="mt-8 text-xs text-zinc-500">
          Think this is a mistake?{' '}
          <a
            href="mailto:support@leadpoint.ai"
            className="text-violet-400 hover:text-violet-300 underline"
          >
            Let us know
          </a>
        </p>
      </div>
    </div>
  )
}
