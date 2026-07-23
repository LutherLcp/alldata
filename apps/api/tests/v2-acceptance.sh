/**
 * V2 验收测试脚本 — 看板 CRUD + 事件分析 + 站内信
 * 运行: bash apps/api/tests/v2-acceptance.sh
 */
#!/bin/bash
set -e

BASE=${API_URL:-http://localhost:4000}

echo "=== V2 验收测试 ==="

# 登录
TOKEN=$(curl -s "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))")

if [ -z "$TOKEN" ]; then echo "FAIL: 登录失败"; exit 1; fi
echo "PASS: 登录"

# 文件夹
FID=$(curl -s -X POST "$BASE/api/dashboards/folders" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"project_id":1,"name":"测试文件夹"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "PASS: 创建文件夹 id=$FID"

# 看板
DID=$(curl -s -X POST "$BASE/api/dashboards" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"project_id\":1,\"folder_id\":$FID,\"name\":\"测试看板\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "PASS: 创建看板 id=$DID"

# 报表
RID=$(curl -s -X POST "$BASE/api/dashboards/reports" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"project_id\":1,\"dashboard_id\":$DID,\"name\":\"PV\",\"type\":\"chart\",\"chart_type\":\"line\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "PASS: 创建报表 id=$RID"

# 分析查询
ROWS=$(curl -s -X POST "$BASE/api/analysis/query" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"project_id":1,"event_name":"pv","metrics":[{"type":"count"}],"time_range":{"start":"2024-01-01","end":"2024-01-03"}}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['rows'])")
echo "PASS: 事件分析 rows=$ROWS"

# 站内信
NID=$(curl -s -X POST "$BASE/api/notices" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"project_id":1,"title":"测试","content":"验收"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "PASS: 创建通知 id=$NID"

# 清理
curl -s -X DELETE "$BASE/api/dashboards/$DID" -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE "$BASE/api/dashboards/folders/$FID" -H "Authorization: Bearer $TOKEN" > /dev/null
echo "PASS: 清理完成"

echo ""
echo "=== V2 验收全部通过 ==="
