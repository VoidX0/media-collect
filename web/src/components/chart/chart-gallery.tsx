'use client'

import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts/core'
import { useMemo, useRef, useState } from 'react'

import {
  BarChart,
  BoxplotChart,
  CandlestickChart,
  FunnelChart,
  GaugeChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
} from 'echarts/charts'

import {
  CalendarComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'

import UniversalChart from '@/components/chart/universal-chart'
import { Button } from '@/components/ui/button'
import { printHtmlByBlocks } from '@/lib/print'
import { CanvasRenderer } from 'echarts/renderers'
import { Download, Loader2 } from 'lucide-react'

// ======================
// ECharts 注册（全量）
// ======================
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  CandlestickChart,
  RadarChart,
  BoxplotChart,
  HeatmapChart,
  GraphChart,
  SunburstChart,
  SankeyChart,
  FunnelChart,
  GaugeChart,

  GridComponent,
  TooltipComponent,
  LegendComponent,
  RadarComponent,
  CalendarComponent,
  VisualMapComponent,
  DataZoomComponent,
  ToolboxComponent,

  CanvasRenderer,
])

export default function ChartGallery() {
  const printRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  // 导出 PDF
  const handleExportPDF = async () => {
    const element = printRef.current
    if (!element) return

    await printHtmlByBlocks({
      container: element,
      fileName: `chart_gallery.pdf`,
      onStart: () => setIsExporting(true),
      onComplete: () => setIsExporting(false),
      onError: (e) => {
        setIsExporting(false)
        console.error('导出失败:', e)
      },
    })
  }

  const charts = useMemo<{ title: string; option: EChartsOption }[]>(
    () => [
      // ======================
      // 折线图
      // ======================
      {
        title: 'Line · Multi · Zoom',
        option: {
          tooltip: { trigger: 'axis' },
          legend: {},
          toolbox: { feature: { saveAsImage: {} } },
          xAxis: {
            type: 'category',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          },
          yAxis: { type: 'value' },
          dataZoom: [{ type: 'inside' }, { type: 'slider' }],
          series: [
            { type: 'line', data: [120, 132, 101, 134, 90, 230, 210] },
            { type: 'line', data: [220, 182, 191, 234, 290, 330, 310] },
            { type: 'line', data: [150, 232, 201, 154, 190, 330, 410] },
          ],
        },
      },

      // ======================
      // 柱状图
      // ======================
      {
        title: 'Bar · Stack · Zoom',
        option: {
          tooltip: { trigger: 'axis' },
          legend: {},
          xAxis: {
            type: 'category',
            data: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'],
          },
          yAxis: { type: 'value' },
          dataZoom: [{ type: 'inside' }, { type: 'slider' }],
          series: [
            {
              type: 'bar',
              stack: 'total',
              data: [120, 132, 101, 134, 90, 230],
            },
            {
              type: 'bar',
              stack: 'total',
              data: [220, 182, 191, 234, 290, 330],
            },
            {
              type: 'bar',
              stack: 'total',
              data: [150, 232, 201, 154, 190, 330],
            },
          ],
        },
      },

      // ======================
      // 饼图
      // ======================
      {
        title: 'Pie · Multi',
        option: {
          tooltip: { trigger: 'item' },
          legend: { bottom: 0 },
          series: [
            {
              type: 'pie',
              radius: '60%',
              data: [
                { value: 40, name: 'A' },
                { value: 30, name: 'B' },
                { value: 20, name: 'C' },
                { value: 10, name: 'D' },
              ],
            },
          ],
        },
      },

      // ======================
      // 散点图
      // ======================
      {
        title: 'Scatter · Multi · VisualMap',
        option: {
          tooltip: { trigger: 'item' },
          legend: {},
          xAxis: {},
          yAxis: {},
          visualMap: {
            min: 0,
            max: 100,
            calculable: true,
          },
          series: [
            {
              type: 'scatter',
              data: [
                [10, 20, 30],
                [20, 30, 50],
                [30, 40, 80],
              ],
            },
            {
              type: 'scatter',
              data: [
                [40, 60, 20],
                [50, 70, 60],
                [60, 80, 90],
              ],
            },
          ],
        },
      },

      // ======================
      // K 线图
      // ======================
      {
        title: 'Candlestick · Zoom',
        option: {
          tooltip: { trigger: 'axis' },
          xAxis: {
            type: 'category',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          },
          yAxis: { scale: true },
          dataZoom: [{ type: 'inside' }, { type: 'slider' }],
          series: [
            {
              type: 'candlestick',
              data: [
                [20, 30, 10, 35],
                [30, 40, 25, 45],
                [40, 35, 30, 50],
                [35, 55, 30, 60],
                [50, 45, 40, 65],
                [45, 60, 35, 70],
              ],
            },
          ],
        },
      },

      // ======================
      // 雷达图
      // ======================
      {
        title: 'Radar · Multi',
        option: {
          tooltip: {},
          legend: {},
          radar: {
            indicator: [
              { name: '性能', max: 100 },
              { name: '稳定', max: 100 },
              { name: '安全', max: 100 },
              { name: '扩展', max: 100 },
              { name: '成本', max: 100 },
            ],
          },
          series: [
            {
              type: 'radar',
              data: [
                { value: [80, 90, 70, 85, 60], name: '方案 A' },
                { value: [70, 85, 75, 80, 70], name: '方案 B' },
              ],
            },
          ],
        },
      },

      // ======================
      // 盒须图
      // ======================
      {
        title: 'Boxplot',
        option: {
          tooltip: { trigger: 'item' },
          xAxis: { type: 'category', data: ['Group A', 'Group B'] },
          yAxis: { type: 'value' },
          series: [
            {
              type: 'boxplot',
              data: [
                [20, 30, 40, 50, 60],
                [10, 25, 35, 45, 70],
              ],
            },
          ],
        },
      },

      // ======================
      // 热力图
      // ======================
      {
        title: 'Heatmap',
        option: {
          tooltip: {},
          xAxis: {
            type: 'category',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          },
          yAxis: {
            type: 'category',
            data: ['A', 'B', 'C', 'D'],
          },
          visualMap: {
            min: 0,
            max: 100,
            calculable: true,
            orient: 'horizontal',
          },
          series: [
            {
              type: 'heatmap',
              data: [
                [0, 0, 10],
                [1, 0, 20],
                [2, 0, 30],
                [0, 1, 40],
                [1, 1, 50],
                [2, 1, 60],
                [0, 2, 70],
                [1, 2, 80],
                [2, 2, 90],
              ],
            },
          ],
        },
      },

      // ======================
      // 关系图
      // ======================
      {
        title: 'Graph · Force',
        option: {
          tooltip: {},
          series: [
            {
              type: 'graph',
              layout: 'force',
              roam: true,
              data: [
                { name: 'Node A' },
                { name: 'Node B' },
                { name: 'Node C' },
                { name: 'Node D' },
              ],
              links: [
                { source: 'Node A', target: 'Node B' },
                { source: 'Node B', target: 'Node C' },
                { source: 'Node C', target: 'Node D' },
              ],
            },
          ],
        },
      },

      // ======================
      // 旭日图
      // ======================
      {
        title: 'Sunburst',
        option: {
          series: [
            {
              type: 'sunburst',
              radius: [0, '90%'],
              data: [
                {
                  name: 'A',
                  children: [
                    { name: 'A1', value: 5 },
                    { name: 'A2', value: 3 },
                  ],
                },
                {
                  name: 'B',
                  children: [{ name: 'B1', value: 4 }],
                },
              ],
            },
          ],
        },
      },

      // ======================
      // 桑基图
      // ======================
      {
        title: 'Sankey',
        option: {
          tooltip: {},
          series: [
            {
              type: 'sankey',
              data: [
                { name: 'a' },
                { name: 'b' },
                { name: 'c' },
                { name: 'd' },
              ],
              links: [
                { source: 'a', target: 'b', value: 5 },
                { source: 'b', target: 'c', value: 3 },
                { source: 'c', target: 'd', value: 2 },
              ],
            },
          ],
        },
      },

      // ======================
      // 漏斗图
      // ======================
      {
        title: 'Funnel',
        option: {
          tooltip: { trigger: 'item' },
          series: [
            {
              type: 'funnel',
              data: [
                { value: 100, name: 'Visit' },
                { value: 60, name: 'Register' },
                { value: 30, name: 'Purchase' },
              ],
            },
          ],
        },
      },

      // ======================
      // 仪表盘
      // ======================
      {
        title: 'Gauge',
        option: {
          series: [
            {
              type: 'gauge',
              progress: { show: true },
              data: [{ value: 72, name: 'Score' }],
            },
          ],
        },
      },

      // ======================
      // 日历坐标系
      // ======================
      {
        title: 'Calendar · Heatmap',
        option: {
          tooltip: {},
          calendar: {
            range: '2024-01',
          },
          visualMap: {
            min: 0,
            max: 100,
            calculable: true,
            orient: 'horizontal',
          },
          series: [
            {
              type: 'heatmap',
              coordinateSystem: 'calendar',
              data: [
                ['2024-01-01', 20],
                ['2024-01-02', 40],
                ['2024-01-03', 60],
                ['2024-01-04', 80],
              ],
            },
          ],
        },
      },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <Button
        onClick={handleExportPDF}
        disabled={isExporting}
        variant="outline"
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            导出 PDF
          </>
        )}
      </Button>
      <div ref={printRef} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {charts.map((c) => (
          <div data-print-block key={c.title}>
            <UniversalChart title={c.title} option={c.option} height="260px" />
          </div>
        ))}
      </div>
    </div>
  )
}
