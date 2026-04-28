namespace MediaCollect.Models.Options;

/// <summary>
/// 字幕配置
/// </summary>
public class SubtitleOptions
{
    /// <summary>
    /// 并发处理数量
    /// </summary>
    public int ConcurrentCount { get; set; } = 5;

    /// <summary>
    /// 执行合并字幕任务的时间
    /// </summary>
    public string CronMergeSubtitle { get; set; } = "0 0 3 * * *";

    /// <summary>
    /// 电影存放目录
    /// </summary>
    public List<string> MovieDirectory { get; set; } = [];

    /// <summary>
    /// 剧集存放目录
    /// </summary>
    public List<string> SeriesDirectory { get; set; } = [];
}