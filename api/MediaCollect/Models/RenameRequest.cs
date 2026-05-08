namespace MediaCollect.Models;

/// <summary>
/// 批量重命名请求
/// </summary>
public class RenameRequest
{
    /// <summary>
    /// 目标目录
    /// </summary>
    public string TargetDir { get; set; } = string.Empty;

    /// <summary>
    /// 需要重命名的文件扩展名列表，例如 [".mp4", ".mkv"]
    /// </summary>
    public List<string> Extensions { get; set; } = [];

    /// <summary>
    /// 用于提取剧集信息的正则表达式
    /// </summary>
    public string RegexPattern { get; set; } = string.Empty;

    /// <summary>
    /// 集数偏移量
    /// </summary>
    public int Offset { get; set; }

    /// <summary>
    /// 重命名模板，使用 {ep} 作为集数占位符，例如 "Anime_E{ep}"
    /// </summary>
    public string Template { get; set; } = string.Empty;

    /// <summary>
    /// 集数填充位数，例如 2 表示集数 1 会被填充为 "01"
    /// </summary>
    public int Padding { get; set; }
}

/// <summary>
/// 重命名预览结果
/// </summary>
public class RenamePreview
{
    /// <summary>
    /// 原文件名
    /// </summary>
    public string OldName { get; set; } = string.Empty;

    /// <summary>
    /// 新文件名
    /// </summary>
    public string NewName { get; set; } = string.Empty;

    /// <summary>
    /// 状态
    /// </summary>
    public string Status { get; set; } = string.Empty;
}

/// <summary>
/// 执行重命名请求
/// </summary>
public class ExecuteRenameRequest
{
    /// <summary>
    /// 目标目录
    /// </summary>
    public string TargetDir { get; set; } = string.Empty;
    
    /// <summary>
    /// 需要重命名的文件列表
    /// </summary>
    public List<RenamePreview> Items { get; set; } = [];
}