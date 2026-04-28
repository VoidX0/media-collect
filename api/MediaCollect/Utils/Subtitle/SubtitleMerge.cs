using System.Text;
using MediaCollect.Services;
using Serilog;
using ILogger = Serilog.ILogger;

namespace MediaCollect.Utils.Subtitle;

/// <summary>
/// 字幕合并工具类
/// </summary>
public static class SubtitleMerger
{
    private static readonly ILogger Logger = Log.ForContext<SubtitleMergeService>();

    /// <summary>
    /// 合并字幕文件与弹幕文件
    /// </summary>
    /// <param name="subtitleAss">原始字幕 ASS 文件路径</param>
    /// <param name="danmuAss">生成的弹幕 ASS 文件路径</param>
    /// <param name="outputPath">合并后的输出路径</param>
    /// <exception cref="InvalidOperationException">当 ASS 文件格式不正确时抛出</exception>
    public static void MergeAssFiles(string subtitleAss, string danmuAss, string outputPath)
    {
        Logger.Information("[SubtitleMerger] 开始合并字幕与弹幕: {Subtitle} + {Danmu}", subtitleAss, danmuAss);

        if (!File.Exists(subtitleAss)) throw new FileNotFoundException("未找到字幕文件", subtitleAss);
        if (!File.Exists(danmuAss)) throw new FileNotFoundException("未找到弹幕文件", danmuAss);
        // 读取弹幕文件作为基准模板（通常弹幕文件包含完整的样式定义）
        var danmuLines = File.ReadAllLines(danmuAss, Encoding.UTF8).ToList();
        // 读取原始字幕文件
        var subLines = File.ReadAllLines(subtitleAss, Encoding.UTF8);

        var eventsIndex = -1;
        var inEvents = false;

        // 1. 寻找弹幕文件的 [Events] 插入点
        for (var i = 0; i < danmuLines.Count; i++)
        {
            var line = danmuLines[i].Trim();
            if (line == "[Events]")
            {
                inEvents = true;
                continue;
            }

            if (inEvents && line.StartsWith("Format:"))
            {
                // 插入点在 Format 行之后
                eventsIndex = i + 1;
                break;
            }
        }

        if (eventsIndex == -1)
        {
            throw new InvalidOperationException("弹幕 ASS 文件缺少 [Events] 段或 Format 定义");
        }

        // 2. 提取字幕文件中的 Dialogue 行
        var subtitleDialogues = subLines
            .Where(line => line.TrimStart().StartsWith("Dialogue:"))
            // 确保每行都有换行符（File.ReadAllLines 已剥离换行符，后续 WriteAllLines 会补齐，
            // 但如果手动拼接则需要注意 Environment.NewLine）
            .ToList();

        if (subtitleDialogues.Count == 0)
        {
            Logger.Warning("[SubtitleMerger] 警告：字幕文件中未提取到任何 Dialogue 行");
        }

        // 3. 执行合并插入
        // 将字幕对话内容插入到弹幕文件的 Events Format 之后
        danmuLines.InsertRange(eventsIndex, subtitleDialogues);

        // 4. 写入输出文件
        File.WriteAllLines(outputPath, danmuLines, Encoding.UTF8);

        Logger.Information("[SubtitleMerger] 合并完成，输出至: {OutputPath}", outputPath);
    }
}