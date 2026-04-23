'use client'

import { LogoIcon } from '@/components/common/logo'
import { RainbowButton } from '@/components/ui/rainbow-button'
import { LayoutDashboard } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { LuGithub } from 'react-icons/lu'
import { MdOutlineDocumentScanner } from 'react-icons/md'

export default function Home() {
  const locale = useLocale()
  const t = useTranslations('HomePage')
  const tMain = useTranslations('MainLayout')

  /* GitHub Pages 链接 */
  const githubPages = (repository: string): string => {
    const repoMatch = repository.match(/^(https?:\/\/[^/]+)\/([^/]+)\/([^/]+)$/)
    if (!repoMatch) {
      return '#'
    }
    const owner = repoMatch[2]
    const repo = repoMatch[3]
    return `https://${owner}.github.io/${repo}/${locale}/`
  }

  return (
    <div className="grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-sans sm:p-20">
      <main className="row-start-2 flex flex-col items-center gap-8 sm:items-center">
        <div>
          <div className="flex items-center justify-center gap-4">
            <LogoIcon size={128} />
            <div className="flex flex-col">
              <p className="text-foreground max-w-150 text-left text-2xl font-bold sm:text-left">
                {tMain('appMark')}
              </p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-150 text-center text-lg sm:text-center">
            {t('description')}
          </p>
        </div>
        <Link href={`/${locale}/dashboard`} rel="noopener noreferrer">
          <RainbowButton
            variant="outline"
            className="h-10 rounded-full transition-all hover:scale-105 active:scale-95"
          >
            Dashboard
            <LayoutDashboard />
          </RainbowButton>
        </Link>
      </main>
      <footer className="row-start-3 flex flex-wrap items-center justify-center gap-6">
        <Link
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href={process.env.NEXT_PUBLIC_REPOSITORY ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
        >
          <LuGithub />
          {t('github')}
        </Link>
        <Link
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href={
            githubPages(
              process.env.NEXT_PUBLIC_REPOSITORY ?? 'https://github.com',
            ) ?? '#'
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          <MdOutlineDocumentScanner />
          {t('docs')}
        </Link>
      </footer>
    </div>
  )
}
