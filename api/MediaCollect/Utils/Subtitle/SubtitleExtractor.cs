using System.Text;
using MediaCollect.Services;
using Serilog;
using Xabe.FFmpeg;
using ILogger = Serilog.ILogger;

namespace MediaCollect.Utils.Subtitle;

/// <summary>
/// 字幕类型枚举
/// </summary>
public enum SubtitleType
{
    /// <summary>
    /// 未知
    /// </summary>
    Unknown,

    /// <summary>
    /// 简体中文
    /// </summary>
    Simplified,

    /// <summary>
    /// 繁体中文
    /// </summary>
    Traditional,

    /// <summary>
    /// 粤语
    /// </summary>
    Cantonese
}

/// <summary>
/// 字幕提取与检测工具静态类
/// </summary>
public static class SubtitleExtractor
{
    private static readonly string TmpDir = Path.Combine(Path.GetTempPath(), "subtitle-merge");
    private static readonly char[] CantoneseWords = ['佢', '哋', '喺', '咗', '冇', '嘢'];
    private static readonly ILogger Logger = Log.ForContext<SubtitleMergeService>();

    /// <summary>
    /// 高频繁体特征字
    /// </summary>
    private const string TradMarkers = "們這說國實對變讓體認聽觀飛難導個來時為會門義戰點機廣";

    /// <summary>
    /// 高频简体特征字
    /// </summary>
    private const string SimpleMarkers = "们这说国实对变让体认听观飞难导个来时为会门义战点机广";

    /// <summary>
    /// 获取最佳字幕路径（查找本地或从视频流提取）
    /// </summary>
    public static async Task<string?> GetBestSubtitleAsync(string videoPath)
    {
        var dir = Path.GetDirectoryName(videoPath);
        var fileName = Path.GetFileNameWithoutExtension(videoPath);
        if (string.IsNullOrEmpty(dir)) return null;
        // 优先查找本地已有字幕文件(优先ass)
        string[] searchSuffixes = [".zh.ass", ".hi.ass", ".zh.srt", ".hi.srt"];
        foreach (var suffix in searchSuffixes)
        {
            var path = Path.Combine(dir, fileName + suffix);
            if (File.Exists(path)) return path;
        }

        // 尝试从视频流中提取
        return await ExtractFromVideoAsync(videoPath);
    }

    /// <summary>
    /// 从视频流中提取字幕并保存为临时文件，返回字幕路径
    /// </summary>
    /// <param name="videoPath"></param>
    /// <returns></returns>
    private static async Task<string?> ExtractFromVideoAsync(string videoPath)
    {
        try
        {
            if (!Directory.Exists(TmpDir)) Directory.CreateDirectory(TmpDir);
            // 获取视频媒体信息，查找字幕流
            var mediaInfo = await FFmpeg.GetMediaInfo(videoPath);
            var subtitleStreams = mediaInfo.SubtitleStreams.ToList();
            if (subtitleStreams.Count == 0) return null;
            // 存储候选字幕路径和类型
            var candidates = new List<(SubtitleType Type, string Path)>();
            foreach (var stream in subtitleStreams)
            {
                var lang = (stream.Language ?? "").ToLower();
                // 仅处理中文字幕流 (chi/zho/zh)
                if (lang != "chi" && lang != "zho" && lang != "zh") continue;
                // 忽略图形字幕 (PGS/DVD等)，因为无法直接做文本检测
                if (stream.Codec.Contains("pgs", StringComparison.OrdinalIgnoreCase) ||
                    stream.Codec.Contains("dvd", StringComparison.OrdinalIgnoreCase))
                {
                    Logger.Debug("[SubtitleExtractor] 跳过 {Video} 图形字幕流 {Index} 语言={Lang} 编解码={Codec}", videoPath,
                        stream.Index, lang, stream.Codec);
                    continue;
                }

                var tmpPath = Path.Combine(TmpDir, $"sub_{Guid.NewGuid()}_{stream.Index}.srt");
                // 提取流并保存为 SRT
                await FFmpeg.Conversions.New()
                    .AddStream(stream)
                    .SetOutput(tmpPath)
                    .Start();
                if (!File.Exists(tmpPath)) continue;
                // 读取文件样本进行语言类型检测
                var sample = await ReadFileSampleAsync(tmpPath);
                var type = DetectType(sample);
                Logger.Information("[SubtitleExtractor] 视频 {Video} 流 {Index} 语种={Lang} 检测类型={Type}", videoPath,
                    stream.Index, lang, type);
                candidates.Add((type, tmpPath));
            }

            // 优先级逻辑：简体 > 未知/普通中文 > 繁体 > 粤语
            return candidates
                .OrderBy(c => c.Type switch
                {
                    SubtitleType.Simplified => 1,
                    SubtitleType.Unknown => 2,
                    SubtitleType.Traditional => 3,
                    SubtitleType.Cantonese => 4,
                    _ => 5
                })
                .Select(c => c.Path)
                .FirstOrDefault();
        }
        catch (Exception ex)
        {
            Logger.Warning(ex, "[SubtitleExtractor] 提取字幕失败: {Video}", videoPath);
            return null;
        }
    }

    /// <summary>
    /// 基于文本特征检测字幕类型（简体/繁体/粤语/未知）
    /// </summary>
    /// <param name="text"></param>
    /// <returns></returns>
    private static SubtitleType DetectType(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return SubtitleType.Unknown;
        // 粤语检测
        if (text.Any(x => CantoneseWords.Contains(x))) return SubtitleType.Cantonese;
        // 简繁特征字频率统计
        var tradScore = 0;
        var simpleScore = 0;
        foreach (var c in text)
        {
            if (TradMarkers.Contains(c)) tradScore++;
            else if (SimpleMarkers.Contains(c)) simpleScore++;
        }

        // 如果繁体特征字比例明显，则判定为繁体
        if (tradScore > simpleScore && tradScore > 2) return SubtitleType.Traditional;
        // 否则默认为简体（或普通中文）
        if (simpleScore >= tradScore && simpleScore > 0) return SubtitleType.Simplified;
        return SubtitleType.Unknown;
    }

    /// <summary>
    /// 读取文件前n字节进行采样
    /// </summary>
    /// <param name="path"></param>
    /// <returns></returns>
    private static async Task<string> ReadFileSampleAsync(string path)
    {
        try
        {
            await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            var buffer = new byte[5000]; // 读取前n字节进行采样
            var read = await stream.ReadAsync(buffer);
            return Encoding.UTF8.GetString(buffer, 0, read);
        }
        catch
        {
            return "";
        }
    }
}