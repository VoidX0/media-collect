import fs from 'fs'
import path from 'path'
import { Project } from 'ts-morph'
import { fileURLToPath } from 'url'

// region 加载文件

// 解决 ESM 下 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 初始化 ts-morph
const project = new Project({
  tsConfigFilePath: path.resolve(__dirname, '../tsconfig.json'),
})

// 加载 schema.d.ts
const source = project.addSourceFileAtPath(
  path.resolve(__dirname, '../src/api/schema.d.ts'),
)

// endregion

// region 辅助函数

/**
 * 将 JSDoc 转换为字符串
 * @param comment
 */
function commentToString(
  comment:
    | string
    | (
        | import('ts-morph').JSDocText
        | import('ts-morph').JSDocLink
        | import('ts-morph').JSDocLinkCode
        | import('ts-morph').JSDocLinkPlain
        | undefined
      )[]
    | undefined,
): string | undefined {
  if (!comment) return undefined
  if (typeof comment === 'string') return comment
  return comment
    .map((c) => c?.getText())
    .filter(Boolean)
    .join('')
}

/**
 * 提取 components.schemas 的类型
 */
function getSchemasType(): import('ts-morph').Type | undefined {
  // 提取components
  const componentsInterface = source.getInterface('components')
  if (!componentsInterface) return undefined
  // 提取schemas
  const schemasProp = componentsInterface.getProperty('schemas')
  if (!schemasProp) return undefined
  return schemasProp.getType()
}

/**
 * 提取指定类型的字段信息
 * @param typeName
 */
function extractType(typeName: string) {
  // 提取目标类型
  const targetSymbol = getSchemasType()?.getProperty(typeName)
  if (!targetSymbol) return {}
  // 提取目标类型的字段
  const declarations = targetSymbol.getDeclarations()
  if (!declarations || declarations.length === 0) return {}
  // 仅处理第一个声明
  const firstDecl = declarations[0]!
  const type = firstDecl.getType()

  // 如果类型本身是基础类型（string, number 等），直接返回空对象
  if (type.isString() || type.isNumber() || type.isBoolean()) {
    return {}
  }

  const props = type.getProperties()
  const result: Record<string, unknown> = {}
  // 提取字段信息
  props.forEach((prop) => {
    // 过滤掉 TypeScript 内置库定义的属性（如 toString, valueOf 等）
    const isBuiltIn = prop.getDeclarations().some((d) => {
      const filePath = d.getSourceFile().getFilePath()
      // 通常内置库路径包含 'typescript/lib' 或 'node_modules/typescript/lib'
      return (
        filePath.includes('typescript/lib') ||
        filePath.includes('node_modules/typescript')
      )
    })
    if (isBuiltIn) return

    const name = prop.getName() // 字段名称
    const valueType = prop.getTypeAtLocation(firstDecl).getText() // 字段类型
    // 提取 JSDoc 信息
    let description: string | undefined = undefined
    let format: string | undefined = undefined
    // 获取属性的声明以提取 JSDoc
    const decls = prop.getDeclarations()
    if (decls && decls.length > 0) {
      const decl = decls[0] as import('ts-morph').PropertySignature
      // 只有 PropertySignature 类型才有 getJsDocs 方法
      if (typeof decl.getJsDocs === 'function') {
        const jsDocs = decl.getJsDocs()
        // 遍历所有 JSDoc
        jsDocs.forEach((doc) => {
          // 先获取 doc.getComment() 字符串化
          const docComment = commentToString(doc.getComment())
          // 提取 Format
          if (docComment) {
            const match = docComment.match(/Format:\s*(.+)/)
            if (match) format = match[1]
          }
          // 获取 @description 标签
          const descTag = doc
            .getTags()
            .find((t) => t.getTagName() === 'description')
          if (descTag) {
            description = commentToString(descTag.getComment())
          }
        })
      }
    }

    // 保存字段信息
    result[name] = { type: valueType, description, format }
  })

  return result
}

/**
 * 获取所有 schema 类型名称
 */
function getAllSchemaNames(): string[] {
  return getSchemasType()!
    .getProperties()
    .map((s) => s.getName())
}

/**
 * 提取 MessageCodeEnum 的 JSDoc 描述并生成 i18n 消息
 */
function generateI18nMessages() {
  // 获取 MessageCodeEnum 的 Symbol
  const targetSymbol = getSchemasType()?.getProperty('MessageCodeEnum')
  if (!targetSymbol) return
  // 获取声明
  const decls = targetSymbol.getDeclarations()
  if (!decls || decls.length === 0) return
  const decl = decls[0] as import('ts-morph').PropertySignature
  // 遍历 JSDoc 提取 description
  const jsDocs = decl.getJsDocs()
  let docComment: string | undefined = undefined
  for (const doc of jsDocs) {
    // 优先从 @description 标签获取
    const descTag = doc.getTags().find((t) => t.getTagName() === 'description')
    if (descTag) {
      docComment = commentToString(descTag.getComment())
    }
    // 如果没找到，尝试获取主注释内容
    if (!docComment) {
      docComment = commentToString(doc.getComment())
    }
    // 已经找到 跳出循环
    if (docComment) break
  }
  // 检查
  if (typeof docComment !== 'string' || !docComment) {
    console.warn('⚠️ 警告: 未能从 MessageCodeEnum 提取到 JSDoc 描述')
    return
  }
  // 处理格式
  const i18nMap: Record<string, string> = {}
  docComment.split('\n').forEach((line) => {
    const match = line.match(/\|\s*([\w\d]+)\s*\|\s*([^|]+)\s*\|/)
    if (match) {
      const key = match[1]!.trim()
      const value = match[2]!.trim()
      if (key !== '枚举值' && !key.includes('---')) {
        i18nMap[key] = value
      }
    }
  })
  // 写入文件
  saveI18nJson(i18nMap, 'en', true)
  saveI18nJson(i18nMap, 'zh', true)
}

/**
 * 写入消息，存放在 MessageCode 节点下
 * @param newMap 后端生成的最新映射
 * @param locale 语言代码
 * @param preserveExisting 是否保留原文件中已有的翻译
 */
function saveI18nJson(
  newMap: Record<string, string>,
  locale: string,
  preserveExisting: boolean = false,
) {
  const localesDir = path.resolve(__dirname, '../messages')
  if (!fs.existsSync(localesDir)) fs.mkdirSync(localesDir, { recursive: true })
  const file = path.join(localesDir, `${locale}.json`)
  let finalData: Record<string, object> = {}
  // 文件已存在，先读取现有内容
  if (fs.existsSync(file)) {
    try {
      finalData = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch (error) {
      console.warn(
        `⚠️ 警告: 无法解析现有的 i18n 文件 ${file}，将覆盖原文件`,
        error,
      )
      finalData = {}
    }
  }
  // 获取原有的 MessageCode 节点内容
  const oldMessageCode = finalData.MessageCode || {}
  // 根据策略合并
  if (preserveExisting) {
    // 以最新的 Key 为基准，如果旧文件里有，就用旧文件的内容（已翻译的）
    const mergedMap: Record<string, string> = {}
    Object.keys(newMap).forEach((key) => {
      // 优先使用旧文件内容，如果旧文件没有，则使用后端生成的默认值
      // @ts-expect-error 动态访问
      mergedMap[key] = oldMessageCode[key] || newMap[key]
    })
    finalData.MessageCode = mergedMap
  } else {
    // 直接使用后端生成的内容完全覆盖
    finalData.MessageCode = { ...newMap }
  }
  // 写入文件
  fs.writeFileSync(file, JSON.stringify(finalData, null, 2), 'utf-8')
  const statusIcon = preserveExisting ? '🔄' : '🔥'
  const modeText = preserveExisting ? '增量更新' : '全量覆盖'
  console.log(
    `${statusIcon} 国际化消息已更新 [${locale}](${modeText}): ${file}`,
  )
}

/**
 * 获取自定义的 schema 信息
 */
function customSchemas(): Record<string, unknown> {
  const customSchemas: Record<string, unknown> = {}
  // 自定义 schema 目录
  const customSchemaDir = path.resolve(__dirname, './schemas')
  if (!fs.existsSync(customSchemaDir)) return customSchemas
  const files = fs.readdirSync(customSchemaDir)
  files
    .filter((file) => file.endsWith('.json'))
    .forEach((file) => {
      const typeName = path.basename(file, '.json')
      const filePath = path.join(customSchemaDir, file)
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      try {
        customSchemas[typeName] = JSON.parse(fileContent) // 记录已加载的自定义 schema
        console.log(`✨ 已加载自定义 Schema: ${typeName}`)
      } catch (error) {
        console.error(`❌ 无法解析 JSON Schema: ${filePath}`, error)
      }
    })
  return customSchemas
}

/**
 * 为自定义的 schema 生成 TypeScript 定义
 */
function generateCustomSchemaDts(schemas: Record<string, unknown>) {
  const outputPath = path.resolve(__dirname, '../src/api/generated.d.ts')
  let dtsContent = `/**
 * This file is auto-generated by scripts/generateSchema.ts
 * Do not edit manually
 */
export interface components {
  schemas: {
`
  Object.keys(schemas).forEach((typeName) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = schemas[typeName] as Record<string, any>
    dtsContent += `    /** @description ${schema.description || typeName} */\n`
    dtsContent += `    ${typeName}: {\n`
    Object.keys(schema).forEach((propName) => {
      if (propName === 'description') return
      const prop = schema[propName]
      dtsContent += `      /**\n`
      if (prop.format) {
        dtsContent += `       * Format: ${prop.format}\n`
      }
      if (prop.description) {
        dtsContent += `       * @description ${prop.description}\n`
      }
      dtsContent += `       */\n`
      dtsContent += `      ${propName}${
        prop.type.endsWith(' | undefined') ? '?:' : ':'
      } ${prop.type.replace(' | undefined', '')};\n`
    })
    dtsContent += `    };\n`
  })
  dtsContent += `  };
}\n`
  fs.writeFileSync(outputPath, dtsContent)
  console.log(`📜 TS 类型定义已生成: ${outputPath}`)
}

// endregion

console.log('🛠️  正在生成 API Schema 运行时代码...')
// 执行流程
const schemaNames = getAllSchemaNames() // 获取openapi中定义的所有 schema 类型名称
const schemas: Record<string, unknown> = {}
schemaNames.forEach((name) => {
  schemas[name] = extractType(name) // 提取每个 schema 的字段信息
})
generateI18nMessages() // 提取消息并同步i18n
// 自定义 schema
const custom = customSchemas()
Object.assign(schemas, custom) // 合并自定义 schema
generateCustomSchemaDts(custom) // 生成自定义 schema 的 d.ts 定义

// 定义类型名称映射关系 { '原名': '新名' }
const typeNameMapping: Record<string, string> = {
  // SystemUser: 'User',
}

// 写入文件
const outputPath = path.resolve(__dirname, '../src/api/generatedSchemas.ts')
// 生成schema对象
let content = `/**
 * This file is auto-generated by scripts/generateSchema.ts
 * Do not edit manually
 */
import { components } from '@/api/schema'
import { components as generated } from '@/api/generated'

/** Runtime representation of OpenAPI Schemas */
export const schemas = ${JSON.stringify(schemas, null, 2)};
`
// 生成类型导出
schemaNames.forEach((name) => {
  const exportName = typeNameMapping[name] || name
  content += `\nexport type ${exportName} = components['schemas']['${name}'];`
})
// 添加自定义类型导出
Object.keys(custom).forEach((name) => {
  const exportName = typeNameMapping[name] || name
  content += `\nexport type ${exportName} = generated['schemas']['${name}'];`
})
fs.writeFileSync(outputPath, content)

console.log(`🚀 运行时 Schema 已就绪: ${outputPath}`)
