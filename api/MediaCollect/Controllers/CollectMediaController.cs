using System.ComponentModel;
using MediaCollect.Controllers.Base;
using MediaCollect.Core.Models.Common;
using MediaCollect.Core.Models.Db;
using MediaCollect.Models;
using MediaCollect.Services;
using Microsoft.AspNetCore.Mvc;
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

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="webDavService"></param>
    /// <param name="sonarrService"></param>
    public CollectMediaController(WebDavService webDavService, SonarrService sonarrService)
    {
        _webDavService = webDavService;
        _sonarrService = sonarrService;
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
            if (!Directory.Exists(Path.Combine(App.MediaPath, media.Series)))
                return BadRequest(MessageCodeEnum.SeriesNotExists.ToMessageCode(media.OriginalPath));
        }

        foreach (var media in medias)
        {
            // 添加下载任务
            App.DownloadTasks.Add(
                GenerateTask(sonarrSeries.Content ?? [], media, Path.Combine(App.MediaPath, media.Series)));
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
            media.SavePath = Path.Combine(App.MediaPath, media.Series, $"{media.Episode}{media.FileType}");
            media.StartTime = DateTimeOffset.Now;
            media.EndTime = DateTimeOffset.Now;
            await Db.Insertable(media).ExecuteReturnSnowflakeIdAsync();
        }

        return Ok();
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
            if (!media.IsSuccess || media.Content is null) return null; // 没有需要处理的媒体文件
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
            var file = new FileInfo(record.SavePath);
            if (file.Exists) file.Delete();
            // 删除记录
            await Db.Deleteable(record).ExecuteCommandAsync();
        }

        return Ok();
    }
}