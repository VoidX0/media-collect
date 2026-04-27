'use client'

import { DownloadTask } from '@/api/generatedSchemas'
import Pending from '@/components/collect-media/pending'
import Processing from '@/components/collect-media/processing'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { openapi } from '@/lib/http'
import { LayoutList, ListChecks, ListTodo } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

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
  // 激活的标签页
  const [activeTab, setActiveTab] = useState('pending')
  // 根据下载任务状态确定默认标签页
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

        <TabsContent value="processing">
          <Processing allTasks={allTasks ?? []} />
        </TabsContent>

        <TabsContent value="completed"></TabsContent>
      </Tabs>
    </div>
  )
}
