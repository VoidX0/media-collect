'use client'

import ParticlesApp from '@/components/main/particles'
import { RainbowButton } from '@/components/ui/rainbow-button'
import Loader from '@/components/uiverse/loader0'
import { MoveLeft } from 'lucide-react'
import Link from 'next/link'
import './globals.css'

export default function NotFound() {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storageTheme = localStorage.getItem('theme');
                  const supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (storageTheme === 'dark' || (!storageTheme && supportDarkMode) || (!storageTheme && !window.matchMedia('(prefers-color-scheme: light)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else if (storageTheme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <title>404 - Page Not Found</title>
      </head>

      <body className="bg-background text-foreground h-full overflow-hidden font-sans antialiased transition-colors duration-300">
        <div className="fixed inset-0 z-0">
          <ParticlesApp />
        </div>
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-12 p-8 text-center sm:p-20">
          <main className="flex flex-col items-center gap-12">
            <div className="flex flex-col items-center gap-8">
              {/* 图标区域 */}
              <div className="relative flex items-center justify-center">
                {/* 呼吸灯光晕 */}
                {/*<div className="bg-primary absolute h-32 w-32 animate-pulse rounded-full opacity-20 blur-[60px]" />*/}
                {/*<Telescope*/}
                {/*  size={160}*/}
                {/*  strokeWidth={1}*/}
                {/*  className="text-primary animate-in zoom-in relative z-10 duration-700"*/}
                {/*/>*/}
                <Loader />
              </div>

              {/* 信息区域 */}
              <div className="flex flex-col gap-3">
                <h1 className="from-foreground to-foreground/50 bg-linear-to-b bg-clip-text text-7xl font-black tracking-tighter text-transparent sm:text-9xl">
                  404
                </h1>
                <p className="text-muted-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
                  Page Not Found
                </p>
              </div>
            </div>

            {/* 描述文本 */}
            <p className="text-muted-foreground max-w-md text-lg leading-relaxed text-balance lowercase first-letter:uppercase">
              It looks like you&apos;ve followed a link that doesn&apos;t exist
              or mistyped the address.
            </p>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/">
                <RainbowButton
                  variant="outline"
                  className="shadow-primary/20 h-14 rounded-full px-10 text-lg shadow-2xl transition-all hover:scale-105 active:scale-95"
                >
                  <MoveLeft className="mr-3 h-5 w-5" />
                  Back to Home
                </RainbowButton>
              </Link>
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
