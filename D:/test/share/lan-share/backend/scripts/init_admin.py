"""
LAN Share - 初始化管理员脚本
================================
运行方式: python scripts/init_admin.py

功能：
1. 创建数据库所有表
2. 创建默认管理员账户（如果不存在）
3. 显示管理员登录信息

默认账户：
  用户名：admin
  密码：admin123456

⚠️  请在首次运行后立即修改默认密码！
"""

import os
import sys

# 将 backend/ 目录加入路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone
from core.database import engine, Base, SessionLocal
from core.security import hash_password
from models.user import User


def init_admin():
    print("=" * 50)
    print("  LAN Share - 管理员初始化")
    print("=" * 50)
    print()

    # 1. 创建所有数据库表
    print("📦 正在创建数据库表...")
    Base.metadata.create_all(bind=engine)
    print("   ✅ 数据库表创建完成")
    print()

    # 2. 连接数据库
    db = SessionLocal()

    try:
        # 3. 检查是否已存在管理员
        admin = db.query(User).filter(User.role == "admin").first()

        if admin:
            print("=" * 50)
            print("  ✅ 管理员已存在！")
            print("=" * 50)
            print(f"   用户名: {admin.username}")
            print(f"   昵称:   {admin.nickname}")
            print(f"   角色:   {admin.role}")
            print(f"   状态:   {admin.status}")
            print(f"   配额:   {admin.storage_quota / (1024**3):.1f} GB")
            print()
            print("   如需修改密码，请在网页端修改")
            print("   或在数据库中手动更新")
        else:
            # 4. 创建默认管理员
            print("📝 正在创建默认管理员...")
            default_admin = User(
                username="admin",
                password_hash=hash_password("admin123456"),
                nickname="系统管理员",
                role="admin",
                status="active",
                storage_quota=100 * 1024 * 1024 * 1024,  # 100GB
            )
            db.add(default_admin)
            db.commit()
            db.refresh(default_admin)

            print()
            print("=" * 50)
            print("  ✅ 默认管理员创建成功！")
            print("=" * 50)
            print(f"   用户名: admin")
            print(f"   密码:   admin123456")
            print(f"   配额:   100 GB")
            print()
            print("⚠️  请立即登录并修改默认密码！")
            print()

        # 5. 显示数据库信息
        print("📂 数据库信息：")
        print(f"   路径: {os.path.abspath(os.path.dirname(os.path.dirname(__file__)))}/data/lanshare.db")
        print()

        # 6. 统计用户数
        total_users = db.query(User).count()
        print(f"👥 当前用户总数: {total_users}")
        print()

    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        db.close()

    print("=" * 50)
    print("  初始化完成！现在可以启动服务：")
    print("  uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
    print("=" * 50)


if __name__ == "__main__":
    init_admin()
