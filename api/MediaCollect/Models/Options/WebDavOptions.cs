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
    /// 媒体原存储目录(webdav)
    /// </summary>
    public string MediaDirectory { get; set; } = string.Empty;

    /// <summary>
    /// 媒体保存目录(本地，基于/media)
    /// </summary>
    public string SaveDirectory { get; set; } = string.Empty;
}