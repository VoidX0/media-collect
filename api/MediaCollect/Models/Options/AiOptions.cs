namespace MediaCollect.Models.Options;

/// <summary>
/// AI配置
/// </summary>
public class AiOptions
{
    /// <summary>
    /// AI服务地址
    /// </summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// AI服务API密钥
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// AI模型
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// 超时时间(秒)
    /// </summary>
    public int TimeoutSeconds { get; set; } = 600;
}