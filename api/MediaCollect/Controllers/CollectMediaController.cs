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

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="webDavService"></param>
    public CollectMediaController(WebDavService webDavService)
    {
        _webDavService = webDavService;
    }

    /// <summary>
    /// 生成下载任务
    /// </summary>
    /// <param name="media"></param>
    /// <param name="savePath"></param>
    /// <returns></returns>
    private DownloadTask GenerateTask(CollectedMedia media, string savePath)
    {
        var downloadTask = new DownloadTask(media);
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
                    downloadTask.Status = TaskStatus.Completed;
                    downloadTask.Media.EndTime = DateTimeOffset.Now;
                    downloadTask.Media.SavePath = Path.Combine(savePath, $"{media.Episode}{media.FileType}");
                    Db.Insertable(downloadTask.Media).ExecuteCommand();
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
        await Task.CompletedTask;
        foreach (var media in medias)
        {
            // 检查是否已存在下载任务
            if (App.DownloadTasks.Any(x => x.Media.OriginalPath == media.OriginalPath))
                return BadRequest(MessageCodeEnum.TaskExists.ToMessageCode(media.OriginalPath));
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
            App.DownloadTasks.Add(GenerateTask(media, Path.Combine(App.MediaPath, media.Series)));
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
        return Ok(App.DownloadTasks);
    }

    /// <summary>
    /// 获取待处理的媒体文件列表
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public async Task<ActionResult<List<CollectedMedia>>> PendingMedia()
    {
        var collected = await Db.Queryable<CollectedMedia>().ToListAsync();
        var series = await _webDavService.List();
        if (!series.IsSuccess || series.Content is null)
            return BadRequest(MessageCodeEnum.WebDavQueryFailed.ToMessageCode());
        // 并行查询每个剧集下的媒体文件
        var tasks = series.Content.Where(x => x.IsCollection).Select(async seriesItem =>
        {
            var media = await _webDavService.List(seriesItem.Path);
            if (!media.IsSuccess || media.Content is null) return [];
            return media.Content.Where(mediaItem =>
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
        }).ToArray();
        await Task.WhenAll(tasks);
        var result = tasks.SelectMany(x => x.Result).OrderBy(x => x.Series).ThenBy(x => x.Episode).ToList();
        return Ok(result);
    }
}