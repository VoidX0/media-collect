'use client'

import { CollectedMedia } from '@/api/generatedSchemas'
import { getMedias } from '@/app/[locale]/(main)/collect-media/media'
import UniversalChart from '@/components/chart/universal-chart'
import { formatDate } from '@/lib/date-time'
import { EChartsOption } from 'echarts'
import { LineChart } from 'echarts/charts'
import * as echarts from 'echarts/core'
import { Loader } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

echarts.use([LineChart])

export default function Page() {
  const t = useTranslations('DashboardPage')
  const [loading, setLoading] = useState(false)
  // 加载已处理完成的媒体
  const [medias, setMedias] = useState<CollectedMedia[] | undefined>([])
  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      setMedias(await getMedias())
      setLoading(false)
    }
    fetch().then()
  }, [])

  // 按天分组趋势图
  const optionsByDay = useMemo(() => {
    if (!medias || !medias.length) return {}
    // 1. 数据清洗与分组统计
    const dateSeriesMap: Record<string, Record<string, number>> = {}
    const allSeries = new Set<string>()
    const allDates = new Set<string>()
    medias.forEach((item) => {
      if (!item.endTime) return
      // 提取日期部分 (YYYY-MM-DD)
      const date = formatDate(new Date(Number(item.endTime)))
      const seriesName = item.series || 'Unknown'
      allDates.add(date)
      allSeries.add(seriesName)
      if (!dateSeriesMap[date]) dateSeriesMap[date] = {}
      dateSeriesMap[date][seriesName] =
        (dateSeriesMap[date][seriesName] || 0) + 1
    })

    // 2. 排序日期，确保横轴连续
    const sortedDates = Array.from(allDates).sort()
    const seriesList = Array.from(allSeries)
    // 3. 构建 Dataset 数据源 (第一行为维度名称)
    // 格式: [['date', 'Series1', 'Series2'], ['2023-01-01', 10, 5], ...]
    const datasetSource = [
      ['date', ...seriesList],
      ...sortedDates.map((date) => {
        return [date, ...seriesList.map((s) => dateSeriesMap[date]![s] || 0)]
      }),
    ]

    // 4. 构建 Series 配置 (每个系列对应 dataset 中的一列)
    const seriesConfig = seriesList.map((name) => ({
      type: 'line',
      name: name,
      stack: 'Total', // 开启堆叠
      areaStyle: {}, // 开启面积图
      emphasis: { focus: 'series' },
      smooth: true,
      encode: {
        x: 'date',
        y: name,
      },
    }))

    return {
      tooltip: {
        trigger: 'axis',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const filteredParams = params
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((item: any) => {
              // 在 time 轴下，数据可能被存储在 item.value 数组中
              // 索引 0 是时间，后续索引对应各个 series
              return item.value[item.encode.y[0]] > 0
            })
            .sort(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (a: any, b: any) =>
                b.value[b.encode.y[0]] - a.value[a.encode.y[0]],
            )

          if (filteredParams.length === 0) return ''

          // 时间轴下 params[0].axisValue 是时间戳，需要格式化
          const dateTitle = formatDate(new Date(params[0].axisValue))
          let html = `${dateTitle}<br/>`

          filteredParams.forEach((item: any) => {
            const value = item.value[item.encode.y[0]]
            html += `${item.marker} ${item.seriesName}: <b>${value}</b><br/>`
          })
          return html
        },
      },
      legend: {
        data: seriesList,
        bottom: -5,
        type: 'scroll',
      },
      grid: {
        left: '3%',
        right: '3%',
        top: '3%',
        bottom: '12%',
        containLabel: true,
      },
      dataset: {
        source: datasetSource,
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLabel: {
          formatter: '{yyyy}-{MM}-{dd}',
        },
      },
      yAxis: {
        type: 'value',
      },
      dataZoom: [{ type: 'inside' }, { type: 'slider' }],
      series: seriesConfig,
    } as unknown as EChartsOption
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
      <UniversalChart
        title={t('mediaTrend')}
        option={optionsByDay}
        height="400px"
        className="shadow-sm"
      />
    </div>
  )
}
