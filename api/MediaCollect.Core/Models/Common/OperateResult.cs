namespace MediaCollect.Core.Models.Common;

/// <summary>
/// 操作结果
/// </summary>
/// <param name="IsSuccess">操作结果</param>
/// <param name="Message">消息</param>
/// <param name="Code">消息代码</param>
/// <param name="OperateException">操作异常</param>
public record OperateResult(
    bool IsSuccess,
    string Message,
    MessageCode? Code = null,
    Exception? OperateException = null)
{
    /// <summary>
    /// 操作成功
    /// </summary>
    /// <param name="message">消息</param>
    /// <returns></returns>
    public static OperateResult Success(string message = "") => new(true, message);

    /// <summary>
    /// 操作成功
    /// </summary>
    /// <param name="code">消息代码</param>
    /// <returns></returns>
    public static OperateResult Success(MessageCode code) => new(true, code.Message, code);

    /// <summary>
    /// 操作失败
    /// </summary>
    /// <param name="message">消息</param>
    /// <param name="exception">异常</param>
    /// <returns></returns>
    public static OperateResult Fail(string message = "", Exception? exception = null) =>
        new(false, message, null, exception);

    /// <summary>
    /// 操作失败
    /// </summary>
    /// <param name="code">消息代码</param>
    /// <param name="exception">异常</param>
    /// <returns></returns>
    public static OperateResult Fail(MessageCode code, Exception? exception = null) =>
        new(false, code.Message, code, exception);

    /// <summary>
    /// 尝试执行操作
    /// </summary>
    /// <param name="action">待执行操作</param>
    /// <returns></returns>
    public static OperateResult Execute(Action action)
    {
        try
        {
            action();
            return Success();
        }
        catch (Exception ex)
        {
            return Fail(ex.Message, ex);
        }
    }
}

/// <summary>
/// 操作结果
/// </summary>
/// <param name="IsSuccess">操作成功</param>
/// <param name="Message">消息</param>
/// <param name="Code">消息代码</param>
/// <param name="Content">操作结果</param>
/// <param name="OperateException">异常</param>
/// <typeparam name="T">操作结果类型</typeparam>
public record OperateResult<T>(
    bool IsSuccess,
    string Message,
    MessageCode? Code = null,
    T? Content = default,
    Exception? OperateException = null)
    : OperateResult(IsSuccess, Message, Code, OperateException)
{
    /// <summary>
    /// 操作成功
    /// </summary>
    /// <param name="content">内容</param>
    /// <param name="message">消息</param>
    /// <returns></returns>
    public static OperateResult<T> Success(T content, string message = "") => new(true, message, null, content);

    /// <summary>
    /// 操作成功
    /// </summary>
    /// <param name="content">内容</param>
    /// <param name="code">消息代码</param>
    /// <returns></returns>
    public static OperateResult<T> Success(T content, MessageCode code) => new(true, code.Message, code, content);

    /// <summary>
    /// 操作失败
    /// </summary>
    /// <param name="message">消息</param>
    /// <param name="exception">异常</param>
    /// <returns></returns>
    public new static OperateResult<T> Fail(string message = "", Exception? exception = null) =>
        new(false, message, OperateException: exception);

    /// <summary>
    /// 操作失败
    /// </summary>
    /// <param name="code">消息代码</param>
    /// <param name="exception">异常</param>
    /// <returns></returns>
    public new static OperateResult<T> Fail(MessageCode code, Exception? exception = null) =>
        new(false, code.Message, code, default, exception);

    /// <summary>
    /// 尝试执行操作
    /// </summary>
    /// <param name="func">待执行操作</param>
    /// <returns></returns>
    public static OperateResult<T> Execute(Func<T> func)
    {
        try
        {
            return Success(func());
        }
        catch (Exception ex)
        {
            return Fail(ex.Message, ex);
        }
    }
}