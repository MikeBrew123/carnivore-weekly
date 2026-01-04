import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// Report styling guide exported for standalone HTML downloads
const reportStylesCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Merriweather:wght@400;500;700&display=swap');

  :root {
    --report-bg: #F2F0E6;
    --report-heading: #ffd700;
    --report-text: #1a120b;
    --report-divider: #d4a574;
    --report-code-bg: #0f0f0f;
    --report-code-text: #f5f5f5;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    background-color: var(--report-bg);
    color: var(--report-text);
    font-family: 'Merriweather', serif;
    line-height: 1.6;
    margin: 0;
    padding: 20px;
  }

  .report-container {
    max-width: 800px;
    margin: 0 auto;
    background-color: white;
    padding: 2rem;
    border-radius: 8px;
  }

  h1 {
    font-family: 'Playfair Display', serif;
    font-size: 36px;
    color: var(--report-heading);
    margin: 40px 0 30px 0;
  }

  h2 {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    color: var(--report-heading);
    margin: 50px 0 40px 0;
    border-bottom: 3px solid var(--report-divider);
    padding-bottom: 15px;
  }

  h3 {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    color: var(--report-heading);
    margin: 30px 0 20px 0;
  }

  h4 {
    font-family: 'Merriweather', serif;
    font-size: 18px;
    color: var(--report-text);
    margin: 20px 0 15px 0;
    font-weight: 700;
  }

  p {
    font-size: 18px;
    margin: 0 0 1.2em 0;
    line-height: 1.8;
  }

  ul, ol {
    font-size: 18px;
    margin: 1.5em 0;
    padding-left: 2em;
    line-height: 1.8;
  }

  li {
    margin: 0.8em 0;
    line-height: 1.8;
  }

  strong {
    font-weight: 700;
  }

  em {
    font-style: italic;
  }

  a {
    color: var(--report-heading);
    text-decoration: underline;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5em 0;
    font-size: 16px;
    background-color: #fafafa;
    border: 1px solid var(--report-divider);
  }

  th {
    background-color: var(--report-divider);
    color: white;
    padding: 12px;
    text-align: left;
    font-weight: 700;
  }

  td {
    padding: 12px;
    border: 1px solid var(--report-divider);
  }

  tbody tr:nth-child(odd) {
    background-color: #f9f7f1;
  }

  code {
    background-color: var(--report-code-bg);
    color: var(--report-code-text);
    padding: 12px 14px;
    border-radius: 6px;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    display: inline;
  }

  pre {
    background-color: var(--report-code-bg);
    color: var(--report-code-text);
    padding: 12px 14px;
    border-radius: 6px;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    margin: 1.5em 0;
    overflow-x: auto;
    line-height: 1.5;
  }

  blockquote {
    border-left: 5px solid var(--report-divider);
    background-color: #faf8f3;
    padding: 20px 0 20px 20px;
    margin: 1.5em 0;
    font-style: italic;
    font-size: 17px;
    line-height: 1.8;
  }

  hr {
    border: none;
    border-top: 2px solid var(--report-divider);
    margin: 2em 0;
  }

  @media print {
    body {
      padding: 0;
      margin: 0;
      background: white;
    }

    .report-container {
      padding: 1in;
      border-radius: 0;
      box-shadow: none;
    }

    h2 {
      font-size: 20pt;
      margin: 0.4in 0 0.25in 0;
      page-break-after: avoid;
    }

    h3 {
      font-size: 16pt;
      margin: 0.25in 0 0.15in 0;
      page-break-after: avoid;
    }

    p {
      font-size: 12pt;
      margin: 0 0 0.2in 0;
      orphans: 3;
      widows: 3;
    }

    ul, ol {
      font-size: 12pt;
      margin: 0.2in 0;
      padding-left: 0.5in;
    }

    table {
      font-size: 11pt;
      border: 1pt solid #333;
      margin: 0.25in 0;
      page-break-inside: avoid;
    }

    th {
      background-color: #d4a574;
      padding: 0.08in;
      border: 1pt solid #999;
    }

    td {
      padding: 0.08in;
      border: 1pt solid #ccc;
    }

    a {
      color: var(--report-text);
      text-decoration: none;
    }
  }

  @page {
    size: A4;
    margin: 1in;
  }
`

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

  const handlePrintPDF = () => {
    // Trigger browser print dialog for PDF export
    window.print()
  }

  const handleDownloadHTML = () => {
    // Create downloadable HTML file
    const element = document.createElement('a')
    const reportWithStyles = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carnivore Protocol Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Merriweather:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    ${reportStylesCSS}
  </style>
</head>
<body>
  <div class="report-container">
    ${reportHTML}
  </div>
</body>
</html>
    `
    element.href = `data:text/html;charset=utf-8,${encodeURIComponent(reportWithStyles)}`
    element.download = 'carnivore-protocol-report.html'
    element.click()
  }

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
      {/* Report Styling Guide - Inline CSS for rendering consistency */}
      <style>{`
        /* ========================================
           CARNIVORE CALCULATOR REPORT STYLING GUIDE
           Story 3.6: Report Styling
           ======================================== */

        /* BRAND COLORS - Strict Compliance */
        :root {
          --report-bg: #F2F0E6;        /* Cloud Dancer - cream background */
          --report-heading: #ffd700;    /* Gold - section headings */
          --report-text: #1a120b;       /* Dark brown - body text */
          --report-divider: #d4a574;    /* Tan - section dividers */
          --report-code-bg: #0f0f0f;    /* Dark code background */
          --report-code-text: #f5f5f5;  /* Light code text */
        }

        /* TYPOGRAPHY - Google Fonts Required */
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Merriweather:wght@400;500;700&display=swap');

        /* Base Report Container */
        .report-container {
          background-color: var(--report-bg);
          color: var(--report-text);
          font-family: 'Merriweather', serif;
          line-height: 1.6;
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }

        /* H1 - Not used in reports, but defined for completeness */
        .report-container h1 {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          color: var(--report-heading);
          margin: 40px 0 30px 0;
          font-weight: 900;
          line-height: 1.2;
        }

        /* H2 - Main Section Headers (28px, gold, bottom margin 40px) */
        .report-container h2 {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          color: var(--report-heading);
          margin: 50px 0 40px 0;
          font-weight: 700;
          line-height: 1.2;
          page-break-after: avoid;
          border-bottom: 3px solid var(--report-divider);
          padding-bottom: 15px;
        }

        .report-container h2:first-child {
          margin-top: 0;
        }

        /* H3 - Subsection Headers */
        .report-container h3 {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          color: var(--report-heading);
          margin: 30px 0 20px 0;
          font-weight: 700;
          line-height: 1.3;
          page-break-after: avoid;
        }

        /* H4 - Sub-subsection Headers */
        .report-container h4 {
          font-family: 'Merriweather', serif;
          font-size: 18px;
          color: var(--report-text);
          margin: 20px 0 15px 0;
          font-weight: 700;
          page-break-after: avoid;
        }

        /* Paragraph Text - 18px minimum for 30-60 age demographic */
        .report-container p {
          font-size: 18px;
          margin: 0 0 1.2em 0;
          line-height: 1.8;
          color: var(--report-text);
          font-family: 'Merriweather', serif;
          font-weight: 400;
          orphans: 2;
          widows: 2;
        }

        /* Lists - Proper spacing and readability */
        .report-container ul,
        .report-container ol {
          font-size: 18px;
          margin: 1.5em 0;
          padding-left: 2em;
          line-height: 1.8;
          color: var(--report-text);
        }

        .report-container li {
          margin: 0.8em 0;
          line-height: 1.8;
        }

        .report-container ul li {
          list-style-type: disc;
        }

        .report-container ol li {
          list-style-type: decimal;
        }

        /* Strong/Bold Text */
        .report-container strong {
          font-weight: 700;
          color: var(--report-text);
        }

        /* Italic Text */
        .report-container em {
          font-style: italic;
        }

        /* Links */
        .report-container a {
          color: var(--report-heading);
          text-decoration: underline;
          transition: opacity 0.2s ease;
        }

        .report-container a:hover {
          opacity: 0.8;
        }

        /* Tables - Light borders, readable font */
        .report-container table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5em 0;
          font-size: 16px;
          background-color: #fafafa;
          border: 1px solid var(--report-divider);
          page-break-inside: avoid;
        }

        .report-container th {
          background-color: var(--report-divider);
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 700;
          border: 1px solid #b89968;
          font-family: 'Merriweather', serif;
        }

        .report-container td {
          padding: 12px;
          border: 1px solid var(--report-divider);
          color: var(--report-text);
        }

        .report-container tbody tr:nth-child(odd) {
          background-color: #f9f7f1;
        }

        /* Code Blocks - Dark background with light text */
        .report-container code,
        .report-container pre {
          background-color: var(--report-code-bg);
          color: var(--report-code-text);
          padding: 12px 14px;
          border-radius: 6px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 14px;
          overflow-x: auto;
          page-break-inside: avoid;
        }

        .report-container pre {
          margin: 1.5em 0;
          line-height: 1.5;
        }

        .report-container code {
          display: inline;
        }

        /* Blockquotes and Callouts - Tan border-left, light background */
        .report-container blockquote {
          border-left: 5px solid var(--report-divider);
          background-color: #faf8f3;
          padding: 20px 0 20px 20px;
          margin: 1.5em 0;
          font-style: italic;
          color: var(--report-text);
          page-break-inside: avoid;
          font-size: 17px;
          line-height: 1.8;
        }

        /* Horizontal Rules */
        .report-container hr {
          border: none;
          border-top: 2px solid var(--report-divider);
          margin: 2em 0;
          page-break-after: avoid;
        }

        /* ========================================
           SCREEN DISPLAY STYLES
           ======================================== */

        .report-section {
          background-color: white;
          border-radius: 12px;
          padding: 2rem;
          border-left: 5px solid var(--report-heading);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .report-action-bar {
          display: flex;
          gap: 1rem;
          justify-content: center;
          padding: 1.5rem;
          background-color: white;
          border-top: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .print-hide {
          display: block;
        }

        /* ========================================
           PRINT-FRIENDLY STYLES (@media print)
           ======================================== */

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

          body {
            line-height: 1.6;
          }

          .report-container {
            background-color: white;
            padding: 1in;
            max-width: 100%;
            margin: 0;
          }

          /* Hide interactive elements */
          .print-hide {
            display: none !important;
          }

          /* Report Sections - Page break management */
          .report-section {
            page-break-inside: avoid;
            background: white;
            border: none;
            border-left: 4pt solid var(--report-divider);
            margin: 0 0 0.5in 0;
            padding: 0.5in;
            border-radius: 0;
            box-shadow: none;
          }

          .report-section:last-child {
            margin-bottom: 0;
          }

          /* Headers on print */
          .report-container h1 {
            font-size: 28pt;
            margin: 0.5in 0 0.3in 0;
            page-break-after: avoid;
          }

          .report-container h2 {
            font-size: 20pt;
            margin: 0.4in 0 0.25in 0;
            padding-bottom: 0.1in;
            page-break-after: avoid;
            border-bottom: 2pt solid var(--report-divider);
          }

          .report-container h3 {
            font-size: 16pt;
            margin: 0.25in 0 0.15in 0;
            page-break-after: avoid;
          }

          .report-container h4 {
            font-size: 14pt;
            margin: 0.15in 0 0.1in 0;
            page-break-after: avoid;
          }

          /* Paragraph print sizing */
          .report-container p {
            font-size: 12pt;
            margin: 0 0 0.2in 0;
            line-height: 1.5;
            orphans: 3;
            widows: 3;
          }

          /* Lists on print */
          .report-container ul,
          .report-container ol {
            font-size: 12pt;
            margin: 0.2in 0;
            padding-left: 0.5in;
            page-break-inside: avoid;
          }

          .report-container li {
            margin: 0.08in 0;
            line-height: 1.4;
          }

          /* Tables on print */
          .report-container table {
            font-size: 11pt;
            width: 100%;
            border-collapse: collapse;
            margin: 0.25in 0;
            page-break-inside: avoid;
            border: 1pt solid #333;
          }

          .report-container th {
            background-color: #d4a574;
            color: white;
            padding: 0.08in;
            font-weight: 700;
            border: 1pt solid #999;
          }

          .report-container td {
            padding: 0.08in;
            border: 1pt solid #ccc;
            background-color: white;
          }

          /* Code blocks on print */
          .report-container code,
          .report-container pre {
            background-color: var(--report-code-bg);
            color: var(--report-code-text);
            font-size: 10pt;
            page-break-inside: avoid;
            padding: 0.1in;
            border-radius: 0;
          }

          /* Blockquotes on print */
          .report-container blockquote {
            page-break-inside: avoid;
            border-left: 3pt solid var(--report-divider);
            margin: 0.2in 0;
            padding: 0.15in 0 0.15in 0.2in;
          }

          /* Links in print - remove underline, use dark text */
          .report-container a {
            color: var(--report-text);
            text-decoration: none;
          }

          /* A4 Paper compatibility (210mm x 297mm) */
          @page {
            size: A4;
            margin: 1in;
          }

          /* Prevent page breaks within key elements */
          .report-container h2 + p,
          .report-container h3 + p {
            page-break-before: avoid;
          }
        }

        /* ========================================
           RESPONSIVE DESIGN - Screen Sizes
           ======================================== */

        @media (max-width: 768px) {
          .report-container {
            padding: 1.5rem;
            font-size: 16px;
          }

          .report-section {
            padding: 1.5rem;
          }

          .report-container h2 {
            font-size: 24px;
            margin: 2rem 0 1.5rem 0;
          }

          .report-container h3 {
            font-size: 20px;
          }

          .report-container p,
          .report-container ul,
          .report-container ol {
            font-size: 16px;
          }

          .report-action-bar {
            flex-direction: column;
          }

          .report-action-bar button {
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .report-container {
            padding: 1rem;
            max-width: 100%;
          }

          .report-section {
            padding: 1rem;
            margin-bottom: 1rem;
          }

          .report-container h2 {
            font-size: 22px;
            margin: 1.5rem 0 1rem 0;
          }

          .report-container h3 {
            font-size: 18px;
          }

          .report-container p,
          .report-container ul,
          .report-container ol {
            font-size: 16px;
          }

          .report-container table {
            font-size: 14px;
          }

          .report-container th,
          .report-container td {
            padding: 8px;
          }
        }
      `}</style>

      {/* Report Sections with Staggered Animation */}
      <div className="w-full max-w-4xl mx-auto px-4 space-y-8">
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
            className="report-section"
          >
            <div
              className="report-container"
              dangerouslySetInnerHTML={{ __html: `## Report #${section}` }}
            />
          </motion.div>
        ))}
      </div>

      {/* Download/Print Actions */}
      <div className="w-full max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sections.length * 0.15 + 0.2 }}
          className="print-hide report-action-bar"
        >
          <button
            onClick={handlePrintPDF}
            className="btn-primary flex-1 md:flex-initial"
          >
            Print as PDF
          </button>
          <button
            onClick={handleDownloadHTML}
            className="btn-secondary flex-1 md:flex-initial"
          >
            Download as HTML
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}
