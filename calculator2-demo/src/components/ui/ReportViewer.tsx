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
            'apikey': 'sb_publishable_bQlgBZ7Otay8D9AErt8daA_2lQI36jk'
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

  // Parse report sections and animate them in
  const sections = reportHTML.split('## Report #').filter(s => s.trim())

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: white;
            width: 100%;
            height: 100%;
          }

          .print-hide {
            display: none !important;
          }

          .report-section {
            page-break-inside: avoid;
            margin: 0 0 2cm 0;
            padding: 1.2cm;
            border: none;
            border-left: 4pt solid #8b4513;
            background: white;
            break-inside: avoid;
            page-break-after: auto;
          }

          .report-section:last-child {
            margin-bottom: 0;
            page-break-after: auto;
          }

          .report-section h2 {
            margin-top: 0;
            margin-bottom: 0.8cm;
            padding: 0.3cm 0 0.5cm 0;
            page-break-after: avoid;
            page-break-before: avoid;
            font-size: 1.4em;
            font-weight: bold;
            line-height: 1.3;
            border-bottom: 2pt solid #d4a574;
            padding-bottom: 0.4cm;
          }

          .report-section h3 {
            margin: 1cm 0 0.4cm 0;
            page-break-after: avoid;
            font-size: 1.1em;
            font-weight: bold;
            color: #8b4513;
          }

          .report-section h4 {
            margin: 0.7cm 0 0.3cm 0;
            page-break-after: avoid;
            font-size: 1em;
            font-weight: 600;
            color: #2c1810;
          }

          .report-section p {
            margin: 0.3cm 0;
            line-height: 1.5;
            orphans: 2;
            widows: 2;
          }

          .report-section ul,
          .report-section ol {
            margin: 0.3cm 0;
            padding-left: 1.5cm;
            page-break-inside: avoid;
          }

          .report-section li {
            margin: 0.15cm 0;
            line-height: 1.4;
          }

          .report-section strong {
            font-weight: 700;
          }

          .report-section em {
            font-style: italic;
          }

          .prose {
            max-width: 100%;
            margin: 0;
            padding: 0;
          }

          .prose > * {
            margin-top: 0;
          }

          .prose table {
            width: 100%;
            border-collapse: collapse;
            margin: 0.5cm 0;
            page-break-inside: avoid;
            font-size: 0.95em;
          }

          .prose table th,
          .prose table td {
            border: 1px solid #333;
            padding: 0.25cm;
            text-align: left;
          }

          .prose table th {
            background-color: #e8e8e8;
            font-weight: bold;
          }

          .prose hr,
          .prose hr + * {
            page-break-after: avoid;
          }

          /* Prevent widows and orphans */
          .prose h2 + p,
          .prose h3 + p {
            page-break-before: avoid;
          }

          /* Ensure code blocks and blockquotes stay together */
          .prose code,
          .prose pre,
          .prose blockquote {
            page-break-inside: avoid;
          }

          /* Hide hyperlink references in print */
          .prose a {
            text-decoration: none;
            color: #000;
          }
        }
      `}</style>

      {/* Report Sections with Staggered Animation - Wrapped in max-w-7xl container */}
      <div className="w-full max-w-7xl mx-auto px-4 space-y-8">
        {sections.map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: index * 0.15,
              ease: 'easeOut'
            }}
            className="report-section bg-white rounded-lg shadow-lg p-8 border-l-4 border-primary"
          >
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: `## Report #${section}` }}
            />
          </motion.div>
        ))}
      </div>

      {/* Download/Print Actions */}
      <div className="w-full max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sections.length * 0.15 + 0.2 }}
          className="print-hide border-t border-gray-200 p-6 flex gap-4 justify-center sticky bottom-0 bg-white rounded-lg shadow-lg"
        >
          <button
            onClick={() => window.print()}
            className="btn-primary"
          >
            🖨️ Print to PDF
          </button>
          <button
            onClick={() => {
              const element = document.createElement('a')
              element.href = `data:text/html;charset=utf-8,${encodeURIComponent(reportHTML)}`
              element.download = 'carnivore-protocol-report.html'
              element.click()
            }}
            className="btn-secondary"
          >
            📄 Download as HTML
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}
