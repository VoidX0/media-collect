using MediaCollect.Core.Models.Db;

namespace MediaCollect.Models;

/// <summary>
/// 待处理系列信息
/// </summary>
public class PendingSeries
{
    /// <summary>
    /// 媒体列表
    /// </summary>
    public List<CollectedMedia> Medias { get; set; } = [];

    /// <summary>
    /// Sonarr系列信息
    /// </summary>
    public SonarrSeries Series { get; set; } = new();

    /// <summary>
    /// Sonarr缺失的集信息
    /// </summary>
    public List<SonarrEpisode> MissingEpisodes { get; set; } = [];
}