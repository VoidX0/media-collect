'use client'

import UniversalChart from '@/components/chart/universal-chart'
import { SchemaType } from '@/components/schema/schema'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { EChartsOption } from 'echarts'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import * as echarts from 'echarts/core'
import {
  AreaChart as AreaIcon,
  ArrowDownWideNarrow,
  BarChart3,
  Calculator,
  Check,
  ChevronsUpDown,
  Clock,
  LineChart as LineIcon,
  PieChart as PieIcon,
  ScatterChart as ScatterIcon,
  Search,
  Sigma,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

// 添加模块
echarts.use([BarChart, LineChart, PieChart, ScatterChart])

/** 图表组件属性 */
interface SchemaChartProps<T> {
  /** 标题 */
  title: string
  /** 是否打开 */
  open: boolean
  /** 打开状态变化回调 */
  onOpenChange: (open: boolean) => void
  /** 数据源 */
  data: T[]
  /** 数据类型结构 */
  fieldMap: SchemaType
  /** 字段标签映射 */
  labelMap?: Partial<Record<keyof T, string>>
}

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' // 图表类型
type AggType = 'sum' | 'avg' | 'count' // 聚合方式
type SortType = 'x-asc' | 'y-desc' | 'y-asc' // 排序方式
type TimeGrain = 'day' | 'hour' | 'minute' | 'raw' // 时间粒度

/** 格式化时间戳为指定粒度 */
const formatTimestamp = (val: string | number, grain: TimeGrain) => {
  if (!val) return ''
  // 尝试解析时间
  const date = new Date(Number(val))
  // 如果解析失败（由 isNaN 判断），可能本身就是日期字符串，直接尝试用 Date 构造
  const validDate = isNaN(date.getTime()) ? new Date(val) : date

  if (isNaN(validDate.getTime())) return String(val) // 还是失败，返回原始值

  const Y = validDate.getFullYear()
  const M = String(validDate.getMonth() + 1).padStart(2, '0')
  const D = String(validDate.getDate()).padStart(2, '0')
  const h = String(validDate.getHours()).padStart(2, '0')
  const m = String(validDate.getMinutes()).padStart(2, '0')
  const s = String(validDate.getSeconds()).padStart(2, '0')

  switch (grain) {
    case 'day':
      return `${Y}-${M}-${D}`
    case 'hour':
      return `${Y}-${M}-${D} ${h}:00`
    case 'minute':
      return `${Y}-${M}-${D} ${h}:${m}`
    case 'raw':
    default:
      return `${Y}-${M}-${D} ${h}:${m}:${s}`
  }
}

// --- 组件主体 ---
export function SchemaChart<T extends Record<string, unknown>>({
  title,
  open,
  onOpenChange,
  data,
  fieldMap,
  labelMap = {},
}: SchemaChartProps<T>) {
  const t = useTranslations('Schema')
  const schema = useMemo(() => fieldMap as SchemaType, [fieldMap])

  // 1. 提取列信息
  const columns = useMemo(() => {
    if (!data || data.length === 0) return []
    // @ts-expect-error key extraction
    return Object.keys(data[0]) as (keyof T)[]
  }, [data])

  const numericColumns = useMemo(() => {
    if (!data || data.length === 0) return []
    return columns.filter((col) => {
      // @ts-expect-error value check
      const val = data[0][col]
      return typeof val === 'number'
    })
  }, [data, columns])

  const textColumns = useMemo(() => {
    return columns.filter((col) => !numericColumns.includes(col))
  }, [columns, numericColumns])

  // 2. UI 状态管理
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [xAxisKey, setXAxisKey] = useState<string>('') // 初始设为空
  const [yAxisKeys, setYAxisKeys] = useState<string[]>([]) // 初始设为空数组
  useEffect(() => {
    if (columns.length > 0) {
      // 将列名统一转为字符串
      const colStrings = columns.map(String)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setXAxisKey((prev) => {
        // 如果没有选中值，或者残留的值在新的列结构中不存在了，就重置默认值
        if (!prev || !colStrings.includes(prev)) {
          return String(textColumns[0] || columns[0] || '')
        }
        return prev
      })

      setYAxisKeys((prev) => {
        // 过滤掉在新数据结构中已经不存在的残留指标，并剔除空字符串
        const validPrev = prev.filter((k) => colStrings.includes(k) && k !== '')
        // 如果过滤后发现没有合法指标了，重新赋默认值
        if (validPrev.length === 0) {
          const defaultY = numericColumns[0] || columns[1]
          return defaultY ? [String(defaultY)] : []
        }
        return validPrev
      })
    }
  }, [columns, textColumns, numericColumns])

  // Y轴下拉框控制状态与过滤文本
  const [isYAxisOpen, setIsYAxisOpen] = useState(false)
  const [yAxisFilter, setYAxisFilter] = useState('')

  // 数据处理控制状态
  const [aggType, setAggType] = useState<AggType>('sum')
  const [sortType, setSortType] = useState<SortType>('x-asc')
  const [limit, setLimit] = useState<string>('all')
  const [timeGrain, setTimeGrain] = useState<TimeGrain>('raw')

  // 3. 判断 X 轴是否为时间类型
  const isXAxisDate = useMemo(() => {
    // 优先检查 Schema 定义
    if (schema && schema[xAxisKey]?.format?.includes('date-time')) return true

    // 启发式检查：如果有数据，且看起来像时间戳 (数字且长度13位，或者毫秒级)
    if (data && data.length > 0) {
      const sample = data[0]?.[xAxisKey]
      if (typeof sample === 'number' && String(sample).length === 13)
        return true
    }
    return false
  }, [schema, xAxisKey, data])

  // 4. 获取字段标签
  const getLabel = (key: string) => {
    let label = key
    if (labelMap[key as keyof T]) label = labelMap[key as keyof T]!
    else if (schema && schema[key]?.description)
      label = schema[key].description!
    return label
  }

  // Y轴指标过滤与选择逻辑
  const filteredYColumns = useMemo(() => {
    const allCols = columns.map(String)
    if (!yAxisFilter.trim()) return allCols
    const filter = yAxisFilter.toLowerCase()

    return allCols.filter((col) => {
      const label = getLabel(col).toLowerCase()
      return label.includes(filter) || col.toLowerCase().includes(filter)
    })
  }, [columns, yAxisFilter, getLabel])

  const isAllYSelected =
    filteredYColumns.length > 0 &&
    filteredYColumns.every((col) => yAxisKeys.includes(col))

  const handleYAxisSelectAll = (checked: boolean) => {
    if (checked) {
      // 追加当前过滤列表中的所有指标
      const newKeys = new Set([...yAxisKeys, ...filteredYColumns])
      setYAxisKeys(Array.from(newKeys))
    } else {
      // 仅移除当前过滤列表中的指标
      setYAxisKeys((prev) => prev.filter((k) => !filteredYColumns.includes(k)))
    }
  }

  const handleYAxisToggle = (col: string, checked: boolean) => {
    setYAxisKeys((prev) =>
      checked ? [...prev, col] : prev.filter((k) => k !== col),
    )
  }

  // 5. 核心：数据处理引擎 (格式化 -> 聚合 -> 排序 -> 截取)
  const processedData = useMemo(() => {
    if (!data || data.length === 0 || !xAxisKey || yAxisKeys.length === 0)
      return []

    // 使用 Map 进行聚合 (Key: X轴值, Value: 各指标累加器)
    const map = new Map<
      string,
      { sums: Record<string, number>; count: number; raw: unknown }
    >()

    data.forEach((item) => {
      let xVal = item[xAxisKey] as string | number

      // A. 时间格式化与归一化
      if (isXAxisDate) {
        xVal = formatTimestamp(xVal, timeGrain)
      } else {
        xVal = String(xVal)
      }

      // B. 聚合计算
      if (!map.has(xVal)) {
        const initSums: Record<string, number> = {}
        yAxisKeys.forEach((k) => {
          initSums[k] = 0
        })
        map.set(xVal, { sums: initSums, count: 0, raw: item })
      }
      const entry = map.get(xVal)!

      // 累加行数
      entry.count += 1

      // 累加各指标数值
      yAxisKeys.forEach((k) => {
        const yVal = Number(item[k]) || 0
        if (aggType === 'count') {
          // @ts-expect-error 动态计算
          entry.sums[k] += 1 // 计数模式下，sums 即为数量
        } else {
          // @ts-expect-error 动态计算
          entry.sums[k] += yVal
        }
      })
    })

    // C. 转换为数组并计算平均值
    let result = Array.from(map.entries()).map(([xKey, val]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resItem: Record<string, any> = {
        [xAxisKey]: xKey, // 这里已经是格式化后的字符串
        _count: val.count, // 保留元数据
        _tooltipLabel: xKey, // 用于 Tooltip 显示
      }

      yAxisKeys.forEach((k) => {
        let finalY = val.sums[k]
        if (aggType === 'avg') {
          finalY =
            val.count === 0
              ? 0
              : parseFloat(((val.sums[k] ?? 0) / val.count).toFixed(2))
        }
        resItem[k] = finalY
      })

      return resItem
    })

    // D. 排序
    result.sort((a, b) => {
      if (sortType === 'x-asc') {
        const xA = String(a[xAxisKey])
        const xB = String(b[xAxisKey])
        // 尝试自然排序 (包含数字比较)
        return xA.localeCompare(xB, undefined, { numeric: true })
      } else if (sortType === 'y-desc') {
        const primaryKey = yAxisKeys[0] // 按第一指标排序
        // @ts-expect-error 动态访问
        return (Number(b[primaryKey]) || 0) - (Number(a[primaryKey]) || 0)
      } else {
        const primaryKey = yAxisKeys[0] // 按第一指标排序
        // @ts-expect-error 动态访问
        return (Number(a[primaryKey]) || 0) - (Number(b[primaryKey]) || 0)
      }
    })

    // E. 截取 Top N
    if (limit !== 'all') {
      result = result.slice(0, Number(limit))
    }

    return result
  }, [
    data,
    xAxisKey,
    yAxisKeys,
    aggType,
    sortType,
    limit,
    isXAxisDate,
    timeGrain,
  ])

  // 6. ECharts 配置生成
  const chartOption = useMemo<EChartsOption>(() => {
    if (!processedData || processedData.length === 0) return {}
    // 使用时间连续轴，只有当 X 轴是时间，且要求按 X 轴(时间)正序排列时，才使用时间轴。
    const useTimeAxis = isXAxisDate && sortType === 'x-asc'

    // 通用配置
    const baseOption: EChartsOption = {
      tooltip: {
        trigger: chartType === 'pie' ? 'item' : 'axis',
        borderWidth: 0, // 适配 Shadcn 风格
      },
      legend: {
        bottom: 0,
        type: 'scroll',
      },
      grid: {
        left: '4%',
        right: '4%',
        bottom: useTimeAxis ? 60 : 20,
        top: 20,
        containLabel: true,
      },
    }

    // A. 饼图特殊处理
    if (chartType === 'pie') {
      const primaryKey = yAxisKeys[0] || ''
      const aggLabel =
        aggType === 'sum'
          ? t('chartAggregationSum')
          : aggType === 'avg'
            ? t('chartAggregationAvg')
            : t('chartAggregationCount')
      const yLabel = `${getLabel(primaryKey)} (${aggLabel})`

      return {
        ...baseOption,
        series: [
          {
            name: yLabel,
            type: 'pie',
            radius: ['40%', '70%'], // 环形饼图
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 4,
              borderColor: 'transparent',
              borderWidth: 2,
            },
            label: {
              show: false,
              position: 'center',
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 16,
                fontWeight: 'bold',
              },
            },
            labelLine: {
              show: false,
            },
            data: processedData.map((item) => ({
              name: String(item[xAxisKey]),
              value: item[primaryKey],
            })),
          },
        ],
      }
    }

    // B. 柱/折/面积/散点图通用处理
    const xAxisData = processedData.map((item) => String(item[xAxisKey]))

    // 遍历并构建多组 series，以支持多个 Y 轴指标同时显示
    const series = yAxisKeys.map((key) => {
      // 根据是否为时间轴改变传递给 ECharts 的数据格式
      // 如果是时间轴，传 [时间, 数值] 的坐标对；如果是普通分类轴，直接传 数值 即可。
      const seriesData = processedData.map((item) =>
        useTimeAxis ? [item[xAxisKey], item[key]] : item[key],
      )
      const aggLabel =
        aggType === 'sum'
          ? t('chartAggregationSum')
          : aggType === 'avg'
            ? t('chartAggregationAvg')
            : t('chartAggregationCount')
      const yLabel = `${getLabel(key)} (${aggLabel})`

      return {
        name: yLabel,
        // 动态设置类型：scatter 类型直接使用，area 类型使用 line
        type: chartType === 'area' ? 'line' : chartType,
        smooth: true, // 折线图开启平滑
        // 散点图设置：增大点的大小
        symbolSize: chartType === 'scatter' ? 10 : 4,
        // 面积图特定配置
        areaStyle: chartType === 'area' ? { opacity: 0.3 } : undefined,
        // 柱状图圆角
        itemStyle:
          chartType === 'bar' ? { borderRadius: [4, 4, 0, 0] } : undefined,
        data: seriesData,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    })

    return {
      ...baseOption,
      xAxis: {
        // 类型动态设置为 'time' 或 'category'
        type: useTimeAxis ? 'time' : 'category',
        // 时间轴不需要显式指明 xAxis.data
        data: useTimeAxis ? undefined : xAxisData,
        axisLabel: {
          // 时间轴让它自动处理间隔，不需要配置 interval
          interval: useTimeAxis ? undefined : 'auto',
          hideOverlap: true,
          // 如果是时间轴，让 ECharts 接管智能的日期/时间多级显示。如果是普通文字则继续使用截断。
          formatter: useTimeAxis
            ? undefined
            : (value: string) => {
                // 普通文本过长截断
                if (value.length > 10) return value.slice(0, 10) + '...'
                return value
              },
        },
      },
      dataZoom: useTimeAxis
        ? [
            {
              type: 'inside', // 支持鼠标滚轮缩放/触摸板双指缩放
              xAxisIndex: 0,
              filterMode: 'filter',
            },
            {
              type: 'slider', // 底部带有小趋势图的滑动条
              xAxisIndex: 0,
              filterMode: 'filter',
              bottom: 30, // 定位在 legend (bottom: 0) 之上
              height: 20, // 控制滑动条的粗细
              borderColor: 'transparent',
              handleSize: '100%',
            },
          ]
        : undefined,
      yAxis: {
        type: 'value',
        scale: true,
      },
      series: series,
    }
  }, [
    processedData,
    getLabel,
    yAxisKeys,
    aggType,
    chartType,
    xAxisKey,
    timeGrain,
    isXAxisDate,
    t,
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background max-h-[90vh] w-full max-w-[95vw] overflow-y-auto border-none p-0 shadow-none md:max-w-screen-lg lg:max-w-screen-xl">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>
            {t('chart')} {title}
          </DialogTitle>
          <DialogDescription>{t('chartDescription')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-6 pt-2">
          {/* --- 控制栏 --- */}
          <div className="bg-muted/30 flex flex-wrap items-end gap-4 rounded-lg border p-4">
            {/* 1. 图表类型 */}
            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground text-xs">
                {t('chartType')}
              </Label>
              <div className="bg-background flex items-center gap-1 rounded-md border p-1">
                <Button
                  variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setChartType('bar')}
                  title={t('chartBar')}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'line' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setChartType('line')}
                  title={t('chartLine')}
                >
                  <LineIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'area' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setChartType('area')}
                  title={t('chartArea')}
                >
                  <AreaIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'scatter' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setChartType('scatter')}
                  title={t('chartScatter')}
                >
                  <ScatterIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={chartType === 'pie' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setChartType('pie')}
                  title={t('chartPie')}
                >
                  <PieIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 2. X 轴选择 */}
            <div className="flex min-w-[120px] flex-col gap-2">
              <Label className="text-muted-foreground text-xs">
                {t('chartDimension')} (X)
              </Label>
              <Select value={xAxisKey} onValueChange={setXAxisKey}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t('chartColumnSelect')} />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={String(col)} value={String(col)}>
                      {getLabel(String(col))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Y 轴选择 */}
            <div className="flex max-w-[200px] min-w-[120px] flex-col gap-2">
              <Label className="text-muted-foreground text-xs">
                {t('chartMetric')} (Y)
              </Label>
              <Popover open={isYAxisOpen} onOpenChange={setIsYAxisOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={
                      yAxisKeys.length !== columns.length
                        ? 'secondary'
                        : 'outline'
                    }
                    role="combobox"
                    className="h-9 w-full justify-between px-3 font-normal"
                  >
                    <span className="truncate text-sm">
                      {yAxisKeys.length === 0
                        ? t('chartColumnSelect')
                        : yAxisKeys.map((k) => getLabel(k)).join(', ')}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <div className="space-y-2">
                    {/* 筛选输入框 */}
                    <div className="relative border-b p-2">
                      <Search className="text-muted-foreground absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 transform" />
                      <Input
                        placeholder={t('chartFilterPlaceholder')}
                        value={yAxisFilter}
                        onChange={(e) => setYAxisFilter(e.target.value)}
                        className="h-9 pr-8 pl-8"
                      />
                      {yAxisFilter && (
                        <button
                          onClick={() => setYAxisFilter('')}
                          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2 transform"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* 全选与清空按钮 */}
                    <div className="flex items-center space-x-2 border-b px-3 pt-1 pb-2">
                      <Checkbox
                        checked={isAllYSelected}
                        onCheckedChange={handleYAxisSelectAll}
                      />
                      <span className="text-sm font-medium">
                        {isAllYSelected
                          ? t('chartDeselectAll')
                          : t('chartSelectAll')}
                      </span>
                      <div className="text-muted-foreground ml-auto text-xs">
                        {t('chartSelectedCount', { param: yAxisKeys.length })}
                      </div>
                    </div>

                    {/* 指标列表 (原生 overflow-auto 解决滚动冲突) */}
                    <div
                      className="max-h-60 space-y-1 overflow-auto p-1"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {filteredYColumns.length === 0 ? (
                        <div className="text-muted-foreground py-4 text-center text-sm">
                          {t('chartNoMatch')}
                        </div>
                      ) : (
                        filteredYColumns.map((col) => {
                          const checked = yAxisKeys.includes(col)
                          return (
                            <label
                              key={col}
                              className="hover:bg-accent flex cursor-pointer items-center space-x-2 rounded-sm px-2 py-1.5 text-sm"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) =>
                                  handleYAxisToggle(col, !!v)
                                }
                              />
                              <span className="flex-1 truncate">
                                {getLabel(col)}
                              </span>
                              {checked && (
                                <Check className="text-primary h-4 w-4" />
                              )}
                            </label>
                          )
                        })
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* 4. 时间粒度 (仅当 X 轴是时间时显示) */}
            {isXAxisDate && (
              <div className="flex min-w-[100px] flex-col gap-2">
                <Label className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" /> {t('chartPrecision')}
                </Label>
                <Select
                  value={timeGrain}
                  onValueChange={(v) => setTimeGrain(v as TimeGrain)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">
                      {t('chartPrecisionDay')}
                    </SelectItem>
                    <SelectItem value="hour">
                      {t('chartPrecisionHour')}
                    </SelectItem>
                    <SelectItem value="minute">
                      {t('chartPrecisionMinute')}
                    </SelectItem>
                    <SelectItem value="raw">
                      {t('chartPrecisionRaw')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 分隔线 */}
            <div className="bg-border/50 mx-2 hidden h-10 w-[1px] md:block" />

            {/* 5. 聚合方式 */}
            <div className="flex min-w-[100px] flex-col gap-2">
              <Label className="text-muted-foreground flex items-center gap-1 text-xs">
                <Calculator className="h-3 w-3" /> {t('chartAggregation')}
              </Label>
              <Select
                value={aggType}
                onValueChange={(v) => setAggType(v as AggType)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sum">
                    {t('chartAggregationSum')}
                  </SelectItem>
                  <SelectItem value="avg">
                    {t('chartAggregationAvg')}
                  </SelectItem>
                  <SelectItem value="count">
                    {t('chartAggregationCount')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 6. 排序 */}
            <div className="flex min-w-[100px] flex-col gap-2">
              <Label className="text-muted-foreground flex items-center gap-1 text-xs">
                <ArrowDownWideNarrow className="h-3 w-3" /> {t('chartSort')}
              </Label>
              <Select
                value={sortType}
                onValueChange={(v) => setSortType(v as SortType)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="x-asc">
                    {t('chartSortDimension')}
                  </SelectItem>
                  <SelectItem value="y-desc">
                    {t('chartSortMetricDesc')}
                  </SelectItem>
                  <SelectItem value="y-asc">
                    {t('chartSortMetricAsc')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 7. 截取 Top N */}
            <div className="flex min-w-[90px] flex-col gap-2">
              <Label className="text-muted-foreground flex items-center gap-1 text-xs">
                <Sigma className="h-3 w-3" /> {t('chartLimit')}
              </Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="all">{t('chartLimitAll')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 7. 图表区域 (使用 UniversalChart) */}
          <div className="h-[400px] w-full">
            {!processedData ||
            processedData.length === 0 ||
            !xAxisKey ||
            yAxisKeys.length === 0 ? (
              <div className="text-muted-foreground flex h-full items-center justify-center rounded-lg border border-dashed">
                {t('chartEmpty')}
              </div>
            ) : (
              <UniversalChart
                option={chartOption}
                height="100%"
                className="border-none shadow-none"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
