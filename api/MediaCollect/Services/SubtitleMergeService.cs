using MediaCollect.Core.Models.Common;
using MediaCollect.Models.Options;
using Microsoft.Extensions.Options;

namespace MediaCollect.Services;

/// <summary>
/// 弹幕与字幕合并服务
/// </summary>
public class SubtitleMergeService
{
    /// <summary>
    /// 字幕文件后缀
    /// </summary>
    private const string SubtitleSuffix = ".ass";

    /// <summary>
    /// 弹幕文件后缀
    /// </summary>
    private const string DanmuSuffix = ".danmu";

    /// <summary>
    /// 合并文件后缀
    /// </summary>
    private const string MergeSuffix = ".merge";

    /// <summary>
    /// 视频文件扩展名列表
    /// </summary>
    private readonly List<string> _videoExtension = [".mp4", ".mkv", ".avi"];

    private readonly SubtitleOptions _subtitleOptions;

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="subtitleOptions"></param>
    public SubtitleMergeService(IOptions<SubtitleOptions> subtitleOptions)
    {
        _subtitleOptions = subtitleOptions.Value;
    }

    /// <summary>
    /// 开始执行
    /// </summary>
    /// <returns></returns>
    public async Task<OperateResult> Run()
    {
        // 找到所有的视频文件
        var videoFiles = _subtitleOptions.MovieDirectory.Concat(_subtitleOptions.SeriesDirectory)
            .SelectMany(dir =>
            {
                var path = Path.Combine(App.MediaPath, dir);
                if (!Directory.Exists(path)) return [];
                return Directory.GetFiles(path, "*.*", SearchOption.AllDirectories)
                    .Where(x => _videoExtension.Contains(Path.GetExtension(x), StringComparer.CurrentCultureIgnoreCase))
                    .ToList();
            }).ToList();
        // 分批处理
        var batches = videoFiles.Select((file, index) => new { file, index })
            .GroupBy(x => x.index % _subtitleOptions.ConcurrentCount)
            .Select(g => g.Select(x => x.file).ToList())
            .ToList();

        return OperateResult.Success();
    }
}