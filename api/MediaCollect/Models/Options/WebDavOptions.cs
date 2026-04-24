namespace MediaCollect.Models.Options;

/// <summary>
/// WebDAV配置
/// </summary>
public class WebDavOptions
{
    /// <summary>
    /// 服务器地址
    /// </summary>
    public string Uri { get; set; } = string.Empty;

    /// <summary>
    /// 用户名
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 密码
    /// </summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// 媒体存储目录
    /// </summary>
    public string MediaDirectory { get; set; } = string.Empty;
}