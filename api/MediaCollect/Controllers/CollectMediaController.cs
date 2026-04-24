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
    /// 添加下载任务
    /// </summary>
    /// <param name="media"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ActionResult> AddDownloadTask(CollectedMedia media)
    {
        await Task.CompletedTask;
        // 检查是否已存在下载任务
        if (App.DownloadTasks.Any(x => x.Media.OriginalPath == media.OriginalPath))
            return BadRequest(MessageCodeEnum.TaskExists.ToMessageCode());
        // 检查目录是否存在
        var savePath = Path.Combine(App.MediaPath, media.Series);
        if (!Directory.Exists(savePath)) return BadRequest(MessageCodeEnum.SeriesNotExists.ToMessageCode());
        // 添加下载任务
        var downloadTask = new DownloadTask(media);
        var task = Task.Run(async () =>
            await _webDavService.DownloadWithTmp(media.OriginalPath,
                $"{savePath}/{media.Episode}{media.FileType}", () =>
                {
                    downloadTask.Progress = 0;
                    downloadTask.Status = TaskStatus.Downloading;
                },
                progress => { downloadTask.Progress = progress; },
                () => { downloadTask.Status = TaskStatus.Completed; },
                _ => { downloadTask.Status = TaskStatus.Failed; }
            )
        );
        downloadTask.CurrentTask = task;
        App.DownloadTasks.Add(downloadTask); // 添加到全局下载任务列表
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
        // 遍历处理系列
        var result = new List<CollectedMedia>();
        foreach (var seriesItem in series.Content)
        {
            if (!seriesItem.IsCollection) continue; // 只处理文件夹
            var media = await _webDavService.List(seriesItem.Path);
            if (!media.IsSuccess || media.Content is null) continue;
            // 遍历处理媒体文件
            foreach (var mediaItem in media.Content)
            {
                if (collected.Any(x => x.OriginalPath == mediaItem.Path)) continue; // 已收录的媒体文件
                if (App.DownloadTasks.Any(x => x.Media.OriginalPath == mediaItem.Path)) continue; // 已添加下载任务的媒体文件
                if (mediaItem.IsCollection) continue; // 只处理文件
                result.Add(new CollectedMedia
                {
                    OriginalPath = mediaItem.Path,
                    FileSize = mediaItem.ContentLength ?? 0,
                    FileType = Path.GetExtension(mediaItem.Path),
                    Series = seriesItem.Name,
                    Episode = Path.GetFileNameWithoutExtension(mediaItem.Name)
                });
            }
        }

        result = result.OrderBy(x => x.Series).ThenBy(x => x.Episode).ToList();
        return Ok(result);
    }
}