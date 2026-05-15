namespace MediaCollect.Models;

/// <summary>
/// 弹幕覆盖率
/// </summary>
public class DanmuCoverage
{
    /// <summary>
    /// 系列
    /// </summary>
    public string Series { get; set; } = string.Empty;

    /// <summary>
    /// 集覆盖率列表
    /// </summary>
    public List<CoverageEpisode> Episodes { get; set; } = [];
}

/// <summary>
/// 集覆盖率
/// </summary>
public class CoverageEpisode
{
    /// <summary>
    /// 名称
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// 季数
    /// </summary>
    public int Season { get; set; }

    /// <summary>
    /// 集数
    /// </summary>
    public int Episode { get; set; }

    /// <summary>
    /// 是否为电影
    /// </summary>
    public bool IsMovie { get; set; }

    /// <summary>
    /// 是否有弹幕
    /// </summary>
    public bool HaveDanmu { get; set; }
}