'use client'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { openapi } from '@/lib/http'
import {
  CheckLine,
  FilePlay,
  FileSpreadsheet,
  FileStack,
  Loader,
  Trash,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function Page() {
  const t = useTranslations('CleanupPage')
  const [seriesTrash, setSeriesTrash] = useState<string[] | undefined>(
    undefined,
  )
  const [seriesSubtitleTrash, setSeriesSubtitleTrash] = useState<
    string[] | undefined
  >(undefined)
  const [mergeSubtitle, setMergeSubtitle] = useState<string[] | undefined>(
    undefined,
  )
  useEffect(() => {
    const fetch = async () => {
      const [seriesTrashData, seriesSubtitleTrashData, mergeSubtitle] =
        await Promise.all([
          openapi.GET('/Cleanup/SeriesTrash'),
          openapi.GET('/Cleanup/SeriesSubtitleTrash'),
          openapi.GET('/Cleanup/MergeSubtitle'),
        ])
      setSeriesTrash(seriesTrashData.data)
      setSeriesSubtitleTrash(seriesSubtitleTrashData.data)
      setMergeSubtitle(mergeSubtitle.data)
    }
    fetch().then()
  }, [])

  const handleDeleteSeriesTrash = async () => {
    const { error } = await openapi.DELETE('/Cleanup/DeleteSeriesTrash')
    if (!error) {
      toast.success(t('deleteSeriesTrashSuccess'))
      setSeriesTrash([])
    }
  }

  const handleDeleteSeriesSubtitleTrash = async () => {
    const { error } = await openapi.DELETE('/Cleanup/DeleteSeriesSubtitleTrash')
    if (!error) {
      toast.success(t('deleteSeriesSubtitleTrashSuccess'))
      setSeriesSubtitleTrash([])
    }
  }

  if (!seriesTrash || !seriesSubtitleTrash || !mergeSubtitle) {
    return (
      <div className="max-w-8xl mx-auto w-full space-y-8 p-8">
        <div className="bg-muted flex animate-pulse flex-col items-center justify-center space-y-2 rounded-md border p-8">
          <Loader className="text-muted-foreground h-8 w-8" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-8xl mx-auto w-full space-y-8 p-8">
      <Tabs className="space-y-4" defaultValue="seriesTrash">
        <TabsList className="flex h-auto w-full justify-start overflow-x-auto overflow-y-hidden bg-transparent p-1 whitespace-nowrap">
          <TabsTrigger value="seriesTrash" className="flex items-center gap-2">
            <FilePlay className="h-4 w-4" /> {t('seriesTrash')} (
            {seriesTrash.length})
          </TabsTrigger>
          <TabsTrigger
            value="seriesSubtitleTrash"
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" /> {t('seriesSubtitleTrash')} (
            {seriesSubtitleTrash.length})
          </TabsTrigger>
          <TabsTrigger
            value="mergeSubtitle"
            className="flex items-center gap-2"
            disabled={mergeSubtitle.length === 0}
          >
            <FileStack className="h-4 w-4" /> {t('mergeSubtitle')} (
            {mergeSubtitle.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="seriesTrash" className="space-y-4">
          <Button
            variant="outline"
            disabled={seriesTrash.length === 0}
            onClick={handleDeleteSeriesTrash}
          >
            <Trash />
            {seriesTrash.length} items
          </Button>
          {seriesTrash.length === 0 ? (
            <div className="bg-muted flex flex-col items-center justify-center space-y-2 rounded-md border p-8">
              <CheckLine className="text-muted-foreground h-8 w-8" />
            </div>
          ) : (
            <div className="space-y-4">
              {seriesTrash.map((series) => (
                <div key={series} className="bg-muted rounded-md border p-4">
                  <p className="text-sm">{series}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="seriesSubtitleTrash" className="space-y-4">
          <Button
            variant="outline"
            disabled={seriesSubtitleTrash.length === 0}
            onClick={handleDeleteSeriesSubtitleTrash}
          >
            <Trash />
            {seriesSubtitleTrash.length} items
          </Button>
          {seriesSubtitleTrash.length === 0 ? (
            <div className="bg-muted flex flex-col items-center justify-center space-y-2 rounded-md border p-8">
              <CheckLine className="text-muted-foreground h-8 w-8" />
            </div>
          ) : (
            <div className="space-y-4">
              {seriesSubtitleTrash.map((subtitle) => (
                <div key={subtitle} className="bg-muted rounded-md border p-4">
                  <p className="text-sm">{subtitle}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mergeSubtitle" className="space-y-4">
          {mergeSubtitle.length === 0 ? (
            <div className="bg-muted flex flex-col items-center justify-center space-y-2 rounded-md border p-8">
              <CheckLine className="text-muted-foreground h-8 w-8" />
            </div>
          ) : (
            <div className="space-y-4">
              {mergeSubtitle.map((subtitle) => (
                <div key={subtitle} className="bg-muted rounded-md border p-4">
                  <p className="text-sm">{subtitle}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
