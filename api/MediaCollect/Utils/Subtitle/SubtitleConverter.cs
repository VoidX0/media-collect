using System.Text;
using System.Text.RegularExpressions;

namespace MediaCollect.Utils.Subtitle;

/// <summary>
/// 字幕格式转换工具类
/// </summary>
public static class SubtitleConverter
{
    private static readonly Regex HtmlRegex = new(@"<.*?>", RegexOptions.Compiled);

    /// <summary>
    /// 将 SRT 字幕文件转换为 ASS 格式
    /// </summary>
    /// <param name="inputPath">SRT 文件路径</param>
    /// <returns>生成的 ASS 文件路径</returns>
    public static string SrtToAss(string inputPath)
    {
        var outputPath = Path.ChangeExtension(inputPath, ".ass");
        var lines = ReadSrtFile(inputPath);
        var assContent = new StringBuilder();
        // 写入 ASS 头部信息 (Script Info)
        assContent.AppendLine("[Script Info]");
        assContent.AppendLine("Title: Converted ASS Subtitle");
        assContent.AppendLine("ScriptType: v4.00+");
        assContent.AppendLine("PlayResX: 1920");
        assContent.AppendLine("PlayResY: 1080");
        assContent.AppendLine("");

        // 写入样式信息 (Styles)
        assContent.AppendLine("[V4+ Styles]");
        assContent.AppendLine(
            "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding");
        assContent.AppendLine(
            "Style: Default,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,40,1");
        assContent.AppendLine("");

        // 写入事件部分 (Events)
        assContent.AppendLine("[Events]");
        assContent.AppendLine("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text");

        var i = 0;
        while (i < lines.Length)
        {
            var line = lines[i].Trim();
            // 匹配数字索引行
            if (int.TryParse(line, out _))
            {
                i++;
                if (i >= lines.Length) break;

                var timeLine = lines[i].Trim();
                if (!timeLine.Contains("-->"))
                {
                    i++;
                    continue;
                }

                // 解析时间
                var times = timeLine.Split(" --> ");
                var start = SrtTimeToAss(times[0]);
                var end = SrtTimeToAss(times[1]);

                i++;
                var textLines = new List<string>();

                // 读取字幕文本直到遇到空行
                while (i < lines.Length && !string.IsNullOrWhiteSpace(lines[i]))
                {
                    textLines.Add(CleanText(lines[i].Trim()));
                    i++;
                }

                var text = string.Join("\\N", textLines);
                assContent.AppendLine($"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}");
            }
            else
            {
                i++;
            }
        }

        File.WriteAllText(outputPath, assContent.ToString(), Encoding.UTF8);
        return outputPath;
    }

    /// <summary>
    /// 自动尝试多种编码读取文件
    /// </summary>
    private static string[] ReadSrtFile(string path)
    {
        // 注册扩展编码支持（如 GBK, Big5）
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

        string[] encodings = ["utf-8", "gbk", "gb2312", "big5"];

        foreach (var encName in encodings)
        {
            try
            {
                var encoding = Encoding.GetEncoding(encName);
                // 使用 StreamReader 自动处理 BOM (utf-8-sig)
                using var reader = new StreamReader(path, encoding, true);
                var content = reader.ReadToEnd();

                // 简单的解码校验：如果包含非法字符（通常是乱码），则尝试下一个
                if (content.Contains("") && encName == "utf-8") continue;

                return content.Split(["\r\n", "\r", "\n"], StringSplitOptions.None);
            }
            catch
            {
                // continue
            }
        }

        throw new Exception($"无法解析字幕编码: {path}");
    }

    /// <summary>
    /// 清理文本：移除 HTML 标签，替换 ASS 特殊字符 {}
    /// </summary>
    private static string CleanText(string text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        // 移除标签
        text = HtmlRegex.Replace(text, "");
        // 替换特殊字符防止 ASS 解析错误
        text = text.Replace("{", "（").Replace("}", "）");
        return text;
    }

    /// <summary>
    /// SRT 时间格式转 ASS 时间格式
    /// 00:01:02,345 -> 0:01:02.34
    /// </summary>
    private static string SrtTimeToAss(string timeStr)
    {
        // timeStr: 00:01:02,345
        var parts = timeStr.Trim().Split(':');
        var h = int.Parse(parts[0]);
        var m = parts[1];

        var sMs = parts[2].Split(',');
        var s = sMs[0];
        var ms = int.Parse(sMs[1]);

        // ASS 使用百分秒 (Centiseconds)
        var cs = ms / 10;
        return $"{h}:{m}:{s}.{cs:D2}";
    }
}