using System.ComponentModel;
using MediaCollect.Controllers.Base;
using MediaCollect.Core.Models.Db;
using Microsoft.AspNetCore.Mvc;

namespace MediaCollect.Controllers;

/// <summary>
/// 已处理媒体管理
/// </summary>
[ApiController]
[Description("已处理媒体管理")]
[Route("[controller]/[action]")]
public class CollectedMediaController : OrmController<CollectedMedia>
{
}