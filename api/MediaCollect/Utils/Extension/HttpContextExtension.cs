using MediaCollect.Core.Models.Db;
using SqlSugar;

namespace MediaCollect.Utils.Extension;

/// <summary>
/// HttpContext扩展
/// </summary>
public static class HttpContextExtension
{
    /// <param name="httpContext"></param>
    extension(HttpContext httpContext)
    {
        /// <summary>
        /// 认证用户权限
        /// </summary>
        /// <param name="db">当前Context</param>
        /// <param name="user">用户信息</param>
        /// <param name="controllerId">控制器Id</param>
        /// <returns>授权结果</returns>
        private bool AuthenticateUserPermission(ISqlSugarClient db, SystemUser user, long controllerId)
        {
            // 检查用户特权
            var hasUserGrant = db.Queryable<SystemGrantUser>()
                .Any(x => x.UserId == user.Id && x.ControllerId == controllerId);
            if (hasUserGrant) return true;

            // 检查角色权限
            if (user.Role.Count == 0) return false;
            var roleHasGrant = db.Queryable<SystemGrantRole>()
                .Where(x => user.Role.Contains(x.RoleId) && x.ControllerId == controllerId)
                .Any();
            return roleHasGrant;
        }

        /// <summary>
        /// 认证用户是否授权控制器
        /// </summary>
        /// <param name="db">当前Context</param>
        /// <param name="controller">控制器</param>
        /// <returns>授权结果</returns>
        public bool Authenticate(ISqlSugarClient db, string? controller = null)
        {
            // 解析用户信息
            var user = httpContext.User.Claims.Parsing();
            if (user is null) return false;

            // 平台超级管理员
            if (user.IsPlatformAdmin) return true;

            // 获取目标控制器信息
            if (string.IsNullOrEmpty(controller))
                controller = httpContext.Request.RouteValues["controller"]?.ToString();
            if (controller != null && !controller.EndsWith("Controller")) controller = $"{controller}Controller";
            var dbController = db.Queryable<SystemController>().First(x => x.Controller == controller);
            if (dbController == null) return false; // 控制器不存在
            // RBAC 权限
            return httpContext.AuthenticateUserPermission(db, user, dbController.Id);
        }

        /// <summary>
        /// 判断用户是否登录
        /// </summary>
        /// <returns></returns>
        public bool IsLogin()
        {
            var user = httpContext.User.Claims.Parsing();
            return user is not null;
        }
    }
}