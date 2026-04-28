using System.Text;

namespace MediaCollect.Core.Utils.Extension;

/// <summary>
/// CSV扩展
/// </summary>
public static class CsvExtension
{
    /// <summary>
    /// 序列化为CSV格式
    /// </summary>
    /// <param name="data"></param>
    /// <typeparam name="T"></typeparam>
    /// <returns></returns>
    public static string Serialize<T>(this IEnumerable<T> data)
    {
        var dataList = data.ToList();
        if (dataList.Count == 0) return string.Empty;
        var properties = typeof(T).GetProperties();
        var csvLines = new List<string>();

        // 添加表头
        var header = string.Join(",", properties.Select(p => p.Name));
        csvLines.Add(header);

        // 添加数据行
        foreach (var item in dataList)
        {
            var line = string.Join(",", properties.Select(p =>
            {
                var value = p.GetValue(item);
                return value != null ? value.ToString() : string.Empty;
            }));
            csvLines.Add(line);
        }

        return string.Join("\n", csvLines);
    }

    /// <summary>
    /// 反序列化CSV格式
    /// </summary>
    /// <param name="csvData"></param>
    /// <typeparam name="T"></typeparam>
    /// <returns></returns>
    public static List<T> Deserialize<T>(this string csvData) where T : new()
    {
        var lines = csvData.Split(['\n'], StringSplitOptions.RemoveEmptyEntries);
        var result = new List<T>();
        if (lines.Length < 2) return result;
        var headers = lines[0].Split(',');
        var properties = typeof(T).GetProperties();

        for (var i = 1; i < lines.Length; i++)
        {
            var values = lines[i].Split(',');
            var obj = new T();
            for (var j = 0; j < headers.Length; j++)
            {
                var property = properties.FirstOrDefault(p => p.Name == headers[j]);
                if (property == null || j >= values.Length) continue;
                var convertedValue = Convert.ChangeType(values[j], property.PropertyType);
                property.SetValue(obj, convertedValue);
            }

            result.Add(obj);
        }

        return result;
    }

    /// <summary>
    /// 序列化 Dictionary 列表为 CSV
    /// </summary>
    public static string Serialize(this IEnumerable<Dictionary<string, object>>? data)
    {
        if (data == null) return string.Empty;
        var dataList = data as IList<Dictionary<string, object>> ?? data.ToList();
        if (dataList.Count == 0) return string.Empty;

        // 获取表头
        var keys = dataList[0].Keys.ToList();
        var sb = new StringBuilder();
        // 写入表头
        sb.AppendLine(string.Join(",", keys));
        // 写入数据行
        foreach (var item in dataList)
        {
            for (var i = 0; i < keys.Count; i++)
            {
                // 根据表头顺序取值，防止字典内部乱序
                if (item.TryGetValue(keys[i], out var value)) sb.Append(value);
                // 只有不是最后一列时才加逗号
                if (i < keys.Count - 1) sb.Append(',');
            }

            sb.Append('\n'); // 换行
        }

        return sb.ToString();
    }

    /// <summary>
    /// 反序列化 CSV 为 Dictionary 列表
    /// </summary>
    public static List<Dictionary<string, object>> DeserializeToDict(this string? csvData)
    {
        var result = new List<Dictionary<string, object>>();
        if (string.IsNullOrWhiteSpace(csvData)) return result;

        // 分割行
        var lines = csvData.Split(['\n'], StringSplitOptions.RemoveEmptyEntries);
        if (lines.Length < 2) return result;
        // 解析表头
        var headers = lines[0].Split(',');
        // 解析数据行
        for (var i = 1; i < lines.Length; i++)
        {
            var values = lines[i].Split(',');
            // 如果该行数据列数小于表头数，可能数据不完整，视情况处理，这里选择跳过或截断
            var len = Math.Min(headers.Length, values.Length);
            var dict = new Dictionary<string, object>();
            for (var j = 0; j < len; j++)
            {
                // 注意：CSV反序列化回来，所有的 Value 默认都是 string 类型
                var key = headers[j].Trim();
                var val = values[j];

                // 简单的数据类型推断
                if (decimal.TryParse(val, out var decimalVal)) dict[key] = decimalVal;
                else if (int.TryParse(val, out var intVal)) dict[key] = intVal;
                else dict[key] = val;
            }

            result.Add(dict);
        }

        return result;
    }
}