import { QueryCondition } from '@/api/generatedSchemas'
import { DateTimePicker } from '@/components/common/date-time-picker'
import { SchemaType } from '@/components/schema/schema'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDateTime } from '@/lib/date-time'
import { Check, Trash2 } from 'lucide-react'
import { useMemo } from 'react'

interface SchemaFilterProps<T extends Record<string, unknown>> {
  /** 数据类型结构 */
  fieldMap: SchemaType
  /** 初始条件 */
  conditions?: QueryCondition[]
  /** label 映射 */
  labelMap?: Partial<Record<keyof T, string>>
  /** 条件变更回调 */
  onConditionChange?: (conditions: QueryCondition[]) => void
  /** 确认条件变更回调 */
  onSubmit?: (value: QueryCondition[]) => void
}

export function SchemaFilter<T extends Record<string, unknown>>({
  fieldMap,
  conditions = [],
  labelMap = {},
  onConditionChange,
  onSubmit,
}: SchemaFilterProps<T>) {
  const schema = useMemo(() => fieldMap as SchemaType, [fieldMap])
  const columns = useMemo(() => Object.keys(schema) as (keyof T)[], [schema])

  /** 获取列的显示标签 */
  const getColumnLabel = (col: keyof T) => {
    return labelMap?.[col] ?? schema[col as string]?.description ?? String(col)
  }

  /** 提交条件 */
  const submit = (conditions: QueryCondition[]) => {
    const cond = conditions
      .filter((c) => c.fieldValue !== undefined)
      .map((c) => {
        // 处理范围数据
        if (Array.isArray(c.fieldValue)) {
          return {
            ...c,
            fieldValue: c.fieldValue
              .map(
                (v) =>
                  c.cSharpTypeName == 'DateTimeOffset'
                    ? formatDateTime(new Date(v)) // 转换为时间范围
                    : String(v), // 转换为数值范围
              )
              .join(','),
          }
        }
        // value统一转为string
        return {
          ...c,
          fieldValue: String(c.fieldValue),
        }
      })

    onSubmit?.(cond) // 调用提交回调
  }

  return (
    <>
      <div className="mb-2 flex justify-end gap-2">
        {/*提交按钮*/}
        <Button
          size="icon"
          variant="outline"
          onClick={() => {
            submit(conditions)
          }}
        >
          <Check className="h-4 w-4" />
        </Button>
        {/* 重置按钮 */}
        {conditions.some((c) => c.fieldValue !== undefined) && (
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              const resetConditions = conditions.map((c) => ({
                ...c,
                fieldValue: undefined,
              }))
              onConditionChange?.(resetConditions)
              submit(resetConditions)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 条件列表 */}
      <div className="flex max-h-96 flex-col gap-2 overflow-auto">
        {columns.map((col) => {
          const fieldSchema = schema[col as string]
          const condition = conditions.find((c) => c.fieldName === col)
          const value = condition?.fieldValue
          const conditionalType = condition?.conditionalType

          const isBoolean = fieldSchema?.type.includes('boolean')
          const isNumber =
            fieldSchema?.type.includes('number') ||
            fieldSchema?.type.includes('int') ||
            fieldSchema?.type.includes('double')
          const isDateTime = fieldSchema?.format?.includes('date-time')
          const isString = !isBoolean && !isNumber && !isDateTime
          if (!condition) return null // 没有预先设计条件的字段隐藏

          return (
            <div key={String(col)} className="flex items-center gap-2">
              {/* 字段名 */}
              <span className="w-24 text-sm">{getColumnLabel(col)}</span>
              {/* 条件类型 */}
              <Select
                value={String(conditionalType)}
                onValueChange={(value) => {
                  const newConditions = conditions.map((c) =>
                    c.fieldName === col
                      ? { ...c, conditionalType: Number(value) }
                      : c,
                  )
                  onConditionChange?.(newConditions)
                }}
              >
                <SelectTrigger className="w-37.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(isBoolean || isNumber || isString) && (
                    <SelectItem value="0">
                      <span className="mr-2">=</span>
                      <span className="text-muted-foreground text-xs">
                        Equal
                      </span>
                    </SelectItem>
                  )}
                  {isString && (
                    <SelectItem value="1">
                      <span className="mr-2">~</span>
                      <span className="text-muted-foreground text-xs">
                        Like
                      </span>
                    </SelectItem>
                  )}
                  {isNumber && (
                    <SelectItem value="2">
                      <span className="mr-2">{'>'}</span>
                      <span className="text-muted-foreground text-xs">
                        GreaterThan
                      </span>
                    </SelectItem>
                  )}
                  {isNumber && (
                    <SelectItem value="4">
                      <span className="mr-2">{'<'}</span>
                      <span className="text-muted-foreground text-xs">
                        LessThan
                      </span>
                    </SelectItem>
                  )}
                  {(isNumber || isString) && (
                    <SelectItem value="10">
                      <span className="mr-2">!=</span>
                      <span className="text-muted-foreground text-xs">
                        NoEqual
                      </span>
                    </SelectItem>
                  )}
                  {(isNumber || isDateTime) && (
                    <SelectItem value="16">
                      <span className="mr-2">↔</span>
                      <span className="text-muted-foreground text-xs">
                        Range
                      </span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* 条件值 */}
              {isBoolean ? (
                <Checkbox
                  checked={Boolean(value)}
                  onCheckedChange={(v) => {
                    const newConditions = conditions.map((c) =>
                      c.fieldName === col ? { ...c, fieldValue: v } : c,
                    )
                    onConditionChange?.(newConditions as QueryCondition[])
                  }}
                />
              ) : conditionalType === 16 ? (
                // 范围输入值
                isDateTime ? (
                  // 范围时间选择器 (Range 模式)
                  <div className="w-full">
                    <DateTimePicker
                      mode="range"
                      rangeValue={{
                        start:
                          Array.isArray(value) && value[0] !== undefined
                            ? Number(value[0])
                            : undefined,
                        end:
                          Array.isArray(value) && value[1] !== undefined
                            ? Number(value[1])
                            : undefined,
                      }}
                      onRangeChange={(range) => {
                        // range 是 {start, end}，直接转为数组
                        const newConditions = conditions.map((c) =>
                          c.fieldName === col
                            ? { ...c, fieldValue: [range?.start, range?.end] }
                            : c,
                        )
                        onConditionChange?.(newConditions as QueryCondition[])
                      }}
                    />
                  </div>
                ) : (
                  // 数字/文本的范围输入
                  <div className="flex flex-1 flex-col gap-2">
                    <Input
                      type={isNumber ? 'number' : 'text'}
                      value={
                        Array.isArray(value) && value[0] !== undefined
                          ? value[0]
                          : ''
                      }
                      onChange={(e) => {
                        const newValue = Array.isArray(value)
                          ? [...value]
                          : [undefined, undefined]
                        newValue[0] = isNumber
                          ? String(e.target.value)
                          : e.target.value
                        const newConditions = conditions.map((c) =>
                          c.fieldName === col
                            ? { ...c, fieldValue: newValue }
                            : c,
                        )
                        onConditionChange?.(newConditions as QueryCondition[])
                      }}
                      placeholder="From"
                    />
                    <Input
                      type={isNumber ? 'number' : 'text'}
                      value={
                        Array.isArray(value) && value[1] !== undefined
                          ? value[1]
                          : ''
                      }
                      onChange={(e) => {
                        const newValue = Array.isArray(value)
                          ? [...value]
                          : [undefined, undefined]
                        newValue[1] = isNumber
                          ? String(e.target.value)
                          : e.target.value
                        const newConditions = conditions.map((c) =>
                          c.fieldName === col
                            ? { ...c, fieldValue: newValue }
                            : c,
                        )
                        onConditionChange?.(newConditions as QueryCondition[])
                      }}
                      placeholder="To"
                    />
                  </div>
                )
              ) : isDateTime ? (
                // 单个时间选择器 (Single 模式)
                <div className="flex-1">
                  <DateTimePicker
                    mode="single"
                    value={value ? Number(value) : undefined}
                    onChange={(newTimestamp) => {
                      const newConditions = conditions.map((c) =>
                        c.fieldName === col
                          ? { ...c, fieldValue: newTimestamp }
                          : c,
                      )
                      onConditionChange?.(newConditions as QueryCondition[])
                    }}
                  />
                </div>
              ) : (
                // 单个数字/文本输入
                <Input
                  className="flex-1"
                  type={isNumber ? 'number' : 'text'}
                  value={(value as string | number) ?? ''}
                  onChange={(e) => {
                    let v: string | number | undefined = e.target.value
                    if (isNumber) v = String(e.target.value)
                    const newConditions = conditions.map((c) =>
                      c.fieldName === col ? { ...c, fieldValue: v } : c,
                    )
                    onConditionChange?.(newConditions as QueryCondition[])
                  }}
                  placeholder="Value"
                />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
