namespace MediaCollect.Models;

/// <summary>
/// Sonarr系列
/// </summary>
public class SonarrSeries
{
    /// <summary>
    /// ID
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// 标题
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// 路径
    /// </summary>
    public string Path { get; set; } = string.Empty;
}

/// <summary>
/// Sonarr集
/// </summary>
public class SonarrEpisode
{
    /// <summary>
    /// 季
    /// </summary>
    public int SeasonNumber { get; set; }

    /// <summary>
    /// 集
    /// </summary>
    public int EpisodeNumber { get; set; }

    /// <summary>
    /// 是否有文件
    /// </summary>
    public bool HasFile { get; set; }
}

/// <summary>
/// Sonarr需要重命名的文件
/// </summary>
public class SonarrRename
{
    /// <summary>
    /// 需要重命名的文件ID
    /// </summary>
    public int EpisodeFileId { get; set; }
}