'use client'

import { DownloadTask } from '@/api/generatedSchemas'
import History from '@/components/collect-media/history'
import Pending from '@/components/collect-media/pending'
import TaskGroup from '@/components/collect-media/task-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { openapi } from '@/lib/http'
import { History as HistoryIcon, LayoutList, ListChecks, ListTodo } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

export default function Page() {
  const t = useTranslations('CollectMediaPage')
  // 全局下载任务
  const [allTasks, setAllTasks] = useState<DownloadTask[] | undefined>(
    undefined,
  )
  useEffect(() => {
    const fetch = async () => {
      const { data } = await openapi.GET('/CollectMedia/DownloadTasks')
      setAllTasks(data)
    }
    fetch().then()
  }, [])
  const processedTasks = useMemo(
    () =>
      allTasks?.filter(
        (t) => t.status === 1 || t.status === 2 || t.status === 3,
      ) ?? [],
    [allTasks],
  )
  const completedTasks = useMemo(
    () => allTasks?.filter((t) => t.status === 4 || t.status === 5) ?? [],
    [allTasks],
  )
  // 激活的标签页
  const [activeTab, setActiveTab] = useState('pending')
  useEffect(() => {
    if (!allTasks) return
    // 准备中、下载中、处理中
    if (
      allTasks.filter((t) => t.status === 1 || t.status === 2 || t.status === 3)
        .length > 0
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('processing')
    } else {
      setActiveTab('pending')
    }
  }, [allTasks])

  return (
    <div className="max-w-8xl mx-auto w-full space-y-8 p-8">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="flex h-auto w-full justify-start overflow-x-auto overflow-y-hidden bg-transparent p-1 whitespace-nowrap">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <LayoutList className="h-4 w-4" /> {t('pending')}
          </TabsTrigger>
          <TabsTrigger value="processing" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" /> {t('processing')}(
            {processedTasks?.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> {t('completed')}(
            {completedTasks?.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" /> {t('history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Pending />
        </TabsContent>

        <TabsContent value="processing">
          <TaskGroup tasks={processedTasks} />
        </TabsContent>

        <TabsContent value="completed">
          <TaskGroup tasks={completedTasks} />
        </TabsContent>

        <TabsContent value="history">
          <History />
        </TabsContent>
      </Tabs>
    </div>
  )
}
