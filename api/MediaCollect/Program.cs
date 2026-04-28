using System.Collections.Concurrent;
using MediaCollect;
using MediaCollect.Core.Models.Common;
using MediaCollect.Core.Utils.Extension;
using MediaCollect.Models;
using MediaCollect.Services;
using MediaCollect.Utils.Extension;
using MediaCollect.Utils.Middleware;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

builder.InitConfiguration(); // 初始化配置源
// Add services to the container.
builder.Services.AddControllers(x =>
    {
        // 权限过滤器
        x.Filters.Add<ApiAuthorizationFilter>();
        // 全局响应类型
        x.Filters.Add(new ProducesResponseTypeAttribute(StatusCodes.Status200OK));
        x.Filters.Add(new ProducesResponseTypeAttribute(typeof(MessageCode), StatusCodes.Status400BadRequest));
    })
    .AddJsonOptions(options => options.JsonSerializerOptions.ConfigureOptions()); // Controller
builder.Services.AddValidation(); // 数据验证
builder.Services.AddEndpointsApiExplorer();
builder.InitOptions(); // 初始化Options
builder.InitEncryption(); // 初始化加密信息
builder.InitStorage(); // 初始化Storage
builder.ConfigureLog(); // 配置日志
builder.ConfigureSerilogUi(); // 配置SerilogUI
builder.ConfigureApiReference(); // 配置API文档
builder.ConfigureHangfire(); // 配置Hangfire
builder.ConfigureJwt(); // 配置Jwt
builder.ConfigureDb(); // 配置数据库
builder.Services.AddSingleton<SmtpService>(); // SMTP邮箱服务
builder.Services.AddSingleton<AiService>(); // AI服务
builder.Services.AddSingleton<ScheduledJob>(); // 定时任务
builder.Services.AddSingleton<WebDavService>(); // WebDav服务
builder.Services.AddSingleton<SonarrService>(); // Sonarr服务
builder.Services.AddSingleton<SubtitleMergeService>(); // 字幕合并服务

// 构建App
var app = builder.Build();
App.Application = app; // 全局App
await app.FfmpegInit(); // ffmpeg初始化
await app.CleanTmp(); // 启动时清理临时文件
app.ApiLogs(); // 启用API日志
app.ApiReference(); // 启用API参考
app.ApiHangfire(); // 启用Hangfire仪表盘
app.Serilog(); // 启用Serilog请求日志

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Services.GetService<ScheduledJob>(); // 启动定时任务
// 启动App
app.Run();

namespace MediaCollect
{
    /// <summary>
    /// 全局App
    /// </summary>
    public static class App
    {
        /// <summary>
        /// WebApplication
        /// </summary>
        public static WebApplication? Application
        {
            get;
            set
            {
                field = value;
                Services = value?.Services;
            }
        }

        /// <summary>
        /// ServiceProvider
        /// </summary>
        public static IServiceProvider? Services { get; private set; }

        /// <summary>
        /// 本地挂载媒体目录
        /// </summary>
        public static string MediaPath => Path.Combine("/media");

        /// <summary>
        /// 全局下载任务列表
        /// </summary>
        public static ConcurrentBag<DownloadTask> DownloadTasks { get; } = [];
    }
}