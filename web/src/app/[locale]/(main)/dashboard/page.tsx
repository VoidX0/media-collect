'use client'

import { CollectedMedia, DanmuCoverage } from '@/api/generatedSchemas'
import { getMedias } from '@/app/[locale]/(main)/collect-media/media'
import UniversalChart from '@/components/chart/universal-chart'
import { formatDate } from '@/lib/date-time'
import { openapi } from '@/lib/http'
import { EChartsOption } from 'echarts'
import { BarChart, HeatmapChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import { VisualMapComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { Loader } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { resolveColor } from '@/lib/echarts/dynamic-theme'
import Autoplay from 'embla-carousel-autoplay'

echarts.use([
  LineChart,
  PieChart,
  BarChart,
  ScatterChart,
  HeatmapChart,
  VisualMapComponent,
])

/** 提取通用的基础配置 */
const COMMON_CHART_CONFIG = {
  grid: {
    left: '3%',
    right: '3%',
    top: '10%',
    bottom: '10%',
    containLabel: true,
  },
  legend: {
    bottom: -5,
    type: 'scroll' as const,
  },
}

export default function Page() {
  const t = useTranslations('DashboardPage')
  const [loading, setLoading] = useState(false)
  // 已处理完成的媒体
  const [medias, setMedias] = useState<CollectedMedia[] | undefined>([])
  // 弹幕覆盖率信息
  const [danmuCoverage, setDanmuCoverage] = useState<
    DanmuCoverage[] | undefined
  >()

  // 初始化 Autoplay 插件，配置延迟
  const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }))

  // 加载数据
  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const [mediaRes, coverageRes] = await Promise.all([
        getMedias(),
        openapi.GET('/CollectMedia/DanmuCoverage'),
      ])

      setMedias(mediaRes.filter((m) => Number(m.episode?.length) > 0))
      setDanmuCoverage(coverageRes.data)
      setLoading(false)
    }
    fetch().then()
  }, [])

  // 1. 处理趋势图
  const optionsByDay = useMemo(() => {
    if (!medias?.length) return {}
    const dateSeriesMap: Record<string, Record<string, number>> = {}
    const allSeries = new Set<string>()
    const allDates = new Set<string>()

    medias.forEach((item) => {
      if (!item.endTime) return
      const date = formatDate(new Date(Number(item.endTime)))
      const seriesName = item.series || 'Unknown'
      allDates.add(date)
      allSeries.add(seriesName)
      if (!dateSeriesMap[date]) dateSeriesMap[date] = {}
      dateSeriesMap[date][seriesName] =
        (dateSeriesMap[date][seriesName] || 0) + 1
    })

    const sortedDates = Array.from(allDates).sort()
    const seriesList = Array.from(allSeries)
    const datasetSource = [
      ['date', ...seriesList],
      ...sortedDates.map((date) => [
        date,
        ...seriesList.map((s) => dateSeriesMap[date]![s] || 0),
      ]),
    ]

    return {
      ...COMMON_CHART_CONFIG,
      tooltip: {
        trigger: 'axis',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const filtered = params.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (item: any) => item.value[item.encode.y[0]] > 0,
          )
          if (!filtered.length) return ''
          const dateTitle = formatDate(new Date(params[0].axisValue))
          let res = `${dateTitle}<br/>`
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filtered.forEach((item: any) => {
            res += `${item.marker} ${item.seriesName}: <b>${item.value[item.encode.y[0]]}</b><br/>`
          })
          return res
        },
      },
      dataset: { source: datasetSource },
      xAxis: { type: 'time', boundaryGap: false },
      yAxis: { type: 'value' },
      dataZoom: [{ type: 'inside' }],
      series: seriesList.map((name) => ({
        type: 'line',
        name,
        stack: 'Total',
        areaStyle: {},
        smooth: true,
        emphasis: { focus: 'series' },
        encode: { x: 'date', y: name },
      })),
    } as unknown as EChartsOption
  }, [medias])

  // 2. 存储占用环形图
  const storageOption = useMemo(() => {
    if (!medias?.length) return {}
    const map: Record<string, number> = {}
    medias.forEach((item) => {
      const name = item.series || 'Unknown'
      map[name] = (map[name] || 0) + (Number(item.fileSize) || 0)
    })
    const data = Object.entries(map)
      .map(([name, value]) => ({
        name,
        value: Number((value / 1024 ** 3).toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} GB ({d}%)' },
      legend: COMMON_CHART_CONFIG.legend,
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 8, borderWidth: 2 },
          label: { show: false },
          data,
        },
      ],
    } as EChartsOption
  }, [medias])

  // 3. 文件类型占比环形图
  const fileTypeOption = useMemo(() => {
    if (!medias?.length) return {}
    const map: Record<string, number> = {}
    medias.forEach((item) => {
      const type = item.fileType || 'Unknown'
      map[type] = (map[type] || 0) + 1
    })
    return {
      tooltip: { trigger: 'item' },
      legend: COMMON_CHART_CONFIG.legend,
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          itemStyle: { borderRadius: 8, borderWidth: 2 },
          label: { show: false },
          data: Object.entries(map).map(([name, value]) => ({ name, value })),
        },
      ],
    } as EChartsOption
  }, [medias])

  // 4. 耗时分析图 (散点图)
  const durationOption = useMemo(() => {
    if (!medias?.length) return {}
    const data = medias
      .filter((item) => item.startTime && item.endTime)
      .map((item) => [
        new Date(Number(item.startTime)).getTime(),
        Math.max(
          0,
          (new Date(Number(item.endTime)).getTime() -
            new Date(Number(item.startTime)).getTime()) /
            1000,
        ),
        item.series || 'Unknown',
      ])

    return {
      ...COMMON_CHART_CONFIG,
      tooltip: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const val = params.value
          return `${val[2]}<br/>${val[1] > 60 ? (val[1] / 60).toFixed(1) + 'm' : val[1] + 's'}`
        },
      },
      xAxis: { type: 'time' },
      yAxis: { type: 'value', name: 'Seconds' },
      dataZoom: [{ type: 'inside' }],
      series: [
        { type: 'scatter', symbolSize: 8, data, itemStyle: { opacity: 0.6 } },
      ],
    } as EChartsOption
  }, [medias])

  // 5. 系列更新进度 (水平柱状图)
  const seriesProgressOption = useMemo(() => {
    if (!medias?.length) return {}
    const map: Record<string, number> = {}
    medias.forEach((item) => {
      const name = item.series || 'Unknown'
      map[name] = (map[name] || 0) + 1
    })
    const data = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reverse()

    return {
      ...COMMON_CHART_CONFIG,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: data.map((d) => d[0]) },
      series: [
        {
          type: 'bar',
          data: data.map((d) => d[1]),
          itemStyle: { borderRadius: [0, 4, 4, 0] },
        },
      ],
    } as EChartsOption
  }, [medias])

  // 6. 弹幕覆盖率热力图组
  const danmuHeatmapOptions = useMemo(() => {
    if (!danmuCoverage?.length) return []

    return danmuCoverage
      .map((coverage) => {
        const { series, episodes } = coverage as DanmuCoverage
        if (!episodes || episodes.length === 0) return null

        let xAxisData: string[] = []
        let yAxisData: string[] = []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const heatmapData: any[] = []

        const totalEpisodes = episodes.length
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const coveredEpisodes = episodes.filter((e: any) => e.haveDanmu).length
        // 通过第一集判断是否属于电影
        const isMovieType = episodes[0]?.isMovie

        if (isMovieType) {
          // --- 电影模式 ---
          yAxisData = [''] // Y轴留空，单行展示
          // X轴使用 title
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          xAxisData = episodes.map((e: any) => e.title || 'Unknown')

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          episodes.forEach((e: any, xIndex: number) => {
            // 数据格式：[x坐标, y坐标, 数值(0/1), 额外数据(如title)]
            heatmapData.push([xIndex, 0, e.haveDanmu ? 1 : 0, e.title])
          })
        } else {
          // --- 剧集模式 ---
          // 提取所有唯一季数并排序作为Y轴
          const seasons = Array.from(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new Set(episodes.map((e: any) => e.season)),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ).sort((a: any, b: any) => a - b)

          // 提取所有唯一集数并排序作为X轴
          const eps = Array.from(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new Set(episodes.map((e: any) => e.episode)),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ).sort((a: any, b: any) => a - b)

          yAxisData = seasons.map((s) => `Season ${s}`)
          xAxisData = eps.map((e) => `${e}`)

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          episodes.forEach((e: any) => {
            const xIndex = eps.indexOf(e.episode)
            const yIndex = seasons.indexOf(e.season)
            // 将 title 作为第4个参数携带进去，供 Tooltip 使用
            heatmapData.push([xIndex, yIndex, e.haveDanmu ? 1 : 0, e.title])
          })
        }

        // 计算覆盖率百分比
        const percentage =
          totalEpisodes === 0
            ? 0
            : Math.round((coveredEpisodes / totalEpisodes) * 100)
        const title = `${series} (${percentage}%)`

        const option: EChartsOption = {
          ...COMMON_CHART_CONFIG,
          legend: undefined,
          tooltip: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (params: any) => {
              // params.data 即为我们 push 进去的数组 [x, y, value, title]
              const isCovered = params.data[2] === 1
              const epTitle = params.data[3] || ''
              // 直接展示后端返回的完整 title，体验更好
              return `${epTitle} <br/> <b>${isCovered ? t('haveCoverage') : t('noCoverage')}</b>`
            },
          },
          xAxis: {
            type: 'category',
            data: xAxisData,
            splitArea: { show: true },
          },
          yAxis: {
            type: 'category',
            data: yAxisData,
            // 剧集类型翻转Y轴让第一季在上方，单行电影不需要翻转
            inverse: !isMovieType,
          } as unknown as EChartsOption['yAxis'],
          visualMap: {
            min: 0,
            max: 1,
            dimension: 2, // 根据 heatmapData 中的第3个元素（覆盖状态）进行映射
            calculable: false,
            show: false, // 隐藏图例
          },
          series: [
            {
              name: t('danmuCoverage'),
              type: 'heatmap',
              data: heatmapData,
              label: { show: false },
              itemStyle: {
                borderColor: resolveColor('--border'),
                borderWidth: 1,
                borderRadius: 2,
              },
              emphasis: {
                itemStyle: {
                  borderColor: resolveColor('--border'),
                  borderWidth: 2,
                  shadowBlur: 5,
                },
              },
            },
          ],
        }

        return { title, option }
      })
      .filter(Boolean) as { title: string; option: EChartsOption }[] // 过滤掉空数据
  }, [danmuCoverage, t])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-8xl mx-auto w-full space-y-8 p-8">
      {/* 趋势图 - 全宽 */}
      <UniversalChart
        title={t('mediaTrend')}
        option={optionsByDay}
        height="300px"
      />

      {/* 两个环形图 - 1:1 */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <UniversalChart
          title={t('storageDistribution')}
          option={storageOption}
          height="300px"
        />
        <UniversalChart
          title={t('fileTypeRatio')}
          option={fileTypeOption}
          height="300px"
        />
      </div>

      {/* 耗时与进度 - 1:1 */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <UniversalChart
          title={t('processDuration')}
          option={durationOption}
          height="300px"
        />
        <UniversalChart
          title={t('seriesProgress')}
          option={seriesProgressOption}
          height="300px"
        />
      </div>

      {/* 弹幕覆盖率热力图 (自动轮播) */}
      {danmuHeatmapOptions && danmuHeatmapOptions.length > 0 && (
        <div className="w-full">
          <Carousel
            className="w-full px-4 xl:px-12"
            plugins={[plugin.current]}
            onMouseEnter={() => plugin.current.stop()}
            onMouseLeave={() => plugin.current.play()}
          >
            <CarouselContent>
              {danmuHeatmapOptions.map((item, index) => (
                <CarouselItem key={index}>
                  <UniversalChart
                    title={t('danmuCoverage')}
                    description={item.title}
                    option={item.option}
                    height="300px"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* 左右箭头 */}
            {danmuHeatmapOptions.length > 1 && (
              <>
                <CarouselPrevious className="left-0 xl:-left-8" />
                <CarouselNext className="right-0 xl:-right-8" />
              </>
            )}
          </Carousel>
        </div>
      )}
    </div>
  )
}
