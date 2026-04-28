using System.ComponentModel;
using MediaCollect.Core.Models.Db;

namespace MediaCollect.Models;

/// <summary>
/// 下载任务
/// </summary>
public class DownloadTask
{
    /// <summary>
    /// 媒体信息
    /// </summary>
    public CollectedMedia Media { get; set; }

    /// <summary>
    /// Sonarr系列
    /// </summary>
    public SonarrSeries? Series { get; set; }

    /// <summary>
    /// 当前任务
    /// </summary>
    public Task? CurrentTask { get; set; }

    /// <summary>
    /// 任务状态
    /// </summary>
    public TaskStatus Status { get; set; }

    /// <summary>
    /// 下载进度
    /// </summary>
    public double Progress { get; set; }

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="media"></param>
    /// <param name="series"></param>
    /// <param name="status"></param>
    /// <param name="progress"></param>
    public DownloadTask(CollectedMedia media, SonarrSeries? series = null,
        TaskStatus status = TaskStatus.Pending, double progress = 0)
    {
        Media = media;
        Series = series;
        Status = status;
        Progress = progress;
    }
}

/// <summary>
/// 下载任务状态
/// </summary>
public enum TaskStatus
{
    [Description("待处理")] Pending = 1,
    [Description("下载中")] Downloading = 2,
    [Description("Sonarr处理中")] Processing = 3,
    [Description("已完成")] Completed = 4,
    [Description("下载失败")] Failed = 5,
}