using System.ComponentModel;
using System.Text.RegularExpressions;
using MediaCollect.Models.Options;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Serilog;
using ILogger = Serilog.ILogger;

namespace MediaCollect.Controllers;

/// <summary>
/// 垃圾清理
/// </summary>
[ApiController]
[Description("垃圾清理")]
[Route("[controller]/[action]")]
public class CleanupController : ControllerBase
{
    private readonly SubtitleOptions _subtitleOptions;
    private ILogger Logger => Log.ForContext<CleanupController>();

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="subtitleOptions"></param>
    public CleanupController(IOptions<SubtitleOptions> subtitleOptions)
    {
        _subtitleOptions = subtitleOptions.Value;
    }

    /// <summary>
    /// 查找没有对应视频的垃圾文件
    /// </summary>
    /// <returns></returns>
    private List<string> GetSeriesTrash()
    {
        // 媒体目录
        var paths = _subtitleOptions.SeriesDirectory
            .Select(x => Path.Combine(App.MediaPath, x))
            .Where(Directory.Exists)
            .ToList();
        // 匹配正则
        const string pattern = @"S\d{2}E\d{2}";
        // 获取所有文件，并按文件夹物理分组
        var allFilesByDir = paths
            .SelectMany(x => Directory.GetFiles(x, "*.*", SearchOption.AllDirectories))
            .GroupBy(Path.GetDirectoryName);
        // 存放垃圾文件的列表
        var trashFiles = new List<string>();
        foreach (var group in allFilesByDir)
        {
            var currentDirFiles = group.ToList();
            // 识别该目录下所有的主体（视频文件的主文件名）
            var videoBaseNames = currentDirFiles
                .Where(x => App.VideoExtension.Contains(Path.GetExtension(x), StringComparer.OrdinalIgnoreCase))
                .Select(Path.GetFileNameWithoutExtension)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            // 识别该目录下所有符合 SxxExx 的疑似关联文件
            var otherFiles = currentDirFiles
                .Where(x => !App.VideoExtension.Contains(Path.GetExtension(x), StringComparer.OrdinalIgnoreCase))
                .Where(x => Regex.IsMatch(Path.GetFileName(x), pattern, RegexOptions.IgnoreCase));
            foreach (var otherFile in otherFiles)
            {
                var otherBaseName = Path.GetFileNameWithoutExtension(otherFile);
                // 判定逻辑:
                // 情况 A：文件名完全等于视频名
                // 情况 B：文件名是 视频名.
                // 情况 C：文件名是 视频名-
                var isSafe = videoBaseNames.Any(v =>
                    otherBaseName.Equals(v, StringComparison.OrdinalIgnoreCase) ||
                    otherBaseName.StartsWith(v + ".", StringComparison.OrdinalIgnoreCase) ||
                    otherBaseName.StartsWith(v + "-", StringComparison.OrdinalIgnoreCase)
                );
                if (!isSafe) trashFiles.Add(otherFile);
            }
        }

        return trashFiles.OrderBy(x => x).ToList();
    }

    /// <summary>
    /// 删除剧集目录垃圾
    /// </summary>
    /// <returns></returns>
    [HttpDelete]
    public async Task<ActionResult> DeleteSeriesTrash()
    {
        var trashFiles = GetSeriesTrash();
        foreach (var file in trashFiles)
        {
            try
            {
                System.IO.File.Delete(file);
            }
            catch (Exception ex)
            {
                Logger.Warning(ex, "删除垃圾文件失败: {FilePath}", file);
            }
        }

        await Task.CompletedTask;
        return Ok();
    }

    /// <summary>
    /// 剧集目录垃圾
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ActionResult<List<string>>> SeriesTrash()
    {
        await Task.CompletedTask;
        return Ok(GetSeriesTrash());
    }
}
