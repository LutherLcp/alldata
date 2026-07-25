#!/bin/bash
# V7 API 验收测试脚本
# 测试 AI 智能服务、用户查询、版本日历、数据资产模块
BASE=http://localhost:4000/api
TOKEN=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
H1="Authorization: Bearer $TOKEN"
H2="Project-Id: 1"
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

echo "=== V7 API 验收测试 ==="
echo ""

# ─── AI 智能服务 ─────────────────────────────
echo "--- AI 智能服务 ---"
test_api "AI 对话" POST "/ai/chat" '{"messages":[{"role":"user","content":"你好"}]}' "200"
test_api "AI 文本完成" POST "/ai/complete" '{"messages":[{"role":"user","content":"总结"}]}' "200"
test_api "获取模型列表" POST "/ai/models" '{}' "200"
test_api "获取 AI 配置" GET "/ai/config" "" "200"
test_api "生成智能洞察" POST "/ai/insight" '{"project_id":1,"data_type":"dashboard","data_id":1}' "200"
test_api "异常检测" POST "/ai/anomaly/detect" '{"project_id":1,"metric_name":"dau","data_points":[100,120,110,500,105,115]}' "200"
test_api "异常解读" POST "/ai/anomaly/interpret" '{"anomalies":[{"value":500,"expected":110,"deviation":3.5,"severity":"high","category":"spike","methods":["zscore"]}],"metric_name":"dau"}' "200"

echo ""

# ─── 用户查询 ─────────────────────────────
echo "--- 用户查询 ---"
test_api "用户列表" GET "/users" "" "200"
test_api "用户列表(搜索)" GET "/users?keyword=admin" "" "200"
test_api "用户详情" GET "/users/1" "" "200"
test_api "用户时间线" GET "/users/1/timeline?project_id=1" "" "200"
test_api "更新用户状态" PUT "/users/1/status" '{"status":1}' "200"

echo ""

# ─── 版本日历（先创建再查询/删除）─────────────
echo "--- 版本日历 ---"
# 先创建一个事件
CREATE_RESULT=$(curl -s -X POST "$BASE/calendar" -H "$H1" -H "$H2" -H "$CT" -d '{"project_id":1,"title":"V7 发布测试","start_date":"2024-03-15","type":"release"}')
CALENDAR_ID=$(echo "$CREATE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)

test_api "日历列表" GET "/calendar?project_id=1" "" "200"
if [ -n "$CALENDAR_ID" ] && [ "$CALENDAR_ID" != "" ]; then
  test_api "日历详情" GET "/calendar/$CALENDAR_ID" "" "200"
  test_api "更新日历事件" PUT "/calendar/$CALENDAR_ID" '{"title":"更新后的标题"}' "200"
  test_api "删除日历事件" DELETE "/calendar/$CALENDAR_ID" "" "200"
else
  echo "  SKIP 日历详情/更新/删除 (创建失败)"
  FAIL=$((FAIL+3))
fi

echo ""

# ─── 数据资产 — 数据表（先创建再查询/删除）─────
echo "--- 数据资产: 数据表 ---"
CREATE_RESULT=$(curl -s -X POST "$BASE/assets/tables" -H "$H1" -H "$H2" -H "$CT" -d '{"project_id":1,"name":"test_table","type":"fact"}')
TABLE_ID=$(echo "$CREATE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)

test_api "数据表列表" GET "/assets/tables?project_id=1" "" "200"
if [ -n "$TABLE_ID" ] && [ "$TABLE_ID" != "" ]; then
  test_api "数据表详情" GET "/assets/tables/$TABLE_ID" "" "200"
  test_api "更新数据表" PUT "/assets/tables/$TABLE_ID" '{"description":"更新描述"}' "200"
  test_api "删除数据表" DELETE "/assets/tables/$TABLE_ID" "" "200"
else
  echo "  SKIP 数据表详情/更新/删除 (创建失败)"
  FAIL=$((FAIL+3))
fi

echo ""

# ─── 数据资产 — 数据集 ─────────────────────
echo "--- 数据资产: 数据集 ---"
CREATE_RESULT=$(curl -s -X POST "$BASE/assets/datasets" -H "$H1" -H "$H2" -H "$CT" -d '{"project_id":1,"name":"test_dataset","type":"daily"}')
DATASET_ID=$(echo "$CREATE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)

test_api "数据集列表" GET "/assets/datasets?project_id=1" "" "200"
if [ -n "$DATASET_ID" ] && [ "$DATASET_ID" != "" ]; then
  test_api "数据集详情" GET "/assets/datasets/$DATASET_ID" "" "200"
  test_api "更新数据集" PUT "/assets/datasets/$DATASET_ID" '{"description":"更新描述"}' "200"
  test_api "删除数据集" DELETE "/assets/datasets/$DATASET_ID" "" "200"
else
  echo "  SKIP 数据集详情/更新/删除 (创建失败)"
  FAIL=$((FAIL+3))
fi

echo ""

# ─── 数据资产 — 属性 ─────────────────────
echo "--- 数据资产: 属性 ---"
CREATE_RESULT=$(curl -s -X POST "$BASE/assets/attributes" -H "$H1" -H "$H2" -H "$CT" -d '{"project_id":1,"name":"test_attr","data_type":"string"}')
ATTR_ID=$(echo "$CREATE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)

test_api "属性列表" GET "/assets/attributes?project_id=1" "" "200"
if [ -n "$ATTR_ID" ] && [ "$ATTR_ID" != "" ]; then
  test_api "更新属性" PUT "/assets/attributes/$ATTR_ID" '{"description":"更新描述"}' "200"
  test_api "删除属性" DELETE "/assets/attributes/$ATTR_ID" "" "200"
else
  echo "  SKIP 属性更新/删除 (创建失败)"
  FAIL=$((FAIL+2))
fi

echo ""

# ─── 数据资产 — 分类 ─────────────────────
echo "--- 数据资产: 分类 ---"
CREATE_RESULT=$(curl -s -X POST "$BASE/assets/categories" -H "$H1" -H "$H2" -H "$CT" -d '{"project_id":1,"name":"test_cat","type":"event"}')
CAT_ID=$(echo "$CREATE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)

test_api "分类列表" GET "/assets/categories?project_id=1" "" "200"
if [ -n "$CAT_ID" ] && [ "$CAT_ID" != "" ]; then
  test_api "删除分类" DELETE "/assets/categories/$CAT_ID" "" "200"
else
  echo "  SKIP 分类删除 (创建失败)"
  FAIL=$((FAIL+1))
fi

echo ""
echo "=== 结果: $PASS 通过, $FAIL 失败 ==="
