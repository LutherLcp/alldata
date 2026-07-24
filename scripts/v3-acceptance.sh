#!/usr/bin/env bash
# V3 全量验收脚本 — 埋点管理 + 标签管理 + 指标管理 + 6种分析类型
BASE="http://localhost:4000/api"
PASS=0; FAIL=0

test_it() {
  local name="$1"; shift
  local resp code
  resp=$(curl -s -w "\n%{http_code}" "$@" 2>/dev/null)
  code=$(echo "$resp" | tail -1)
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    echo "  ✅ $name (HTTP $code)"; ((PASS++))
  else
    echo "  ❌ $name (HTTP $code)"; echo "     $(echo "$resp" | head -1 | cut -c1-120)"; ((FAIL++))
  fi
}

# Login
TOKEN=$(curl -s "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
AUTH=(-H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -H 'Project-Id: 1')

echo ""
echo "═══ V3.1 埋点管理 ═══"
test_it "Story 创建" "${AUTH[@]}" -X POST "$BASE/tracking/stories" -d "{\"name\":\"story_test_$RANDOM\",\"project_id\":1}"
test_it "Story 列表" "${AUTH[@]}" "$BASE/tracking/stories"
test_it "Event 创建" "${AUTH[@]}" -X POST "$BASE/tracking/events" -d "{\"name\":\"evt_test_$RANDOM\",\"project_id\":1}"
test_it "Event 列表" "${AUTH[@]}" "$BASE/tracking/events?project_id=1"

echo ""
echo "═══ V3.2 标签管理 ═══"
test_it "Tag 创建" "${AUTH[@]}" -X POST "$BASE/tags" -d "{\"name\":\"tag_test_$RANDOM\",\"tag_type\":\"condition\",\"project_id\":1}"
test_it "Tag 列表" "${AUTH[@]}" "$BASE/tags?project_id=1"
# 获取刚创建的 tag id
TAG_ID=$(curl -s "${AUTH[@]}" "$BASE/tags?project_id=1" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['id'] if d else 0)" 2>/dev/null)
test_it "Tag 计算(id=$TAG_ID)" "${AUTH[@]}" -X POST "$BASE/tags/$TAG_ID/refresh" -d '{}'

echo ""
echo "═══ V3.3 指标管理 ═══"
test_it "Metric 创建" "${AUTH[@]}" -X POST "$BASE/metrics" -d "{\"name\":\"metric_test_$RANDOM\",\"display_name\":\"测试指标\",\"project_id\":1}"
test_it "Metric 列表" "${AUTH[@]}" "$BASE/metrics?project_id=1"

echo ""
echo "═══ V3.4 6种分析类型 ═══"
for TYPE in event funnel retention distribution path attribute; do
  RESULT=$(curl -s "${AUTH[@]}" -X POST "$BASE/analysis/query" -d "{\"type\":\"$TYPE\",\"project_id\":1,\"event_name\":\"page_view\",\"metrics\":[{\"type\":\"count\"}],\"time_range\":{\"start\":\"2024-01-01\",\"end\":\"2024-01-07\"},\"funnel_events\":[\"a\",\"b\"],\"retention_event\":\"login\",\"target_event\":\"purchase\"}")
  RESP_TYPE=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['type'])" 2>/dev/null || echo "error")
  if [ "$RESP_TYPE" = "$TYPE" ]; then
    echo "  ✅ 分析类型: $TYPE"; ((PASS++))
  else
    echo "  ❌ 分析类型: $TYPE (got: $RESP_TYPE)"; ((FAIL++))
  fi
done

echo ""
echo "═══ 结果: $PASS 通过, $FAIL 失败 ═══"
echo ""
exit $FAIL
