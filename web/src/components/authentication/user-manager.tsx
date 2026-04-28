import {
  SystemController,
  SystemRole,
  SystemUser,
} from '@/api/generatedSchemas'
import { PermissionSelectorDialog } from '@/components/authentication/permission-selector-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { openapi } from '@/lib/http'
import { rsaEncrypt, TokenPayload } from '@/lib/security'
import { ChevronDown, Key, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

/**
 * 用户管理组件
 */
export function UserManager({
  currentUser,
  roles,
  allPermissions,
  isLoadingParent,
}: {
  currentUser: TokenPayload
  roles: SystemRole[]
  allPermissions: SystemController[]
  isLoadingParent: boolean
}) {
  const t = useTranslations('AuthenticationPage')
  const [users, setUsers] = useState<SystemUser[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null)
  const [password, setPassword] = useState('')

  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [currentPermUser, setCurrentPermUser] = useState<SystemUser | null>(
    null,
  )
  const [userDirectPermissions, setUserDirectPermissions] = useState<string[]>(
    [],
  )
  const [isPermLoading, setIsPermLoading] = useState(false)

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    const { data } = await openapi.GET('/Authentication/Users')
    setUsers(data ?? [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!isLoadingParent) fetchUsers().then()
  }, [isLoadingParent, fetchUsers])

  const displayUsers = useMemo(() => {
    return users
  }, [users])

  const availableRoles = useMemo(() => {
    return roles
  }, [roles])

  const handleEditUser = (user?: SystemUser) => {
    setPassword('')
    if (user) {
      const roleIds = user.role?.map((r) => r.toString()) ?? []
      setEditingUser({ ...user, role: roleIds })
    } else {
      setEditingUser({
        id: 0,
        email: '',
        nickName: '',
        isPlatformAdmin: false,
        // 移除 isTenantAdmin 初始化
        password: '',
        role: [],
      })
    }
    setEditDialogOpen(true)
  }

  const handlePlatformAdminToggle = (checked: boolean) => {
    setEditingUser((prev) => {
      if (!prev) return null
      return {
        ...prev,
        isPlatformAdmin: checked,
      }
    })
  }

  const saveUser = async () => {
    if (!editingUser) return

    const userToSave = { ...editingUser }

    const rawPassword = password || editingUser.password || ''

    if (!rawPassword && editingUser.id === 0) {
      toast.error(t('enterPassword'))
      return
    }
    if (!rawPassword) {
      toast.error(t('invalidPassword'))
      return
    }

    const encrypted = rsaEncrypt(rawPassword)
    if (encrypted) {
      userToSave.password = encrypted
    } else {
      toast.error(t('encryptFail'))
      return
    }

    userToSave.role = userToSave.role?.map((r) => r)

    const isEdit = userToSave.id && userToSave.id !== 0
    const { error } = isEdit
      ? await openapi.PUT('/Authentication/ModifyUser', { body: userToSave })
      : await openapi.POST('/Authentication/AddUser', { body: userToSave })

    if (!error) {
      toast.success(isEdit ? t('userUpdated') : t('userCreated'))
      setEditDialogOpen(false)
      fetchUsers().then()
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete?.id) return
    const { error } = await openapi.DELETE('/Authentication/DeleteUser', {
      params: { query: { userId: userToDelete.id } },
    })
    if (!error) {
      toast.success(t('userDeleted'))
      fetchUsers().then()
      setDeleteConfirmOpen(false)
    }
  }

  // 独立权限逻辑保持不变
  const openPermDialog = async (user: SystemUser) => {
    setCurrentPermUser(user)
    setPermDialogOpen(true)
    setIsPermLoading(true)
    const { data } = await openapi.GET('/Authentication/UserControllers', {
      params: { query: { userId: user.id?.toString(), isGranted: true } },
    })
    setUserDirectPermissions(data?.map((c) => c.id!.toString()) ?? [])
    setIsPermLoading(false)
  }

  const saveDirectPermissions = async () => {
    if (!currentPermUser?.id) return
    setIsPermLoading(true)
    try {
      const { data: originalData } = await openapi.GET(
        '/Authentication/UserControllers',
        {
          params: {
            query: { userId: currentPermUser.id.toString(), isGranted: true },
          },
        },
      )
      const originalIds = new Set(
        originalData?.map((c) => c.id!.toString()) ?? [],
      )
      const newIds = new Set(userDirectPermissions)

      const toAdd = [...newIds].filter((id) => !originalIds.has(id))
      const toRemove = [...originalIds].filter((id) => !newIds.has(id))

      const promises: Promise<unknown>[] = []
      for (const ctrlId of toAdd)
        promises.push(
          openapi.POST('/Authentication/AddUserGrant', {
            params: {
              query: { userId: currentPermUser.id, controllerId: ctrlId },
            },
          }),
        )
      for (const ctrlId of toRemove)
        promises.push(
          openapi.DELETE('/Authentication/DeleteUserGrant', {
            params: {
              query: { userId: currentPermUser.id, controllerId: ctrlId },
            },
          }),
        )

      await Promise.all(promises)
      toast.success(t('permissionSaved'))
      setPermDialogOpen(false)
    } finally {
      setIsPermLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{t('userList')}</CardTitle>
          <CardDescription>{t('userListDesc')}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleEditUser()}>
            <Plus className="mr-2 h-4 w-4" /> {t('addUser')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('user')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-right">{t('action')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.nickName}</span>
                      <span className="text-muted-foreground text-xs">
                        {user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.role && user.role.length > 0 ? (
                        user.role.map((roleId) => {
                          const r = roles.find(
                            (rx) => rx.id?.toString() === roleId.toString(),
                          )
                          return r ? (
                            <Badge
                              key={roleId}
                              variant="secondary"
                              className="text-xs"
                            >
                              {r.name}
                            </Badge>
                          ) : null
                        })
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {/* 移除 Tenant Admin 状态徽章 */}
                      {user.isPlatformAdmin && (
                        <Badge variant="destructive">
                          {t('platformAdminLabel')}
                        </Badge>
                      )}
                      {!user.isPlatformAdmin && (
                        <span className="text-muted-foreground text-xs">
                          {t('normalUser')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPermDialog(user)}
                    >
                      <Key className="mr-2 h-3.5 w-3.5" /> {t('permission')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setUserToDelete(user)
                        setDeleteConfirmOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {displayUsers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground h-24 text-center"
                  >
                    {t('noUserData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUser?.id ? t('editUser') : t('createUser')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('email')}</Label>
              <Input
                value={editingUser?.email ?? ''}
                disabled={!!editingUser?.id}
                onChange={(e) =>
                  setEditingUser((prev) =>
                    prev ? { ...prev, email: e.target.value } : prev,
                  )
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('nickname')}</Label>
              <Input
                value={editingUser?.nickName ?? ''}
                onChange={(e) =>
                  setEditingUser((prev) =>
                    prev ? { ...prev, nickName: e.target.value } : prev,
                  )
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('password')}</Label>
              <Input
                type="password"
                placeholder={
                  editingUser?.id
                    ? t('passwordPlaceholderEdit')
                    : t('passwordPlaceholderCreate')
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="pt-2 text-right">{t('role')}</Label>
              <div className="col-span-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {editingUser?.role?.length
                        ? t('selectedRoles', { param: editingUser.role.length })
                        : t('selectRole')}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-75">
                    <DropdownMenuLabel>{t('availableRoles')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableRoles.length > 0 ? (
                      availableRoles.map((role) => {
                        const isChecked = editingUser?.role?.some(
                          (id) => id.toString() === role.id?.toString(),
                        )
                        return (
                          <DropdownMenuCheckboxItem
                            key={role.id}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              setEditingUser((prev) => {
                                if (!prev) return null
                                const current =
                                  (prev.role as (string | number)[]) ?? []
                                const roleIdStr = role.id!.toString()
                                return {
                                  ...prev,
                                  role: checked
                                    ? [...current, roleIdStr]
                                    : current.filter(
                                        (id) => id.toString() !== roleIdStr,
                                      ),
                                }
                              })
                            }}
                          >
                            {role.name}
                          </DropdownMenuCheckboxItem>
                        )
                      })
                    ) : (
                      <div className="text-muted-foreground p-2 text-center text-sm">
                        {t('noRoles')}
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="mt-2 flex flex-wrap gap-1">
                  {editingUser?.role?.map((id) => {
                    const r = roles.find(
                      (rx) => rx.id?.toString() === id.toString(),
                    )
                    return r ? (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {r.name}
                      </Badge>
                    ) : null
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('permissionSetting')}</Label>
              <div className="col-span-3 flex flex-col gap-2">
                {currentUser.isPlatformAdmin && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isPlatformAdmin"
                      checked={editingUser?.isPlatformAdmin}
                      onCheckedChange={(c) =>
                        handlePlatformAdminToggle(c === true)
                      }
                    />
                    <label htmlFor="isPlatformAdmin" className="text-sm">
                      {t('setPlatformAdmin')}
                    </label>
                  </div>
                )}
                {/* 移除 isTenantAdmin 复选框 */}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={saveUser}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 权限选择和删除确认逻辑保持不变 */}
      <PermissionSelectorDialog
        open={permDialogOpen}
        onOpenChange={setPermDialogOpen}
        title={t('userPermissionTitle', {
          param: currentPermUser?.nickName ?? '',
        })}
        description={t('userPermissionDesc')}
        allPermissions={allPermissions}
        selectedIds={userDirectPermissions}
        onSelectionChange={setUserDirectPermissions}
        onSave={saveDirectPermissions}
        isLoading={isPermLoading}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteUserDesc')} <b>{userToDelete?.nickName}</b>。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
