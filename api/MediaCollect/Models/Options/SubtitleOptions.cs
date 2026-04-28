namespace MediaCollect.Models.Options;

/// <summary>
/// 字幕配置
/// </summary>
public class SubtitleOptions
{
    /// <summary>
    /// 执行合并字幕任务的时间
    /// </summary>
    public string CronMergeSubtitle { get; set; } = "0 0 3 * * *";
}