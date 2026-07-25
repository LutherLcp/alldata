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

echo "=== V5 API 验收测试 ==="
echo ""
echo "--- Finance 财务管理 ---"
test_api "列出供应商" GET "/finance/suppliers" "" "200"
test_api "创建供应商" POST "/finance/suppliers" '{"supplier_name":"测试供应商_'$RANDOM'","subject":"测试主体","contact":"张三","phone":"13800138000"}' "200|201"
test_api "列出分成比例" GET "/finance/share-ratios" "" "200"
test_api "创建分成比例" POST "/finance/share-ratios" '{"supplier_id":1,"platform":"抖音","ratio":30,"effective_date":"2026-01-01"}' "200|201"
test_api "列出对账" GET "/finance/reconciliations" "" "200"
test_api "创建对账" POST "/finance/reconciliations" '{"supplier_id":1,"platform":"抖音","game":"原神","period":"2026-07"}' "200|201"
test_api "导出报表" POST "/finance/export" '{"type":"summary"}' "200"

echo ""
echo "--- KoCRM 管理 ---"
test_api "列出账户" GET "/kocrm/accounts" "" "200"
test_api "创建账户" POST "/kocrm/accounts" '{"project_id":2,"platform":"抖音","account_name":"官方账号_'$RANDOM'","account_id":"acc_'$RANDOM'"}' "200|201"
test_api "列出达人" GET "/kocrm/creators" "" "200"
test_api "创建达人" POST "/kocrm/creators" '{"project_id":2,"platform":"小红书","name":"达人_'$RANDOM'","uid":"uid_'$RANDOM'","followers":10000,"tags":["美妆","护肤"]}' "200|201"

echo ""
echo "=== 结果: $PASS 通过, $FAIL 失败 ==="
