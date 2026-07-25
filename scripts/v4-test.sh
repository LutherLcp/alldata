#!/bin/bash
BASE=http://localhost:4000/api
TOKEN=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
H1="Authorization: Bearer $TOKEN"
H2="Project-Id: 2"
CT="Content-Type: application/json"
PASS=0; FAIL=0

test_api() {
  local desc="$1" method="$2" url="$3" data="$4" expect="$5"
  if [ -n "$data" ]; then
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE$url" -H "$H1" -H "$H2" -H "$CT" -d "$data")
  else
    CODE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE$url" -H "$H1" -H "$H2")
  fi
  if echo "$CODE" | grep -qE "^($expect)$"; then
    echo "  PASS [$CODE] $desc"
    PASS=$((PASS+1))
  else
    echo "  FAIL [$CODE] $desc (expected $expect)"
    FAIL=$((FAIL+1))
  fi
}

echo "=== V4 API 验收测试 ==="
echo ""
echo "--- Warning 预警管理 ---"
test_api "列出预警" GET "/warnings" "" "200"
test_api "创建预警" POST "/warnings" '{"project_id":2,"name":"warn_test_'$RANDOM'","monitor_rules":{"type":"threshold"},"notify_config":{"channels":["email"]},"check_cron":"0 */5 * * *"}' "200|201"
WARN_ID=$(curl -s "$BASE/warnings" -H "$H1" -H "$H2" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['id'] if d else 0)" 2>/dev/null)
test_api "获取预警详情" GET "/warnings/$WARN_ID" "" "200"
test_api "检查预警" POST "/warnings/$WARN_ID/check" '{}' "200"
test_api "预警日志" GET "/warnings/$WARN_ID/logs" "" "200"
test_api "更新预警" PUT "/warnings/$WARN_ID" '{"name":"updated_warn"}' "200"
test_api "删除预警" DELETE "/warnings/$WARN_ID" "" "200"

echo ""
echo "--- Subscription 订阅推送 ---"
test_api "列出订阅" GET "/subscriptions/subscriptions" "" "200"
test_api "创建订阅" POST "/subscriptions/subscriptions" '{"project_id":2,"name":"sub_'$RANDOM'","entity_id":1,"entity_type":"dashboard","schedule_cron":"0 9 * * *","notify_type":"email"}' "200|201"
SUB_ID=$(curl -s "$BASE/subscriptions/subscriptions" -H "$H1" -H "$H2" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['id'] if d else 0)" 2>/dev/null)
test_api "推送订阅" POST "/subscriptions/subscriptions/$SUB_ID/send" '{}' "200"
test_api "更新订阅" PUT "/subscriptions/subscriptions/$SUB_ID" '{"name":"updated_sub"}' "200"
test_api "删除订阅" DELETE "/subscriptions/subscriptions/$SUB_ID" "" "200"
test_api "列出推送配置" GET "/subscriptions/push-configs" "" "200"
test_api "创建推送配置" POST "/subscriptions/push-configs" '{"project_id":2,"name":"push_'$RANDOM'","push_type":"webhook","config":{"url":"http://example.com"}}' "200|201"

echo ""
echo "--- Download 下载任务 ---"
test_api "列出任务" GET "/downloads" "" "200"
test_api "创建任务" POST "/downloads" '{"project_id":2,"task_name":"export_'$RANDOM'","task_type":"report"}' "200|201"
DL_ID=$(curl -s "$BASE/downloads" -H "$H1" -H "$H2" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['id'] if d else 0)" 2>/dev/null)
test_api "执行导出" POST "/downloads/$DL_ID/execute" '{}' "200"
test_api "删除任务" DELETE "/downloads/$DL_ID" "" "200"

echo ""
echo "--- Enum 枚举管理 ---"
test_api "列出枚举" GET "/enums" "" "200"
test_api "创建枚举" POST "/enums" '{"project_id":2,"type_key":"cat_'$RANDOM'","name":"事件分类","items":[{"value":"click","label":"点击"}]}' "200|201"
ENUM_ID=$(curl -s "$BASE/enums" -H "$H1" -H "$H2" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['id'] if d else 0)" 2>/dev/null)
test_api "更新枚举" PUT "/enums/$ENUM_ID" '{"name":"更新分类"}' "200"
test_api "删除枚举" DELETE "/enums/$ENUM_ID" "" "200"

echo ""
echo "=== 结果: $PASS 通过, $FAIL 失败 ==="
