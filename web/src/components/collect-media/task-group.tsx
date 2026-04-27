import { DownloadTask } from '@/api/generatedSchemas'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileVideo, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

// 根据series分组下载任务列表
const groups = (tasks: DownloadTask[]) => {
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

export default function TaskGroup({ tasks }: { tasks: DownloadTask[] }) {
  const t = useTranslations('CollectMediaPage')

  const currentTasks = useMemo(() => groups(tasks), [tasks])

  return (
    <ScrollArea className="h-[calc(100vh-200px)] pr-4">
      {currentTasks.length === 0 ? (
        // 无媒体时显示
        <div className="bg-muted flex flex-col items-center justify-center space-y-2 rounded-md border p-8">
          <Search className="text-muted-foreground h-8 w-8" />
          <p className="text-muted-foreground text-sm">{t('noMedia')}</p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          key={currentTasks.length}
          defaultValue={currentTasks.map((x) => x.series || '')}
          className="space-y-4"
        >
          {currentTasks.map((series) => {
            if (series == undefined || series.items.length == 0) return null
            // 展示单个系列
            return (
              <AccordionItem
                key={series.series}
                value={series.series ?? ''}
                className="bg-card overflow-hidden rounded-lg border shadow-sm"
              >
                {/*折叠区域标题*/}
                <AccordionTrigger className="hover:bg-accent/50 px-4 py-3 transition-all hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold">{series.series}</span>
                    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px]">
                      {series.items.length} items
                    </span>
                  </div>
                </AccordionTrigger>
                {/*折叠区域内容*/}
                <AccordionContent className="px-3 pb-4">
                  <div className="space-y-3">
                    {series.items.map((item) => (
                      <Card
                        key={item.media.originalPath}
                        className="flex w-full flex-col border"
                      >
                        <CardHeader>
                          <CardTitle title={item.media.episode}>
                            <div className="inline-flex items-center gap-2">
                              <FileVideo className="text-primary h-4 w-4" />
                              {item.media.episode}
                            </div>
                          </CardTitle>
                          <CardDescription>
                            <div>{item.media.originalPath}</div>
                          </CardDescription>
                        </CardHeader>

                        <CardContent>
                          <Field className="w-full">
                            <FieldLabel htmlFor="progress-upload">
                              <span>
                                {t(`taskStatus${item.status}` as never)}
                              </span>
                              <span className="ml-auto">
                                {Number(item.progress).toFixed(1)}%
                              </span>
                            </FieldLabel>
                            <Progress
                              value={Number(item.progress)}
                              id="progress-upload"
                            />
                          </Field>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </ScrollArea>
  )
}
