using System.ComponentModel;

namespace MediaCollect.Core.Models.Common;

public static class MessageCodeEnumExtension
{
    /// <summary>
    /// 将 MessageCodeEnum 转换为 MessageCode
    /// </summary>
    /// <param name="code">消息代码枚举</param>
    /// <param name="args">参数列表</param>
    /// <returns></returns>
    public static MessageCode ToMessageCode(this MessageCodeEnum code, params object[] args) =>
        new(code, args);
}

/// <summary>
/// 消息代码
/// </summary>
public enum MessageCodeEnum
{
    [Description("无权限访问")] Unauthorized,
    [Description("文件不能为空")] FileEmpty,
    [Description("文件不能超过{0}")] FileSizeLimit,

    #region OrmController

    [Description("参数错误: {0}")] ParamError,
    [Description("导出数据为空")] ExportDataEmpty,
    [Description("生成Excel文件失败")] ExcelExportFailed,

    #endregion

    #region AuthenticationController

    [Description("暂未开放公开注册，如需注册请联系管理员")] RegisterNotOpen,
    [Description("验证账号不能为空")] AccountRequired,
    [Description("邮箱格式错误")] EmailFormatError,
    [Description("该邮箱已被注册")] EmailExists,
    [Description("发送验证码过于频繁，请稍后再试")] VerifyCodeFrequent,
    [Description("一小时内最多发送{0}次验证码，请稍后再试")] VerifyCodeLimit,
    [Description("用户不存在")] UserNotFound,
    [Description("密码或验证码错误")] PasswordError,
    [Description("没有权限进行此操作: {0}")] NoPermissionAction,
    [Description("该记录已存在")] EntityExists,
    [Description("解密失败")] DecryptError,
    [Description("包含无效的标识: {0}")] InvalidEntity,
    [Description("该授权已存在")] GrantExists,
    [Description("该授权不存在")] GrantNotFound,
    [Description("禁止删除当前登录用户")] DeleteSelfForbidden,
    [Description("角色不存在")] RoleNotFound,
    [Description("控制器不存在")] ControllerNotFound,
    [Description("token无效或已过期")] TokenInvalidOrExpired,
    [Description("无效的ID")] InvalidId,
    [Description("用户未设置头像")] AvatarNotFound,

    #endregion

    #region CollectMediaController

    [Description("WebDav查询失败")] WebDavQueryFailed,
    [Description("该任务已存在")] TaskExists,
    [Description("该剧集目录不存在")] SeriesNotExists

    #endregion
}