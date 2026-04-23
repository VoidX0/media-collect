import { dynamicTheme } from '@/lib/echarts/dynamic-theme'
import { merge } from 'lodash-es'

/** 通用配置覆盖 */
const common = {
  backgroundColor: 'transparent', // 强制背景透明
}

/** ECharts浅色主题配置 */
export const lightTheme = () => merge({}, dynamicTheme(), common)
/** ECharts深色主题配置 */
export const darkTheme = () => merge({}, dynamicTheme(), common)
