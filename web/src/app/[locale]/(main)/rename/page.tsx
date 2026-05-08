'use client'

import { RenamePreview } from '@/api/generatedSchemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { openapi } from '@/lib/http'
import { CheckLine } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

export default function Page() {
  const t = useTranslations('RenamePage')
  const [config, setConfig] = useState({
    targetDir: '/media/动漫/test',
    regex: '(\\d+)',
    template: 'Anime_E{ep}',
    offset: 0,
    padding: 2,
    extensions: 'mp4,mkv,avi',
  })
  const [preview, setPreview] = useState<RenamePreview[] | null>(null)

  // 获取重命名预览
  const handlePreview = async () => {
    const extList = config.extensions.split(',').map((e) => e.trim())
    const { data, error } = await openapi.POST('/Rename/PreviewRename', {
      body: {
        targetDir: config.targetDir,
        regexPattern: config.regex,
        template: config.template,
        extensions: extList,
        offset: Number(config.offset),
        padding: Number(config.padding),
      },
    })
    if (error) {
      toast.error(t('errorPreview'))
      return
    }
    setPreview(data || [])
  }

  // 执行重命名
  const handleExecute = async () => {
    const items = preview?.filter((p) => p.status === '✅ 待重命名') ?? []
    if (items.length === 0) return

    const { error } = await openapi.POST('/Rename/ExecuteRename', {
      body: {
        targetDir: config.targetDir,
        items: items,
      },
    })

    if (error) return
    await handlePreview()
  }

  return (
    <div className="space-y-6 p-8">
      {/* 配置区域 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('targetDir')}</Label>
          <Input
            value={config.targetDir}
            onChange={(e) =>
              setConfig({ ...config, targetDir: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>{t('regex')}</Label>
          <Input
            value={config.regex}
            onChange={(e) => setConfig({ ...config, regex: e.target.value })}
          />
          <p className="text-muted-foreground text-xs">{t('regexHelp')}</p>
        </div>
        <div className="space-y-2">
          <Label>{t('template')}</Label>
          <Input
            value={config.template}
            onChange={(e) => setConfig({ ...config, template: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('extensions')}</Label>
          <Input
            value={config.extensions}
            onChange={(e) =>
              setConfig({ ...config, extensions: e.target.value })
            }
          />
        </div>
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label>{t('offset')}</Label>
            <Input
              type="number"
              value={config.offset}
              onChange={(e) =>
                setConfig({ ...config, offset: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label>{t('padding')}</Label>
            <Input
              type="number"
              value={config.padding}
              onChange={(e) =>
                setConfig({ ...config, padding: Number(e.target.value) })
              }
            />
          </div>
          <Button onClick={handlePreview}>{t('preview')}</Button>
          <Button
            onClick={handleExecute}
            variant="secondary"
            disabled={!preview || preview.length === 0}
          >
            {t('execute')}
          </Button>
        </div>
      </div>

      {/* 表格区域 */}
      <div className="rounded-md border p-4">
        {preview === null ? (
          <div className="text-muted-foreground py-8 text-center">
            {t('noData')}
          </div>
        ) : preview.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-8">
            <CheckLine className="text-muted-foreground h-8 w-8" />
            <p>{t('noResult')}</p>
          </div>
        ) : (
          <Table>
            <TableBody>
              {preview.map((row) => (
                <TableRow key={row.oldName}>
                  <TableCell className="max-w-75 truncate">
                    {row.oldName}
                  </TableCell>
                  <TableCell>→</TableCell>
                  <TableCell className="max-w-75 truncate font-bold">
                    {row.newName}
                  </TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
