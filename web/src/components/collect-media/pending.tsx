import {
  CollectedMedia,
  PendingSeries,
  SonarrEpisode,
} from '@/api/generatedSchemas'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { openapi } from '@/lib/http'
import {
  CircleCheck,
  Download,
  FileVideo,
  HardDrive,
  Loader,
  Search,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// 支持的文件类型列表
const FILE_TYPE_LIST = [
  { label: 'MP4', value: '.mp4' },
  { label: 'MKV', value: '.mkv' },
  { label: 'AVI', value: '.avi' },
]

// 格式化字节
const formatBytes = (bytes: number | undefined) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化剧集名称 SxxExx
const formatEpisode = (seasonNumber: number, episodeNumber: number) => {
  return `S${String(seasonNumber).padStart(2, '0')}E${String(
    episodeNumber,
  ).padStart(2, '0')}`
}

// 获取默认扩展名，不在列表中的默认返回 .mp4
const getDefaultExt = (extension: string = '') => {
  const ext = extension.toLowerCase()
  return FILE_TYPE_LIST.some((f) => f.value === ext) ? ext : '.mp4'
}

// 获取默认剧集名称，无法匹配时手动选择
const getDefaultEpisode = (
  missing: SonarrEpisode[] | undefined,
  name: string,
  mediaCount: number,
) => {
  let result = ''
  // 名称中包含SxxExx的格式
  const standardName = missing
    ? missing.map((ep) =>
        formatEpisode(Number(ep.seasonNumber), Number(ep.episodeNumber)),
      )
    : []
  standardName.forEach((ep) => {
    if (name.toLowerCase().includes(ep.toLowerCase())) {
      result = ep
      return result
    }
  })
  // 名称中包含Episode中title相似的部分
  if (missing) {
    missing.forEach((ep) => {
      if (ep.title && name.toLowerCase().includes(ep.title.toLowerCase())) {
        result = formatEpisode(
          Number(ep.seasonNumber),
          Number(ep.episodeNumber),
        )
        return result
      }
    })
  }
  // 如果该系列只有一个media，那么直接匹配第一个缺失剧集
  if (mediaCount === 1 && missing && missing.length > 0) {
    const ep = missing[0]
    result = formatEpisode(Number(ep!.seasonNumber), Number(ep!.episodeNumber))
    return result
  }
  // 默认返回
  return result
}

export default function Pending() {
  const t = useTranslations('CollectMediaPage')
  const [loading, setLoading] = useState(false)
  // 待处理的系列
  const [pendingSeries, setPendingSeries] = useState<
    PendingSeries[] | undefined
  >(undefined)
  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await openapi.GET('/CollectMedia/PendingSeries')
      data?.forEach((series) => {
        series?.medias?.forEach((media) => {
          media.fileType = getDefaultExt(media.fileType)
          media.episode = getDefaultEpisode(
            series.missingEpisodes,
            media.episode || '',
            series.medias?.length || 0,
          )
        })
      })
      setPendingSeries(data)
      setLoading(false)
    }
    fetch().then()
  }, [])

  // 处理标记完成
  const handleMarkComplete = async (medias: CollectedMedia[]) => {
    const { error } = await openapi.POST('/CollectMedia/AddCompleteTask', {
      body: medias,
    })
    if (!error) {
      toast.success(t('addCompleteTaskSuccess'))
      // 从待处理列表中移除已标记完成的媒体
      setPendingSeries((prev) =>
        prev
          ? prev
              .map((series) => ({
                ...series,
                medias: series.medias?.filter(
                  (m) =>
                    !medias.some(
                      (media) => media.originalPath === m.originalPath,
                    ),
                ),
              }))
              .filter((series) => (series.medias?.length ?? 0) > 0)
          : prev,
      )
    }
  }

  // 处理下载
  const handleDownload = async (media: CollectedMedia) => {
    if (media.episode?.length === 0 || media.fileType?.length === 0) {
      toast.warning(t('selectEpisodeAndType'))
      return
    }
    const { error } = await openapi.POST('/CollectMedia/AddDownloadTask', {
      body: [media],
    })
    if (!error) {
      toast.success(t('addDownloadTaskSuccess'))
      // 从待处理列表中移除已添加的媒体
      setPendingSeries((prev) =>
        prev
          ? prev
              .map((series) => ({
                ...series,
                medias: series.medias?.filter(
                  (m) => m.originalPath !== media.originalPath,
                ),
              }))
              .filter((series) => (series.medias?.length ?? 0) > 0)
          : prev,
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
      {pendingSeries === undefined || pendingSeries.length === 0 ? (
        // 无待处理媒体时显示
        <div className="bg-muted flex flex-col items-center justify-center space-y-2 rounded-md border p-8">
          <Search className="text-muted-foreground h-8 w-8" />
          <p className="text-muted-foreground text-sm">{t('noPendingMedia')}</p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          key={pendingSeries.length}
          defaultValue={pendingSeries.map((x) => x.series?.title || '')}
          className="space-y-4"
        >
          {pendingSeries.map((series) => {
            if (
              series == undefined ||
              series.series == undefined ||
              series.medias == undefined ||
              series.missingEpisodes == undefined
            )
              return null
            // 展示单个系列
            return (
              <AccordionItem
                key={series.series.title}
                value={series.series.title ?? ''}
                className="bg-card overflow-hidden rounded-lg border shadow-sm"
              >
                {/*折叠区域标题*/}
                <AccordionTrigger className="hover:bg-accent/50 px-4 py-3 transition-all hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold">
                      {series.series.title}
                    </span>
                    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px]">
                      {series.medias.length} items
                    </span>
                    {/* 标记为完成按钮 */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkComplete(series.medias ?? []).then()
                      }}
                    >
                      <CircleCheck className="h-4 w-4" />
                    </Button>
                  </div>
                </AccordionTrigger>
                {/*折叠区域内容*/}
                <AccordionContent className="px-3 pb-4">
                  <div className="space-y-3">
                    {series.medias.map((media) => (
                      <Card
                        key={media.originalPath}
                        className="flex w-full flex-col border"
                      >
                        <CardHeader>
                          <CardTitle title={media.originalPath}>
                            {/* 文件路径最后一部分 */}
                            <div className="inline-flex items-center gap-2">
                              <FileVideo className="text-primary h-4 w-4" />
                              {media.originalPath?.split('/').slice(-1)[0]}
                            </div>
                          </CardTitle>
                          <CardDescription>
                            <div>
                              {/* 文件路径与大小 */}
                              {media.originalPath}
                              <div className="flex items-center gap-4">
                                <HardDrive className="text-muted-foreground h-4 w-4" />
                                {formatBytes(Number(media.fileSize))}
                              </div>
                            </div>
                          </CardDescription>
                        </CardHeader>

                        <CardContent>
                          <div className="flex gap-2">
                            {/*剧集选择*/}
                            <Select
                              defaultValue={media.episode}
                              onValueChange={(value) => (media.episode = value)}
                            >
                              <SelectTrigger className="max-w-50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {series.missingEpisodes!.map((ep) => (
                                  <SelectItem
                                    key={formatEpisode(
                                      Number(ep.seasonNumber),
                                      Number(ep.episodeNumber),
                                    )}
                                    value={formatEpisode(
                                      Number(ep.seasonNumber),
                                      Number(ep.episodeNumber),
                                    )}
                                  >
                                    {`${formatEpisode(Number(ep.seasonNumber), Number(ep.episodeNumber))} ${ep.title}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* 类型选择 */}
                            <Select
                              defaultValue={media.fileType}
                              onValueChange={(value) =>
                                (media.fileType = value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FILE_TYPE_LIST.map((type) => (
                                  <SelectItem
                                    key={type.value}
                                    value={type.value}
                                  >
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>

                        <CardFooter className="justify-end space-x-2">
                          {/* 标记为完成按钮 */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkComplete([media]).then()
                            }}
                          >
                            <CircleCheck className="h-4 w-4" />
                          </Button>

                          {/* 下载按钮 */}
                          <Button
                            variant="default"
                            size="sm"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownload(media).then()
                            }}
                          >
                            <Download className="h-4 w-4" />
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
