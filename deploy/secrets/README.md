# Secrets Directory

该目录仅存放生产环境 secrets 文件，不入库真实值。

必需文件（每个文件仅一行密文/明文）：
- `mysql_root_password`
- `mysql_app_password`
- `redis_password`
- `jwt_secret`

示例：
```bash
printf '%s' 'strong-password' > deploy/secrets/mysql_root_password
```

注意：
- 不要添加换行之外的额外字符。
- `bin/deploy-preflight.sh prod --profile core,frontends` 会校验这些文件非空。注意：直接调用 deploy-preflight.sh 前需先执行 `bash bin/prepare-mysql-init.sh` 同步派生产物。
