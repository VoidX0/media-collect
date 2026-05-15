using System.ComponentModel;
using System.Text.RegularExpressions;
using MediaCollect.Controllers.Base;
using MediaCollect.Core.Models.Common;
using MediaCollect.Core.Models.Db;
using MediaCollect.Models;
using MediaCollect.Models.Options;
using MediaCollect.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using TaskStatus = MediaCollect.Models.TaskStatus;

namespace MediaCollect.Controllers;

/// <summary>
/// 媒体管理控制器
/// </summary>
[ApiController]
[Description("媒体管理")]
[Route("[controller]/[action]")]
public class CollectMediaController : OrmController<CollectedMedia>
{
    private readonly WebDavService _webDavService;
    private readonly SonarrService _sonarrService;
    private readonly WebDavOptions _webDavOptions;
    private readonly SubtitleOptions _subtitleOptions;

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="webDavService"></param>
    /// <param name="sonarrService"></param>
    /// <param name="webDavOptions"></param>
    /// <param name="subtitleOptions"></param>
    public CollectMediaController(WebDavService webDavService, SonarrService sonarrService,
        IOptions<WebDavOptions> webDavOptions, IOptions<SubtitleOptions> subtitleOptions)
    {
        _webDavService = webDavService;
        _sonarrService = sonarrService;
        _webDavOptions = webDavOptions.Value;
        _subtitleOptions = subtitleOptions.Value;
    }

    /// <summary>
    /// 生成下载任务
    /// </summary>
    /// <param name="sonarrSeries"></param>
    /// <param name="media"></param>
    /// <param name="savePath"></param>
    /// <returns></returns>
    private DownloadTask GenerateTask(List<SonarrSeries> sonarrSeries, CollectedMedia media, string savePath)
    {
        var series = sonarrSeries.FirstOrDefault(x =>
            x.Path.Contains(media.Series, StringComparison.CurrentCultureIgnoreCase));
        var downloadTask = new DownloadTask(media, series);
        var task = Task.Run(async () =>
            await _webDavService.DownloadWithTmp(media.OriginalPath,
                Path.Combine(savePath, $"{media.Episode}{media.FileType}"), () =>
                {
                    downloadTask.Progress = 0;
                    downloadTask.Status = TaskStatus.Downloading;
                    downloadTask.Media.StartTime = DateTimeOffset.Now;
                },
                progress => { downloadTask.Progress = progress; },
                () =>
                {
                    // Sonarr相关操作
                    if (series is not null)
                    {
                        downloadTask.Status = TaskStatus.Processing;
                        Thread.Sleep(10 * 1000); // 等待文件系统稳定
                        _sonarrService.RefreshSeries(series.Id).Wait(); // 刷新剧集
                        Thread.Sleep(60 * 1000); // 等待刷新完成
                        var fileId = _sonarrService.GetRenameEpisode(series.Id).Result; // 获取需要重命名的剧集ID
                        if (fileId is { IsSuccess: true, Content.Count: > 0 })
                        {
                            // 重命名剧集文件
                            _sonarrService.RenameEpisodeFiles(series.Id,
                                fileId.Content.Select(x => x.EpisodeFileId).ToList()).Wait();
                        }
                    }

                    // 保存记录
                    downloadTask.Status = TaskStatus.Completed;
                    downloadTask.Media.EndTime = DateTimeOffset.Now;
                    downloadTask.Media.SavePath = Path.Combine(savePath, $"{media.Episode}{media.FileType}");
                    Db.Insertable(downloadTask.Media).ExecuteReturnSnowflakeIdAsync();
                },
                _ => { downloadTask.Status = TaskStatus.Failed; }
            )
        );
        downloadTask.CurrentTask = task;
        return downloadTask;
    }

    /// <summary>
    /// 添加下载任务
    /// </summary>
    /// <param name="medias"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ActionResult> AddDownloadTask(List<CollectedMedia> medias)
    {
        var sonarrSeries = await _sonarrService.GetSeries();
        foreach (var media in medias)
        {
            // 检查是否已存在下载任务
            if (App.DownloadTasks.Any(x => x.Media.OriginalPath == media.OriginalPath))
                return BadRequest(MessageCodeEnum.TaskExists.ToMessageCode(media.OriginalPath));
            // 检查相同目标任务
            if (App.DownloadTasks.Any(x => x.Media.Episode == media.Episode && x.Media.Series == media.Series))
                return BadRequest(MessageCodeEnum.FileExists.ToMessageCode($"{media.Series} - {media.Episode}"));
            // 检查是否已存在收录记录
            if (await Db.Queryable<CollectedMedia>().AnyAsync(x => x.OriginalPath == media.OriginalPath))
                return BadRequest(MessageCodeEnum.MediaExists.ToMessageCode(media.OriginalPath));
            // 检查目录是否存在
            if (!Directory.Exists(Path.Combine(App.MediaPath, _webDavOptions.SaveDirectory, media.Series)))
                return BadRequest(MessageCodeEnum.SeriesNotExists.ToMessageCode(media.OriginalPath));
        }

        foreach (var media in medias)
        {
            // 添加下载任务
            App.DownloadTasks.Add(
                GenerateTask(sonarrSeries.Content ?? [], media,
                    Path.Combine(App.MediaPath, _webDavOptions.SaveDirectory, media.Series)));
        }

        return Ok();
    }

    /// <summary>
    /// 将媒体标记为已完成
    /// </summary>
    /// <param name="medias"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ActionResult> AddCompleteTask(List<CollectedMedia> medias)
    {
        foreach (var media in medias)
        {
            // 检查是否已存在下载任务
            if (App.DownloadTasks.Any(x => x.Media.OriginalPath == media.OriginalPath))
                return BadRequest(MessageCodeEnum.TaskExists.ToMessageCode(media.OriginalPath));
            // 检查是否已存在收录记录
            if (await Db.Queryable<CollectedMedia>().AnyAsync(x => x.OriginalPath == media.OriginalPath))
                return BadRequest(MessageCodeEnum.MediaExists.ToMessageCode(media.OriginalPath));
            // 设置媒体完成信息
            media.StartTime = DateTimeOffset.Now;
            media.EndTime = DateTimeOffset.Now;
        }

        var result = await Db.AsTenant().UseTranAsync(async () =>
        {
            await Db.Insertable(medias).ExecuteReturnSnowflakeIdListAsync();
        });
        return result.IsSuccess ? Ok() : BadRequest(result.ErrorMessage);
    }

    /// <summary>
    /// 获取下载任务列表
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ActionResult<List<DownloadTask>>> DownloadTasks()
    {
        await Task.CompletedTask;
        var result = App.DownloadTasks.ToList();
        return Ok(result);
    }

    /// <summary>
    /// 获取待处理的Series
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ActionResult<List<PendingSeries>>> PendingSeries()
    {
        var collected = await Db.Queryable<CollectedMedia>().ToListAsync();
        var davSeries = await _webDavService.List();
        var sonarrSeries = await _sonarrService.GetSeries();
        if (!davSeries.IsSuccess || davSeries.Content is null)
            return BadRequest(MessageCodeEnum.WebDavQueryFailed.ToMessageCode());
        // 并行查询每个剧集下的媒体文件
        var tasks = davSeries.Content.Where(x => x.IsCollection).Select(async seriesItem =>
        {
            var media = await _webDavService.List(seriesItem.Path);
            if (!media.IsSuccess || media.Content is null || media.Content.Count == 0) return null; // 没有需要处理的媒体文件
            // 找到对应的信息
            var sonarr = sonarrSeries.Content?.FirstOrDefault(x =>
                x.Path.Contains(seriesItem.Name, StringComparison.CurrentCultureIgnoreCase));
            var missing = await _sonarrService.GetEpisodes(sonarr?.Id ?? 0);
            var missingEpisodes = missing is { IsSuccess: true, Content: not null }
                ? missing.Content.Where(x => !x.HasFile).ToList()
                : [];
            // 转换格式
            var medias = media.Content.Where(mediaItem =>
                    App.DownloadTasks.All(x => x.Media.OriginalPath != mediaItem.Path) && // 已添加下载任务的媒体文件
                    collected.All(x => x.OriginalPath != mediaItem.Path) && // 已收录的媒体文件
                    !mediaItem.IsCollection) // 只处理文件
                .Select(mediaItem => new CollectedMedia
                {
                    OriginalPath = mediaItem.Path,
                    FileSize = mediaItem.ContentLength ?? 0,
                    FileType = Path.GetExtension(mediaItem.Path),
                    Series = seriesItem.Name,
                    Episode = Path.GetFileNameWithoutExtension(mediaItem.Name)
                }).ToList();
            if (medias.Count == 0) return null; // 没有需要处理的媒体文件
            // 返回封装后的信息
            return new PendingSeries
            {
                Series = sonarr ?? new SonarrSeries { Title = seriesItem.Name, Path = seriesItem.Path },
                Medias = medias,
                MissingEpisodes = missingEpisodes
            };
        }).ToArray();
        await Task.WhenAll(tasks);
        var result = tasks.Select(x => x.Result)
            .Where(x => x is not null)
            .OrderBy(x => x?.Series.Title).ToList();
        return Ok(result);
    }

    /// <summary>
    /// 获取弹幕覆盖率信息
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ActionResult<List<DanmuCoverage>>> DanmuCoverage()
    {
        var result = new List<DanmuCoverage>();
        // 获取匹配信息
        var path = _subtitleOptions.SeriesDirectory.Concat(_subtitleOptions.MovieDirectory)
            .Select(x => Path.Combine(App.MediaPath, x))
            .Where(Directory.Exists)
            .ToList();
        // 获取所有视频文件，按目录分组
        var videosByDir = path
            .SelectMany(x => Directory.GetFiles(x, "*.*", SearchOption.AllDirectories)
                .Where(file =>
                    App.VideoExtension.Contains(Path.GetExtension(file), StringComparer.CurrentCultureIgnoreCase)))
            .GroupBy(Path.GetDirectoryName);
        foreach (var group in videosByDir)
        {
            // 解析目录结构
            var dirParts = group.Key?.Split(Path.DirectorySeparatorChar) ?? [];
            if (dirParts.Length < 2) continue;
            var series = dirParts[^2]; // 倒数第二级目录为剧集名称
            // 计算每个视频文件的弹幕覆盖率
            var coverage = result.FirstOrDefault(x => x.Series == series) ?? new DanmuCoverage { Series = series };
            foreach (var video in group)
            {
                // 检查是否有对应的xml,如果有则认为有弹幕
                var nameWithoutExtension = Path.GetFileNameWithoutExtension(video);
                var danmuFile = Path.Combine(Path.GetDirectoryName(video) ?? "", nameWithoutExtension + ".xml");
                // 是否匹配 - S02E01 - 这样的命名方式，如果匹配，代表能解析出季数和集数，否则认为是电影。注意后面的集数可能是两位也可能是三位
                var isMovie = true;
                var seasonNumber = 0;
                var episodeNumber = 0;
                var match = Regex.Match(nameWithoutExtension, @"- S(\d{2})E(\d{2,3}) -", RegexOptions.IgnoreCase);
                if (match.Success)
                {
                    isMovie = false;
                    seasonNumber = int.TryParse(match.Groups[1].Value, out var sNumber)
                        ? sNumber
                        : 0;
                    episodeNumber = int.TryParse(match.Groups[2].Value, out var eNumber) ? eNumber : 0;
                }

                // 添加覆盖率信息
                coverage.Episodes.Add(new CoverageEpisode
                {
                    Title = nameWithoutExtension,
                    Season = seasonNumber,
                    Episode = episodeNumber,
                    IsMovie = isMovie,
                    HaveDanmu = System.IO.File.Exists(danmuFile)
                });
            }

            // 添加剧集信息
            if (result.All(x => x.Series != series))
                result.Add(coverage);
        }

        // 找到到电影分类
        var movieResult = result.Where(x => x.Episodes.All(y => y.IsMovie)).ToList();
        // 排序
        movieResult = movieResult.OrderBy(x => x.Series).ToList();
        foreach (var coverage in movieResult)
        {
            coverage.Episodes = coverage.Episodes.OrderBy(x => x.Title).ToList();
        }

        // 找到剧集分类
        var seriesResult = result.Where(x => x.Episodes.Any(y => !y.IsMovie)).ToList();
        // 排序
        seriesResult = seriesResult.OrderBy(x => x.Series).ToList();
        foreach (var coverage in seriesResult)
        {
            coverage.Episodes = coverage.Episodes.OrderBy(x => x.Season).ThenBy(x => x.Episode).ToList();
        }

        // 合并结果
        result = seriesResult.Concat(movieResult).ToList();
        return Ok(result);
    }

    /// <summary>
    /// 删除已完成的任务记录
    /// </summary>
    /// <param name="medias"></param>
    /// <returns></returns>
    [HttpDelete]
    public async Task<ActionResult> RemoveCompleteTask(List<CollectedMedia> medias)
    {
        foreach (var media in medias)
        {
            var record = await Db.Queryable<CollectedMedia>()
                .FirstAsync(x => x.OriginalPath == media.OriginalPath);
            if (record is null) continue;
            // 如果有对应的任务，把任务也删除
            var task = App.DownloadTasks.FirstOrDefault(x => x.Media.OriginalPath == record.OriginalPath);
            if (task is not null)
            {
                task.CurrentTask?.Wait(10 * 1000); // 等待任务完成
                App.DownloadTasks.TryTake(out _); // 从任务列表中移除
            }

            // 删除文件
            if (!string.IsNullOrWhiteSpace(record.SavePath))
            {
                var file = new FileInfo(record.SavePath);
                if (file.Exists) file.Delete();
            }

            // 删除记录
            await Db.Deleteable(record).ExecuteCommandAsync();
        }

        return Ok();
    }
}