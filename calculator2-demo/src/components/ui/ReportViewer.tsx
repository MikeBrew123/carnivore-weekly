import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface ReportViewerProps {
  accessToken: string
}

export default function ReportViewer({ accessToken }: ReportViewerProps) {
  const [reportHTML, setReportHTML] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true)
        console.log('Fetching report with token:', accessToken)

        const url = `https://kwtdpvnjewtahuxjyltn.supabase.co/rest/v1/generated_reports?access_token=eq.${accessToken}&select=report_html`
        console.log('Fetching from:', url)

        const response = await fetch(url, {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dGRwdm5qZXd0YWh1eGp5bHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxNjA2NDMsImV4cCI6MTg5MTgyNzI0M30.qyZNTfEcTbTqXhDPZqWKJ0J2pI5rTf6Q8VTk2xvCIZc'
          }
        })

        console.log('Response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error:', errorText)
          throw new Error(`Failed to load report: ${response.status} ${errorText}`)
        }

        const data = await response.json()
        console.log('Response data:', data)

        if (!data || data.length === 0) {
          throw new Error('Report not found in database')
        }

        if (!data[0].report_html) {
          throw new Error('Report HTML is empty')
        }

        setReportHTML(data[0].report_html)
        setError('')
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load report'
        console.error('Report fetch error:', errorMsg)
        setError(errorMsg)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReport()
  }, [accessToken])

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4 p-8"
      >
        <div className="flex justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          />
        </div>
        <p className="text-center text-gray-600 font-semibold">
          Loading your personalized report...
        </p>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-red-50 border border-red-200 rounded-lg p-8 text-center"
      >
        <p className="text-red-600 font-semibold mb-2">Unable to load report</p>
        <p className="text-red-500 text-sm">{error}</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-lg overflow-hidden"
    >
      {/* Report Content - Rendered as HTML */}
      <div
        className="prose prose-sm max-w-none p-8"
        dangerouslySetInnerHTML={{ __html: reportHTML }}
      />

      {/* Download/Print Actions */}
      <div className="border-t border-gray-200 p-6 flex gap-4 justify-center">
        <button
          onClick={() => window.print()}
          className="btn-primary"
        >
          🖨️ Print Report
        </button>
        <button
          onClick={() => {
            const element = document.createElement('a')
            element.href = `data:text/html;charset=utf-8,${encodeURIComponent(reportHTML)}`
            element.download = 'carnivore-protocol.html'
            element.click()
          }}
          className="btn-secondary"
        >
          💾 Download Report
        </button>
      </div>
    </motion.div>
  )
}
