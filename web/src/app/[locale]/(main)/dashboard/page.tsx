'use client'

import { CollectedMedia, DanmuCoverage } from '@/api/generatedSchemas'
import { getMedias } from '@/app/[locale]/(main)/collect-media/media'
import UniversalChart from '@/components/chart/universal-chart'
import { formatDate } from '@/lib/date-time'
import { openapi } from '@/lib/http'
import { EChartsOption } from 'echarts'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import * as echarts from 'echarts/core'
import { Loader } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

echarts.use([LineChart, PieChart, BarChart, ScatterChart])

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
      console.log('Fetched medias:', mediaRes)
      console.log('Fetched danmu coverage:', coverageRes.data)
      setLoading(false)
    }
    fetch().then()
  }, [])

  // 1. 处理趋势图 (已有的堆叠面积图)
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

  if (loading) {
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
    </div>
  )
}
