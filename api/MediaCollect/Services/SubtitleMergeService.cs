using System.Diagnostics;
using MediaCollect.Core.Models.Common;
using MediaCollect.Models.Options;
using MediaCollect.Utils.Subtitle;
using Microsoft.Extensions.Options;
using Serilog;
using ILogger = Serilog.ILogger;

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

    private readonly ILogger _logger = Log.ForContext<SubtitleMergeService>();
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
    /// 处理单个视频文件
    /// </summary>
    /// <param name="videoFile"></param>
    /// <returns></returns>
    private async Task<OperateResult> ProcessVideo(string videoFile)
    {
        var dir = Path.GetDirectoryName(videoFile);
        var videoName = Path.GetFileNameWithoutExtension(videoFile);
        if (string.IsNullOrEmpty(dir) || string.IsNullOrEmpty(videoName))
            return OperateResult.Fail($"无法解析视频文件路径: {videoFile}");
        // 弹幕文件不存在时跳过 (xxx.danmu.ass)
        var danmuFile = Path.Combine(dir, $"{videoName}{DanmuSuffix}{SubtitleSuffix}");
        if (!File.Exists(danmuFile)) return OperateResult.Success();
        // 合并文件已存在时跳过 (xxx.merge.ass)
        var mergeFile = Path.Combine(dir, $"{videoName}{MergeSuffix}{SubtitleSuffix}");
        if (File.Exists(mergeFile)) return OperateResult.Success();
        // 开始处理
        _logger.Debug("开始处理视频: {VideoPath}", videoFile);
        var sw = Stopwatch.StartNew();
        try
        {
            // 1. 查找或提取字幕
            var subtitlePath = await SubtitleExtractor.GetBestSubtitleAsync(videoFile);
            if (string.IsNullOrEmpty(subtitlePath) || !File.Exists(subtitlePath))
            {
                _logger.Debug("未找到可用字幕，跳过: {VideoPath}", videoFile);
                return OperateResult.Success();
            }

            // 2. 格式转换
            var assPath = Path.GetExtension(subtitlePath).Equals(SubtitleSuffix, StringComparison.OrdinalIgnoreCase)
                ? subtitlePath
                : SubtitleConverter.SrtToAss(subtitlePath); // 如果是 SRT，转换为 ASS
            // 3. 合并文件
            SubtitleMerger.MergeAssFiles(assPath, danmuFile, mergeFile);

            sw.Stop();
            _logger.Information("处理完成: {VideoPath} (耗时 {Cost} 秒)", videoFile, Math.Round(sw.Elapsed.TotalSeconds, 2));
            return OperateResult.Success();
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "处理视频字幕合并失败: {VideoPath}", videoFile);
            return OperateResult.Fail($"处理失败: {ex.Message}");
        }
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
                    .Where(x =>
                    {
                        // 检查扩展名
                        var extMatch = _videoExtension.Contains(Path.GetExtension(x),
                            StringComparer.CurrentCultureIgnoreCase);
                        if (!extMatch) return false;
                        // 如果路径中包含名为 ".ignore" 的文件夹则跳过
                        var pathParts = x.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                        return !pathParts.Contains(".ignore");
                    })
                    .ToList();
            }).ToList();
        // 分批处理
        var batches = videoFiles.Select((file, index) => new { file, index })
            .GroupBy(x => x.index % _subtitleOptions.ConcurrentCount)
            .Select(g => g.Select(x => x.file).ToList())
            .ToList();
        var tasks = batches.Select(batch => Task.Run(async () =>
        {
            var batchResult = new List<OperateResult>();
            foreach (var videoFile in batch)
            {
                var result = await ProcessVideo(videoFile);
                batchResult.Add(result);
            }

            return batchResult;
        })).ToList();
        // 等待所有批次完成
        await Task.WhenAll(tasks);
        return OperateResult.Success();
    }
}