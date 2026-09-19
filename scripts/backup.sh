#!/usr/bin/env bash
#
# AllData 备份基线脚本
#
# 用法：
#   ./scripts/backup.sh postgres    # 逻辑备份 PostgreSQL（自定义格式，可选择性恢复）
#   ./scripts/backup.sh clickhouse  # 备份 ClickHouse 元数据（表结构）
#   ./scripts/backup.sh all         # 全部
#
# 产物写入 ./backups/<日期>/。建议通过 cron 每日执行 postgres，每周执行 clickhouse。
#
# 生产环境注意：本脚本针对 docker compose 中的容器名（alldata-postgres /
# alldata-clickhouse）。若使用外部托管实例，请改用云厂商备份或调整变量。

set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-alldata-postgres}"
CH_CONTAINER="${CH_CONTAINER:-alldata-clickhouse}"
PG_USER="${POSTGRES_USER:-alldata}"
PG_DB="${POSTGRES_DB:-alldata}"
CH_DB="${CLICKHOUSE_DATABASE:-alldata}"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
OUT_DIR="${BACKUP_ROOT}/${STAMP}"

mkdir -p "${OUT_DIR}"

require_container() {
  local name="$1"
  if ! docker ps --format '{{.Names}}' | grep -qx "${name}"; then
    echo "错误：容器 ${name} 未运行。请先执行 pnpm docker:up" >&2
    exit 1
  fi
}

backup_postgres() {
  require_container "${PG_CONTAINER}"
  local file="${OUT_DIR}/postgres-${PG_DB}.dump"
  echo "→ 备份 PostgreSQL (${PG_DB}) ..."
  docker exec "${PG_CONTAINER}" pg_dump -U "${PG_USER}" -d "${PG_DB}" -F c -f /tmp/backup.dump
  docker cp "${PG_CONTAINER}:/tmp/backup.dump" "${file}"
  docker exec "${PG_CONTAINER}" rm -f /tmp/backup.dump
  echo "  完成：${file}"
  echo "  恢复示例：docker exec -i ${PG_CONTAINER} pg_restore -U ${PG_USER} -d ${PG_DB} --clean < ${file}"
}

backup_clickhouse() {
  require_container "${CH_CONTAINER}"
  local file="${OUT_DIR}/clickhouse-schema.sql"
  echo "→ 备份 ClickHouse 表结构 (${CH_DB}) ..."
  docker exec "${CH_CONTAINER}" clickhouse-client --query "SHOW CREATE DATABASE ${CH_DB}" \
    > "${file}" 2>/dev/null || true
  docker exec "${CH_CONTAINER}" clickhouse-client --query \
    "SELECT name FROM system.tables WHERE database = '${CH_DB}'" | while read -r table; do
    [ -z "${table}" ] && continue
    echo "" >> "${file}"
    docker exec "${CH_CONTAINER}" clickhouse-client --query \
      "SHOW CREATE TABLE ${CH_DB}.${table}" >> "${file}"
  done
  echo "  完成：${file}（仅表结构；数据量级较大，建议按分区另行导出）"
}

case "${1:-all}" in
  postgres)   backup_postgres ;;
  clickhouse) backup_clickhouse ;;
  all)        backup_postgres; backup_clickhouse ;;
  *)
    echo "用法：$0 {postgres|clickhouse|all}" >&2
    exit 1
    ;;
esac

echo ""
echo "备份完成，产物目录：${OUT_DIR}"
