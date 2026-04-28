import { CollectedMedia, QueryDto } from '@/api/generatedSchemas'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDateTime } from '@/lib/date-time'
import { openapi } from '@/lib/http'
import { Loader, Search, Undo } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

// 根据series分组下载媒体列表
const groups = (medias: CollectedMedia[]) => {
  const seriesMap: Record<string, CollectedMedia[]> = {}
  medias.forEach((t) => {
    const series = t.series || 'unknown'
    if (!seriesMap[series]) seriesMap[series] = []
    seriesMap[series].push(t)
  })
  return Object.entries(seriesMap).map(([series, items]) => ({
    series,
    items,
  }))
}

export default function History() {
  const t = useTranslations('CollectMediaPage')
  const [loading, setLoading] = useState(false)
  // 加载已处理完成的媒体
  const [medias, setMedias] = useState<CollectedMedia[] | undefined>([])
  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const body: QueryDto = {
        pageNumber: 1,
        pageSize: 999999999,
        order: [{ fieldName: 'EndTime', orderByType: 1 }],
      }
      const { data } = await openapi.POST('/CollectMedia/Query', { body })
      setMedias(data?.items)
      setLoading(false)
    }
    fetch().then()
  }, [])
  const mediaGroups = useMemo(() => groups(medias ?? []), [medias])

  // 处理重做
  const handleRedo = async (medias: CollectedMedia[]) => {
    const { error } = await openapi.DELETE('/CollectMedia/RemoveCompleteTask', {
      body: medias,
    })
    if (!error) {
      toast.success(t('redoMediaSuccess'))
      // 从列表中移除媒体
      setMedias((prev) =>
        prev?.filter(
          (m) => !medias.some((rm) => rm.originalPath === m.originalPath),
        ),
      )
    }
  }

  if (loading) {
    return (
      <div className="bg-muted flex animate-pulse flex-col items-center justify-center space-y-2 rounded-md border p-8">
        <Loader className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[calc(100vh-200px)] pr-4">
      {mediaGroups.length === 0 ? (
        // 无媒体时显示
        <div className="bg-muted flex flex-col items-center justify-center space-y-2 rounded-md border p-8">
          <Search className="text-muted-foreground h-8 w-8" />
          <p className="text-muted-foreground text-sm">{t('noMedia')}</p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          key={mediaGroups.length}
          defaultValue={mediaGroups.map((x) => x.series || '')}
          className="space-y-4"
        >
          {mediaGroups.map((series) => {
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
                        key={item.originalPath}
                        className="flex w-full flex-col border"
                      >
                        <CardHeader>
                          <CardTitle title={item.originalPath}>
                            {item.originalPath}
                          </CardTitle>
                          <CardDescription></CardDescription>
                        </CardHeader>

                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                            <div className="flex flex-col">
                              <span className="text-muted-foreground text-sm">
                                {t('labelEpisode')}
                              </span>
                              <span>{item.episode}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground text-sm">
                                {t('labelElapsed')}
                              </span>
                              <span>
                                {(
                                  (Number(item.endTime) -
                                    Number(item.startTime)) /
                                  1000
                                ).toFixed(2)}{' '}
                                s
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground text-sm">
                                {t('labelType')}
                              </span>
                              <span>{item.fileType}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground text-sm">
                                {t('labelSize')}
                              </span>
                              <span>
                                {(
                                  Number(item.fileSize) /
                                  1024 /
                                  1024 /
                                  1024
                                ).toFixed(2)}{' '}
                                GB
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground text-sm">
                                {t('labelStart')}
                              </span>
                              <span>
                                {formatDateTime(
                                  new Date(Number(item.startTime)),
                                )}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground text-sm">
                                {t('labelEnd')}
                              </span>
                              <span>
                                {formatDateTime(new Date(Number(item.endTime)))}
                              </span>
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className="justify-end space-x-2">
                          {/* 重做按钮 */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRedo([item]).then()
                            }}
                          >
                            <Undo className="h-4 w-4" />
                          </Button>
                        </CardFooter>
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
