using System.ComponentModel;
using System.Text.RegularExpressions;
using MediaCollect.Models;
using MediaCollect.Models.Options;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Serilog;
using ILogger = Serilog.ILogger;

namespace MediaCollect.Controllers;

/// <summary>
/// 批量重命名
/// </summary>
[ApiController]
[Description("批量重命名")]
[Route("[controller]/[action]")]
public class RenameController : ControllerBase
{
    private readonly SubtitleOptions _subtitleOptions;
    private ILogger Logger => Log.ForContext<RenameController>();

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="subtitleOptions"></param>
    public RenameController(IOptions<SubtitleOptions> subtitleOptions)
    {
        _subtitleOptions = subtitleOptions.Value;
    }

    /// <summary>
    /// 校验路径是否在允许的 SeriesDirectory 中
    /// </summary>
    /// <param name="path"></param>
    /// <returns></returns>
    private bool IsPathAllowed(string path)
    {
        var fullPath = Path.GetFullPath(path);
        if(!Directory.Exists(fullPath)) return false;
        return _subtitleOptions.SeriesDirectory.Any(x =>
            fullPath.StartsWith(Path.GetFullPath(Path.Combine(App.MediaPath, x)), StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// 预览重命名结果
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ActionResult<List<RenamePreview>>> PreviewRename(RenameRequest req)
    {
        await Task.CompletedTask;
        if (!IsPathAllowed(req.TargetDir)) return Ok(new List<RenamePreview>());

        var files = Directory.GetFiles(req.TargetDir)
            .Where(x => req.Extensions.Contains(Path.GetExtension(x).TrimStart('.')))
            .ToList();

        var results = files.Select(f =>
        {
            var name = Path.GetFileName(f);
            var match = Regex.Match(name, req.RegexPattern);
            if (!match.Success) return new RenamePreview { OldName = name, Status = "❌ 未匹配" };

            try
            {
                var ep = int.Parse(match.Groups[1].Value) + req.Offset;
                var newName = req.Template.Replace("{ep}", ep.ToString("D" + req.Padding)) + Path.GetExtension(f);
                return new RenamePreview { OldName = name, NewName = newName, Status = "✅ 待重命名" };
            }
            catch (Exception ex)
            {
                Logger.Error(ex, "预览重命名失败: {Name}", name);
                return new RenamePreview { OldName = name, Status = "⚠️ 转换错误" };
            }
        });
        return Ok(results);
    }

    /// <summary>
    /// 执行重命名
    /// </summary>
    /// <param name="req"></param>
    /// <returns></returns>
    [HttpPost]
    public async Task<ActionResult> ExecuteRename(ExecuteRenameRequest req)
    {
        await Task.CompletedTask;
        // 校验目标目录
        if (!IsPathAllowed(req.TargetDir)) return BadRequest("Unauthorized target directory");
        var success = 0;
        var failed = 0;
        foreach (var item in req.Items)
        {
            var oldPath = Path.Combine(req.TargetDir, item.OldName);
            var newPath = Path.Combine(req.TargetDir, item.NewName);

            try
            {
                if (!System.IO.File.Exists(oldPath)) continue;
                if (System.IO.File.Exists(newPath))
                {
                    Logger.Warning("重命名跳过，目标已存在: {NewName}", item.NewName);
                    failed++;
                    continue;
                }

                System.IO.File.Move(oldPath, newPath);
                success++;
            }
            catch (Exception ex)
            {
                Logger.Error(ex, "重命名失败: {OldName}", item.OldName);
                failed++;
            }
        }

        return Ok(new { success, failed });
    }
}