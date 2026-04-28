using MediaCollect.Core.Models.Common;

namespace MediaCollect.Services;

/// <summary>
/// 弹幕与字幕合并服务
/// </summary>
public class SubtitleMergeService
{
    /// <summary>
    /// 开始执行
    /// </summary>
    /// <returns></returns>
    public async Task<OperateResult> Run()
    {
        return OperateResult.Success();
    }
}