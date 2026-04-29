'use client'

import {
  BrushCleaning,
  Film,
  LayoutDashboard,
  type LucideIcon,
  Shield,
} from 'lucide-react'
import * as React from 'react'
import { useEffect, useState } from 'react'

import { SystemUser } from '@/api/generatedSchemas'
import { LogoIcon } from '@/components/common/logo'
import { ToggleFullscreen } from '@/components/common/toggle-fullscreen'
import ToggleLanguage from '@/components/common/toggle-language'
import { ToggleTheme } from '@/components/common/toggle-theme'
import { NavMain } from '@/components/main/nav-main'
import { NavUser } from '@/components/main/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { openapi, SKIP_ERROR_HEADER } from '@/lib/http'
import { tokenParse } from '@/lib/security'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

export function AppSidebar({
  onAuthChecked,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  onAuthChecked?: (authorized: boolean) => void
}) {
  const t = useTranslations('MainLayout')
  const locale = useLocale()
  // 路由
  const router = useRouter()
  // 用户信息
  const [user, setUser] = useState<SystemUser | undefined>(undefined)
  // 导航栏
  const [navItems, setNavItems] = useState<
    {
      title: string
      url?: string
      icon: LucideIcon
      onClick?: () => void
      hidden?: boolean
    }[]
  >([])

  // 更新公钥 JWT续期
  useEffect(() => {
    const getPublicKey = async () => {
      const { data } = await openapi.GET('/Authentication/GetKey', {
        parseAs: 'text',
      })
      if (data) localStorage.setItem('publicKey', data)
    }
    const renewToken = async () => {
      const payload = tokenParse()
      if (!payload) return
      const now = Date.now() / 1000
      // 检查是否可以续期(未过期且n小时内过期)
      if (payload.expire >= now && payload.expire - now < 2 * 60 * 60) {
        const { data } = await openapi.GET('/Authentication/RefreshToken', {
          parseAs: 'text',
        })
        if (data) localStorage.setItem('token', data)
      }
    }
    // 获取公钥并续期
    getPublicKey().then(() => renewToken().then())
  }, [])

  /* 侧边栏初始化 */
  useEffect(() => {
    const init = async () => {
      // 检查授权
      const { data, error } = await openapi.GET('/Authentication/Granted', {
        headers: { [SKIP_ERROR_HEADER]: 'true' },
      })
      if (error || !data) {
        onAuthChecked?.(false) // 通知未授权
        // 授权失败 → 跳转登录
        const currentPath = window.location.pathname + window.location.search
        router.replace(
          `/${locale}/login?redirect=${encodeURIComponent(currentPath)}`,
        )
        return // 停止执行
      }
      onAuthChecked?.(true) // 通知已授权
      // 加载用户
      const [userRes] = await Promise.all([
        openapi.GET('/Authentication/CurrentUser'),
      ])
      const userData = userRes.data
      setUser(userData)
      // 加载导航栏
      setNavItems([
        {
          title: t('navDashboard'),
          url: `/${locale}/dashboard`,
          icon: LayoutDashboard,
        },
        {
          title: t('navCollectMedia'),
          url: `/${locale}/collect-media`,
          icon: Film,
          hidden:
            data?.find(
              (item) => item.controller === 'CollectMediaController',
            ) === undefined,
        },
        {
          title: t('navCleanup'),
          url: `/${locale}/cleanup`,
          icon: BrushCleaning,
          hidden:
            data?.find((item) => item.controller === 'CleanupController') ===
            undefined,
        },
        {
          title: t('navAuthentication'),
          url: `/${locale}/authentication`,
          icon: Shield,
          hidden: userData?.isPlatformAdmin !== true,
        },
      ])
    }

    init().then()
  }, [locale, onAuthChecked, router, t])

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <a className="flex items-center gap-2" href={`/${locale}/dashboard`}>
            <LogoIcon size="35" className="shrink-0" />
            <span className="truncate font-bold">{t('appMark')}</span>
          </a>
          <NavMain items={navItems} />
        </SidebarHeader>
        <SidebarContent></SidebarContent>
        <SidebarFooter>
          <div className="space-y-2 space-x-2">
            <ToggleTheme />
            <ToggleLanguage />
            <ToggleFullscreen />
          </div>
          <NavUser user={user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  )
}
