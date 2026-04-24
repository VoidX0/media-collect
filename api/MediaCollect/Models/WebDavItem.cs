namespace MediaCollect.Models;

/// <summary>
/// WebDav资源项
/// </summary>
public class WebDavItem
{
    /// <summary>
    /// 名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 路径
    /// </summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// 大小（字节）
    /// </summary>
    public long? ContentLength { get; set; }

    /// <summary>
    /// 是否为目录
    /// </summary>
    public bool IsCollection { get; set; }

    /// <summary>
    /// 最后修改时间
    /// </summary>
    public DateTime? LastModifiedDate { get; set; }
}