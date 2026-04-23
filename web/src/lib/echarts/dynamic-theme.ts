import { converter, formatRgb } from 'culori'
import { EChartsCoreOption } from 'echarts'

const toRgb = converter('rgb')

/** 解析 CSS 变量并转换成 rgba() 格式 */
export function resolveColor(varName: string, opacity: number = 1): string {
  if (typeof window === 'undefined') return ''
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim()
  if (!raw) return ''

  try {
    // 转换成 rgb 对象
    const rgb = toRgb(raw)
    if (!rgb) return ''
    // 处理 opacity
    const finalColor = {
      ...rgb,
      alpha: typeof rgb.alpha === 'number' ? rgb.alpha * opacity : opacity,
    }
    // 输出成 rgba()
    return formatRgb(finalColor)
  } catch {
    console.warn(`[resolveColor] Error parsing ${varName}:`, raw)
    return ''
  }
}

/** 生成 ECharts 主题配置，基于 CSS 变量动态适配当前主题 */
export function dynamicTheme(): EChartsCoreOption {
  // 解析所有颜色
  const colors = {
    background: 'transparent',
    foreground: resolveColor('--foreground'),
    muted: resolveColor('--muted'),
    mutedForeground: resolveColor('--muted-foreground'),
    border: resolveColor('--border'),
    input: resolveColor('--input'),
    primary: resolveColor('--primary'),
    primaryForeground: resolveColor('--primary-foreground'),
    popover: resolveColor('--popover'),
    popoverForeground: resolveColor('--popover-foreground'),
    card: resolveColor('--card'),

    // 图表颜色
    chart1: resolveColor('--chart-1'),
    chart2: resolveColor('--chart-2'),
    chart3: resolveColor('--chart-3'),
    chart4: resolveColor('--chart-4'),
    chart5: resolveColor('--chart-5'),
  }
  // 构造色板
  const palette = [
    colors.chart1,
    colors.chart2,
    colors.chart3,
    colors.chart4,
    colors.chart5,
  ]

  // 通用坐标轴配置
  const axisCommon = {
    axisLine: {
      show: true,
      lineStyle: { color: colors.border },
    },
    axisTick: { show: false },
    axisLabel: { color: colors.mutedForeground },
    splitLine: {
      show: true,
      lineStyle: {
        color: [resolveColor('--border', 0.2)], // 手动降级透明度
        type: 'dashed' as const,
      },
    },
  }

  return {
    // ====== 全局配置 ======
    color: palette,
    backgroundColor: colors.background,

    textStyle: {
      color: colors.foreground,
      fontSize: 12,
    },

    title: {
      color: colors.foreground,
      fontWeight: '600',
      subtextStyle: { color: colors.mutedForeground },
    },

    tooltip: {
      backgroundColor: resolveColor('--popover', 0.9),
      borderColor: colors.border,
      textStyle: { color: colors.popoverForeground },
      axisPointer: {
        lineStyle: { color: colors.mutedForeground },
        crossStyle: { color: colors.mutedForeground },
        shadowStyle: { color: resolveColor('--muted', 0.1) }, // 阴影需要透明度
      },
      padding: [8, 12],
      // 限制高度，过高时显示滚动条，并允许交互
      confine: true, // 将 tooltip 限制在图表容器内
      enterable: true, // 允许鼠标进入 tooltip
      extraCssText:
        'border-radius: 6px; max-height: 240px; overflow-y: auto; pointer-events: auto;',
    },

    grid: {
      top: 60,
      bottom: 60,
      left: '5%',
      right: '5%',
      containLabel: true,
      borderColor: colors.border,
    },

    legend: {
      textStyle: { color: colors.foreground },
      pageIconColor: colors.foreground,
      pageIconInactiveColor: colors.muted,
      itemGap: 10,
      bottom: 15,
    },

    categoryAxis: axisCommon,
    valueAxis: axisCommon,
    logAxis: axisCommon,
    timeAxis: axisCommon,

    // ====== 具体图表配置 ======
    line: {
      itemStyle: { borderWidth: 2 },
      lineStyle: { width: 3 },
      symbol: 'emptyCircle',
      symbolSize: 8,
      smooth: false,
      label: { color: colors.foreground },
    },

    radar: {
      itemStyle: { borderWidth: 2 },
      lineStyle: { width: 3 },
      symbol: 'emptyCircle',
      symbolSize: 8,
      axisLine: { lineStyle: { color: colors.border } },
      splitLine: { lineStyle: { color: colors.border } },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['transparent', resolveColor('--muted', 0.2)],
        },
      },
      axisName: { color: colors.foreground },
      name: { color: colors.foreground },
    },

    bar: {
      itemStyle: {
        borderRadius: 4,
        barBorderWidth: 0,
        barBorderColor: colors.border,
      },
      label: { color: colors.foreground },
    },

    pie: {
      itemStyle: {
        borderWidth: 0,
        borderColor: colors.border,
      },
      label: { color: colors.foreground },
      labelLine: { lineStyle: { color: colors.input } },
    },

    scatter: {
      itemStyle: {
        borderWidth: 0,
        borderColor: colors.border,
        opacity: 0.9,
      },
      label: { color: colors.foreground },
    },

    boxplot: {
      itemStyle: {
        color: colors.muted,
        borderColor: colors.foreground,
        borderWidth: 2,
      },
      emphasis: {
        itemStyle: { borderColor: colors.primary },
      },
    },

    heatmap: {
      emphasis: {
        itemStyle: {
          borderColor: colors.primary,
          borderWidth: 1,
        },
      },
      label: { color: colors.foreground },
    },

    graph: {
      itemStyle: {
        borderWidth: 0,
        borderColor: colors.border,
      },
      lineStyle: {
        width: 1,
        color: colors.border,
      },
      symbolSize: 8,
      symbol: 'emptyCircle',
      label: { color: colors.foreground },
      edgeLabel: { color: colors.mutedForeground },
    },

    sankey: {
      itemStyle: {
        borderWidth: 0,
        borderColor: colors.border,
      },
      lineStyle: { color: 'source', opacity: 0.5 },
      label: { color: colors.foreground },
    },

    funnel: {
      itemStyle: { borderWidth: 0, borderColor: colors.border },
    },

    gauge: {
      itemStyle: { borderWidth: 0, borderColor: colors.border },
    },

    candlestick: {
      itemStyle: {
        color: colors.chart3,
        color0: colors.chart5,
        borderColor: colors.chart3,
        borderColor0: colors.chart5,
        borderWidth: 2,
      },
    },

    calendar: {
      itemStyle: {
        color: colors.muted,
        borderColor: colors.border,
      },
      dayLabel: { color: colors.mutedForeground },
      monthLabel: { color: colors.foreground },
      yearLabel: { color: colors.input },
    },

    // ====== 交互组件 (DataZoom) ======
    dataZoom: {
      backgroundColor: colors.muted,
      dataBackground: {
        lineStyle: { color: colors.border },
        areaStyle: { color: colors.border },
      },
      selectedDataBackground: {
        lineStyle: { color: colors.primary },
        areaStyle: { color: colors.primary },
      },
      fillerColor: resolveColor('--primary', 0.2),
      borderColor: colors.border,
      handleStyle: {
        color: colors.primary,
        borderColor: colors.primary,
      },
      textStyle: { color: colors.mutedForeground },
    },

    timeline: {
      lineStyle: { color: colors.chart4 },
      itemStyle: { color: colors.chart4 },
      controlStyle: {
        color: colors.chart4,
        borderColor: colors.chart4,
      },
      checkpointStyle: { color: colors.primary },
      label: { color: colors.foreground },
    } as EChartsCoreOption['timeline'],

    visualMap: {
      color: [colors.primary, colors.muted],
      textStyle: { color: colors.foreground },
      borderColor: colors.border,
    },

    markPoint: {
      label: { color: resolveColor('--primary-foreground') },
    },
    markLine: {
      label: { color: colors.foreground },
      lineStyle: { color: colors.input },
    },
    markArea: {
      label: { color: colors.foreground },
    },
  }
}
