'use client'

import { SystemController, SystemRole } from '@/api/generatedSchemas'
import { RoleManager } from '@/components/authentication/role-manager'
import { UserManager } from '@/components/authentication/user-manager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { openapi } from '@/lib/http'
import { tokenParse, TokenPayload } from '@/lib/security'
import { ShieldAlert, UserCog } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

export default function AuthenticationPage() {
  const t = useTranslations('AuthenticationPage')
  const [activeTab, setActiveTab] = useState<string>('users')
  const [currentUser, setCurrentUser] = useState<TokenPayload | null>(null)

  // 基础数据
  const [allPermissions, setAllPermissions] = useState<SystemController[]>([])
  const [roles, setRoles] = useState<SystemRole[]>([])

  const [isLoading, setIsLoading] = useState<boolean>(true)

  // 初始化
  useEffect(() => {
    // 1. 解析 Token 获取当前身份
    const userPayload = tokenParse()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUser(userPayload)

    if (!userPayload) return

    const initData = async () => {
      setIsLoading(true)

      // 并行获取基础数据
      const [grantedRes, rolesRes] = await Promise.all([
        openapi.GET('/Authentication/Granted'), // 获取权限池
        openapi.GET('/Authentication/Roles'), // 获取所有角色
      ])
      setAllPermissions(grantedRes.data ?? [])
      setRoles(rolesRes.data ?? [])
      setIsLoading(false)
    }
    initData().then()
  }, [])

  const refreshRoles = useCallback(async () => {
    const { data } = await openapi.GET('/Authentication/Roles')
    setRoles(data ?? [])
  }, [])

  if (!currentUser) return null

  return (
    <div className="container mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t('permissionManage')}
        </h1>
      </div>

      <Tabs
        defaultValue="users"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" /> {t('userManage')}
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> {t('roleManage')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManager
            currentUser={currentUser}
            roles={roles}
            allPermissions={allPermissions}
            isLoadingParent={isLoading}
          />
        </TabsContent>

        <TabsContent value="roles">
          <RoleManager
            currentUser={currentUser}
            roles={roles}
            allPermissions={allPermissions}
            onRefresh={refreshRoles}
            isLoadingParent={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
