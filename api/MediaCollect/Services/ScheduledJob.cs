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

    /// <summary>
    /// 系统选项
    /// </summary>
    private SystemOptions SystemOptions { get; }

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="recurringJob">定时任务管理器</param>
    /// <param name="systemOptions">系统选项</param>
    public ScheduledJob(IRecurringJobManager recurringJob, IOptions<SystemOptions> systemOptions)
    {
        SystemOptions = systemOptions.Value;
    }
}