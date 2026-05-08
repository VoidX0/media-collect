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
    /// 查找每个每个剧集下的字幕垃圾
    /// </summary>
    /// <returns></returns>
    private List<string> GetSeriesSubtitleTrash()
    {
        var trashFiles = new List<string>();
        foreach (var baseDir in _subtitleOptions.SeriesDirectory)
        {
            var fullPath = Path.Combine(App.MediaPath, baseDir);
            if (!Directory.Exists(fullPath)) continue;
            // 获取该目录下所有的 .ass 文件 (包含子目录)
            var allAssFiles = Directory.EnumerateFiles(fullPath, "*.ass", SearchOption.AllDirectories);
            foreach (var file in allAssFiles)
            {
                var fileName = Path.GetFileName(file);
                // 检查: 是否包含 .1.ass 到 .9.ass
                var isPotentialTrash = Enumerable.Range(1, 9).Any(i => fileName.Contains($".{i}.ass"));
                if (!isPotentialTrash) continue;
                // 检查：是否包含对应弹幕
                var directoryName = Path.GetDirectoryName(file);
                var nameWithoutExtension = Path.GetFileNameWithoutExtension(Path.GetFileNameWithoutExtension(file));
                var danmuFile = Path.Combine(directoryName ?? "", nameWithoutExtension + ".danmu.ass");
                // 如果对应的弹幕文件存在，则将当前文件加入垃圾列表
                if (System.IO.File.Exists(danmuFile)) trashFiles.Add(file);
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
    /// 删除剧集目录字幕垃圾
    /// </summary>
    /// <returns></returns>
    [HttpDelete]
    public async Task<ActionResult> DeleteSeriesSubtitleTrash()
    {
        var trashFiles = GetSeriesSubtitleTrash();
        foreach (var file in trashFiles)
        {
            try
            {
                System.IO.File.Delete(file);
            }
            catch (Exception ex)
            {
                Logger.Warning(ex, "删除垃圾字幕文件失败: {FilePath}", file);
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

    /// <summary>
    /// 剧集目录字幕垃圾
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ActionResult<List<string>>> SeriesSubtitleTrash()
    {
        await Task.CompletedTask;
        return Ok(GetSeriesSubtitleTrash());
    }
}