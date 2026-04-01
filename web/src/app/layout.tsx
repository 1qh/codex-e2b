import type { Metadata } from 'next'
import type { ReactNode } from 'react'
// oxlint-disable-next-line import/no-unassigned-import
import '@a/ui/globals.css'
const metadata: Metadata = {
    description: 'Agent-native SaaS',
    title: 'Claw'
  },
  RootLayout = ({ children }: { children: ReactNode }) => (
    <html lang='en'>
      <body>{children}</body>
    </html>
  )
export { metadata }
export default RootLayout
