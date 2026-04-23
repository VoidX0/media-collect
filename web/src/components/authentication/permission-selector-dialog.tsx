import { SystemController } from '@/api/generatedSchemas'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

/**
 * 通用权限选择器弹窗 (Role 和 User 共用)
 */
export function PermissionSelectorDialog({
  open,
  onOpenChange,
  title,
  description,
  allPermissions,
  selectedIds,
  onSelectionChange,
  onSave,
  isLoading,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  allPermissions: SystemController[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onSave: () => Promise<void>
  isLoading: boolean
}) {
  const locale = useLocale()
  const t = useTranslations('AuthenticationPage')
  const isAllSelected =
    allPermissions.length > 0 && selectedIds.length === allPermissions.length
  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < allPermissions.length

  const handleToggleAll = (checked: boolean) => {
    onSelectionChange(
      checked ? allPermissions.map((p) => p.id!.toString()) : [],
    )
  }

  const handleToggleSingle = (id: string, checked: boolean) => {
    onSelectionChange(
      checked ? [...selectedIds, id] : selectedIds.filter((sid) => sid !== id),
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-hidden py-2">
          <div className="flex items-center space-x-2 px-1">
            <Checkbox
              id="select-all-perms"
              checked={
                isAllSelected || (isIndeterminate ? 'indeterminate' : false)
              }
              onCheckedChange={(c) => handleToggleAll(c === true)}
            />
            <Label htmlFor="select-all-perms" className="font-semibold">
              {t('selectAllPermissions')}
            </Label>
            <span className="text-muted-foreground ml-auto text-xs">
              {t('selectedCount', {
                param: `${selectedIds.length} / ${allPermissions.length}`,
              })}
            </span>
          </div>
          <ScrollArea className="h-[300px] flex-1 rounded-md border p-4 md:h-[400px]">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="text-primary h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {allPermissions.map((perm) => {
                  const pid = perm.id!.toString()
                  return (
                    <div
                      key={pid}
                      className="hover:bg-muted/50 flex items-start space-x-3 rounded p-2 transition"
                    >
                      <Checkbox
                        id={`perm-${pid}`}
                        checked={selectedIds.includes(pid)}
                        onCheckedChange={(c) =>
                          handleToggleSingle(pid, c === true)
                        }
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor={`perm-${pid}`}
                          className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {locale === 'zh' ? perm.title : perm.controller}
                        </Label>
                        {locale === 'zh' && (
                          <p className="text-muted-foreground text-xs">
                            {perm.controller}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
                {allPermissions.length === 0 && (
                  <div className="text-muted-foreground col-span-2 py-10 text-center">
                    {t('noPermissions')}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={onSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('saveConfig')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
