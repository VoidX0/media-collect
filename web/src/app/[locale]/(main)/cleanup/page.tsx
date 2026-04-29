'use client'

import { useTranslations } from 'next-intl'

export default function Page() {
  const t = useTranslations('CleanupPage')

  return <div className="max-w-8xl mx-auto w-full space-y-8 p-8">CLEANUP</div>
}
