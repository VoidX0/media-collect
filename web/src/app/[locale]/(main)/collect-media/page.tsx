'use client'

import { DownloadTask } from '@/api/generatedSchemas'
import Pending from '@/components/collect-media/pending'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { openapi } from '@/lib/http'
import { LayoutList, ListChecks, ListTodo } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

// 根据series分组下载任务列表
const taskGroups = (tasks: DownloadTask[]) => {
  const seriesMap: Record<string, DownloadTask[]> = {}
  tasks.forEach((t) => {
    const series = t.media.series || 'unknown'
    if (!seriesMap[series]) seriesMap[series] = []
    seriesMap[series].push(t)
  })
  return Object.entries(seriesMap).map(([series, items]) => ({
    series,
    items,
  }))
}

export default function Page() {
  const t = useTranslations('CollectMediaPage')
  // 全局下载任务
  const [processingTasks, setProcessingTasks] = useState<
    DownloadTask[] | undefined
  >(undefined)
  useEffect(() => {
    const fetch = async () => {
      const { data } = await openapi.GET('/CollectMedia/DownloadTasks')
      setProcessingTasks(data)
    }
    fetch().then()
  }, [])
  const downloading = useMemo(() => {
    if (!processingTasks) return []
    const tasks = processingTasks.filter((t) => t.status === 2)
    return taskGroups(tasks)
  }, [processingTasks])
  const completed = useMemo(() => {
    if (!processingTasks) return []
    const tasks = processingTasks.filter(
      (t) => t.status === 3 || t.status === 4,
    )
    return taskGroups(tasks)
  }, [processingTasks])

  return (
    <div className="max-w-8xl mx-auto w-full space-y-8 p-8">
      <Tabs
        defaultValue={downloading.length > 0 ? 'processing' : 'pending'}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <LayoutList className="h-4 w-4" /> {t('pending')}
          </TabsTrigger>
          <TabsTrigger value="processing" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" /> {t('processing')}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> {t('completed')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Pending />
        </TabsContent>

        <TabsContent value="processing"></TabsContent>

        <TabsContent value="completed"></TabsContent>
      </Tabs>
    </div>
  )
}
