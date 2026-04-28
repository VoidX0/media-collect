using System.Diagnostics;
using Hangfire;
using MediaCollect.Models.Options;
using Microsoft.Extensions.Options;
using Serilog;
using SqlSugar;
using SqlSugar.IOC;
using ILogger = Serilog.ILogger;

namespace MediaCollect.Services;

/// <summary>
/// 定时任务
/// </summary>
public class ScheduledJob
{
    private ISqlSugarClient Db { get; } = DbScoped.SugarScope;

    /// <summary>
    /// 日志
    /// </summary>
    private ILogger Logger { get; } = Log.ForContext<ScheduledJob>();

    private readonly SubtitleMergeService _subtitleMergeService;

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="recurringJob">定时任务管理器</param>
    /// <param name="subtitleOptions">字幕选项</param>
    /// <param name="subtitleMergeService">字幕合并服务</param>
    public ScheduledJob(IRecurringJobManager recurringJob,
        IOptions<SubtitleOptions> subtitleOptions, SubtitleMergeService subtitleMergeService)
    {
        _subtitleMergeService = subtitleMergeService;
        recurringJob.AddOrUpdate(
            "MergeSubtitle",
            () => MergeSubtitle(),
            subtitleOptions.Value.CronMergeSubtitle,
            options: new RecurringJobOptions { TimeZone = TimeZoneInfo.Local });
    }

    /// <summary>
    /// 合并弹幕与字幕
    /// </summary>
    public async Task MergeSubtitle()
    {
        var watch = Stopwatch.StartNew();
        var result = await _subtitleMergeService.Run();
        watch.Stop();
        if (result.IsSuccess)
            Logger.Information("合并弹幕与字幕完成, 耗时: {Time}ms", watch.ElapsedMilliseconds);
        else
            Logger.Error(result.OperateException,
                "合并弹幕与字幕失败, 错误信息: {Error}, 耗时: {Time}ms",
                result.Message, watch.ElapsedMilliseconds);
    }
}