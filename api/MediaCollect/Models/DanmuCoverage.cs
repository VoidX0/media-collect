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
    /// 季覆盖率列表
    /// </summary>
    public List<CoverageSeason> Seasons { get; set; } = [];
}

/// <summary>
/// 季覆盖率
/// </summary>
public class CoverageSeason
{
    /// <summary>
    /// 季名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 集数覆盖率，键为集数，值为是否覆盖
    /// </summary>
    public Dictionary<string, bool> EpisodeCoverage { get; set; } = new();
}