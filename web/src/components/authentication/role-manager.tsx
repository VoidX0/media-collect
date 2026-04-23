import { SystemController, SystemRole } from '@/api/generatedSchemas'
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
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { TokenPayload } from '@/lib/security'
import { Key, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

/**
 * 角色管理组件
 */
export function RoleManager({
  roles,
  allPermissions,
  onRefresh,
  isLoadingParent,
}: {
  currentUser: TokenPayload
  roles: SystemRole[]
  allPermissions: SystemController[]
  onRefresh: () => Promise<void>
  isLoadingParent: boolean
}) {
  const t = useTranslations('AuthenticationPage')

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<SystemRole | null>(null)

  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [currentPermRole, setCurrentPermRole] = useState<SystemRole | null>(
    null,
  )
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [isPermLoading, setIsPermLoading] = useState(false)

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<SystemRole | null>(null)

  // 过滤显示逻辑（移除租户过滤）
  const displayRoles = useMemo(() => {
    return roles
  }, [roles])

  const handleEditRole = (role?: SystemRole) => {
    if (role) {
      setEditingRole({ ...role })
    } else {
      setEditingRole({
        id: 0,
        name: '',
      })
    }
    setEditDialogOpen(true)
  }

  const saveRole = async () => {
    if (!editingRole) return

    const isEdit = editingRole.id && editingRole.id !== 0
    const { error } = isEdit
      ? await openapi.PUT('/Authentication/ModifyRole', { body: editingRole })
      : await openapi.POST('/Authentication/AddRole', { body: editingRole })

    if (!error) {
      toast.success(isEdit ? t('roleUpdated') : t('roleCreated'))
      setEditDialogOpen(false)
      await onRefresh()
    }
  }

  const handleDeleteRole = async () => {
    if (!roleToDelete?.id) return
    const { error } = await openapi.DELETE('/Authentication/DeleteRole', {
      params: { query: { roleId: roleToDelete.id } },
    })
    if (!error) {
      toast.success(t('roleDeleted'))
      await onRefresh()
      setDeleteConfirmOpen(false)
    }
  }

  // 权限配置
  const openPermDialog = async (role: SystemRole) => {
    setCurrentPermRole(role)
    setPermDialogOpen(true)
    setIsPermLoading(true)
    const { data } = await openapi.GET('/Authentication/RoleControllers', {
      params: { query: { roleId: role.id?.toString(), isGranted: true } },
    })
    setRolePermissions(data?.map((c) => c.id!.toString()) ?? [])
    setIsPermLoading(false)
  }

  const savePermissions = async () => {
    if (!currentPermRole?.id) return
    setIsPermLoading(true)
    try {
      const { data: originalData } = await openapi.GET(
        '/Authentication/RoleControllers',
        {
          params: {
            query: { roleId: currentPermRole.id.toString(), isGranted: true },
          },
        },
      )
      const originalIds = new Set(
        originalData?.map((c) => c.id!.toString()) ?? [],
      )
      const newIds = new Set(rolePermissions)

      const toAdd = [...newIds].filter((id) => !originalIds.has(id))
      const toRemove = [...originalIds].filter((id) => !newIds.has(id))

      const promises: Promise<unknown>[] = []
      for (const ctrlId of toAdd)
        promises.push(
          openapi.POST('/Authentication/AddRoleGrant', {
            params: {
              query: { roleId: currentPermRole.id, controllerId: ctrlId },
            },
          }),
        )
      for (const ctrlId of toRemove)
        promises.push(
          openapi.DELETE('/Authentication/DeleteRoleGrant', {
            params: {
              query: { roleId: currentPermRole.id, controllerId: ctrlId },
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
          <CardTitle>{t('roleList')}</CardTitle>
          <CardDescription>{t('roleListDesc')}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleEditRole()}>
            <Plus className="mr-2 h-4 w-4" /> {t('addRole')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingParent ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('roleName')}</TableHead>
                <TableHead className="text-right">{t('action')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    {role.name}
                    <div className="text-muted-foreground text-[10px]">
                      ID: {role.id}
                    </div>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPermDialog(role)}
                    >
                      <Key className="mr-2 h-3.5 w-3.5" /> {t('permission')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditRole(role)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setRoleToDelete(role)
                        setDeleteConfirmOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {displayRoles.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-muted-foreground h-24 text-center"
                  >
                    {t('noRoleData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRole?.id ? t('editRole') : t('createRole')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roleName" className="text-right">
                {t('name')}
              </Label>
              <Input
                id="roleName"
                value={editingRole?.name ?? ''}
                onChange={(e) =>
                  setEditingRole((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev,
                  )
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={saveRole}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PermissionSelectorDialog
        open={permDialogOpen}
        onOpenChange={setPermDialogOpen}
        title={t('rolePermissionTitle', { param: currentPermRole?.name ?? '' })}
        allPermissions={allPermissions}
        selectedIds={rolePermissions}
        onSelectionChange={setRolePermissions}
        onSave={savePermissions}
        isLoading={isPermLoading}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteRole')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteRoleDesc')} <b>{roleToDelete?.name}</b>。
              {t('deleteIrreversible')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
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
