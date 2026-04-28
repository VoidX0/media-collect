using System.Text;
using System.Text.Json;
using MediaCollect.Services;

namespace MediaCollect.Models;

/// <summary>
/// Schema 信息模型
/// </summary>
public class SchemaInfo
{
    /// <summary>
    /// 类型名称
    /// </summary>
    public string TypeName { get; set; } = string.Empty;

    /// <summary>
    /// 字段列表
    /// </summary>
    public List<SchemaField> Fields { get; set; } = [];

    /// <summary>
    /// 字段描述（可选）
    /// </summary>
    public object? SampleData { get; set; }
}

/// <summary>
/// Schema 字段模型
/// </summary>
public class SchemaField
{
    /// <summary>
    /// 字段名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 字段类型
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 字段描述（可选）
    /// </summary>
    public string? Description { get; set; }
}

/// <summary>
/// Schema AI 请求模型
/// </summary>
public class SchemaAiRequest
{
    /// <summary>
    /// JSON Schema
    /// </summary>
    public SchemaInfo Schema { get; set; } = null!;

    /// <summary>
    /// 对话消息列表
    /// </summary>
    public List<ChatMessage> Messages { get; set; } = [];

    /// <summary>
    /// 生成系统提示语
    /// </summary>
    /// <returns></returns>
    public string GenerateSystemPrompt()
    {
        var sb = new StringBuilder();

        // 构建字段描述
        var fieldDesc = new StringBuilder();
        foreach (var f in Schema.Fields)
        {
            fieldDesc.Append("- Field: \"")
                .Append(f.Name)
                .Append("\" (")
                .Append(f.Type)
                .Append(')');

            if (!string.IsNullOrWhiteSpace(f.Description))
            {
                fieldDesc.Append(" | Desc: ")
                    .Append(f.Description);
            }

            fieldDesc.AppendLine();
        }

        // Sample 数据（只取序列化后的前几行）
        var sampleJson = Schema.SampleData == null
            ? "[]"
            : JsonSerializer.Serialize(
                Schema.SampleData,
                new JsonSerializerOptions
                {
                    WriteIndented = false
                });

        // 组装最终 System Prompt
        sb.AppendLine("You are an expert data visualization engineer using ECharts and JavaScript.");
        sb.AppendLine("Your goal is to help the user analyze and visualize their data based on the provided Schema.");
        sb.AppendLine();
        sb.AppendLine("**1. Context:**");
        sb.AppendLine($"- **Schema Name**: {Schema.TypeName}");
        sb.AppendLine("- **Schema Definitions** (Use this to understand data meaning):");
        sb.Append(fieldDesc);
        sb.AppendLine("- **Raw Data Sample** (Top 3 rows):");
        sb.AppendLine(sampleJson);
        sb.AppendLine();
        sb.AppendLine("**2. Task:**");
        sb.AppendLine("You must generate TWO separate code blocks to solve the user's request.");
        sb.AppendLine();
        sb.AppendLine("**PART A: Transformer Function (JavaScript)**");
        sb.AppendLine("- Write a pure JS function named `transform` to process the raw data.");
        sb.AppendLine("- **Input**: `data` (Array of objects).");
        sb.AppendLine("- **Output**: An **Array of Arrays** (2D Array). The first row MUST be the header.");
        sb.AppendLine("- **Logic**: Perform all data cleaning, aggregation, date formatting, or counting here.");
        sb.AppendLine("- **Format**:");
        sb.AppendLine("```javascript");
        sb.AppendLine("function transform(data) {");
        sb.AppendLine("  // Logic...");
        sb.AppendLine("  return [[\"Header1\", \"Header2\"], [val1, val2]];");
        sb.AppendLine("}");
        sb.AppendLine("```");
        sb.AppendLine();
        sb.AppendLine("**PART B: ECharts Option (JSON)**");
        sb.AppendLine("- The ECharts configuration object.");
        sb.AppendLine("- **CRITICAL RULE**: Do NOT include any real or fake data in the JSON.");
        sb.AppendLine(
            "- **dataset.source**: You MUST set `dataset.source` to the exact string: \"__DATA_PLACEHOLDER__\".");
        sb.AppendLine("- **series**: Do NOT use the `data` property. Use `dataset` and `encode`.");
        sb.AppendLine("- **Format**:");
        sb.AppendLine("```json");
        sb.AppendLine("{");
        sb.AppendLine("  \"title\": { },");
        sb.AppendLine("  \"dataset\": { \"source\": \"__DATA_PLACEHOLDER__\" },");
        sb.AppendLine("  \"series\": []");
        sb.AppendLine("}");
        sb.AppendLine("```");
        sb.AppendLine();
        sb.AppendLine("- **Global Theme**:");
        sb.AppendLine("  - Do NOT output `color`, `backgroundColor`, `grid` or cosmetic styles");
        sb.AppendLine("  - Unless they carry data meaning or are explicitly requested");
        sb.AppendLine();
        sb.AppendLine("**3. Anti-Hallucination Rules:**");
        sb.AppendLine("- Never output raw data in the JSON block.");
        sb.AppendLine("- Always assume the `transform` function will provide the correct data structure.");
        sb.AppendLine("- Do NOT explain. Only output the required code blocks.");

        return sb.ToString();
    }
}