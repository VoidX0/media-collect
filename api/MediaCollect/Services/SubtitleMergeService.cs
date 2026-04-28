using MediaCollect.Core.Models.Common;
using MediaCollect.Models.Options;
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
        // 弹幕文件不存在时跳过
        var danmuFile = Path.Combine(dir, $"{videoName}{DanmuSuffix}{SubtitleSuffix}");
        if (!File.Exists(danmuFile)) return OperateResult.Success();
        // 合并文件已存在时跳过
        var mergeFile = Path.Combine(dir, $"{videoName}{MergeSuffix}{SubtitleSuffix}");
        if (File.Exists(mergeFile)) return OperateResult.Success();
        // 开始处理
        return OperateResult.Success();
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
        var results = await Task.WhenAll(tasks);
        var allResults = results.SelectMany(x => x).ToList();
        var failedResults = allResults.Where(x => !x.IsSuccess).ToList();
        return failedResults.Count != 0
            ? OperateResult.Fail(string.Join(Environment.NewLine, failedResults.Select(x => x.Message)))
            : OperateResult.Success();
    }
}