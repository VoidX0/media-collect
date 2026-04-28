'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'

export default function MainBreadcrumb() {
  const t = useTranslations('MainLayout')
  const locale = useLocale()
  const pathname = usePathname()
  const pathParts = pathname.split('/').filter(Boolean)
  let lastPart = pathParts[pathParts.length - 1] || 'Home' // 最后一部分路径
  lastPart = lastPart.charAt(0).toUpperCase() + lastPart.slice(1) // 首字母大写
  lastPart = lastPart.replace('-', ' ') // 将连字符替换为空格

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href={`/${locale}/dashboard`}>
            {t('app')}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbPage>{lastPart}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
