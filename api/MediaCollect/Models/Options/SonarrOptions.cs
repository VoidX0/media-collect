namespace MediaCollect.Models.Options;

/// <summary>
/// Sonarr配置
/// </summary>
public class SonarrOptions
{
    /// <summary>
    /// 服务器地址
    /// </summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// API密钥
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;
}