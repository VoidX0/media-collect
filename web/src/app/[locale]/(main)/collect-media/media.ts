import { CollectedMedia, QueryDto } from '@/api/generatedSchemas'
import { openapi } from '@/lib/http'

// 获取已处理完成的媒体列表
export const getMedias = async (): Promise<CollectedMedia[]> => {
  const body: QueryDto = {
    pageNumber: 1,
    pageSize: 999999999,
    order: [{ fieldName: 'EndTime', orderByType: 1 }],
  }
  const { data } = await openapi.POST('/CollectMedia/Query', { body })
  return data?.items || []
}

// 根据series分组下载媒体列表
export const groups = (medias: CollectedMedia[]) => {
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
