#!/bin/bash
API="http://localhost:4000"
WEB="http://localhost:3000"
PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ [$actual] $name"; PASS=$((PASS+1))
  else
    echo "  ❌ [$actual≠$expected] $name"; FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo "  AllData 全链路端到端测试"
echo "============================================"

# 1. 前端
echo ""
echo "📦 1. 前端服务"
c=$(curl -s -o /dev/null -w "%{http_code}" "$WEB/" 2>/dev/null)
check "前端首页 HTTP 200" "200" "$c"

# 2. 健康检查
echo ""
echo "🏥 2. 健康检查"
r=$(curl -s -w "\n%{http_code}" "$API/api/health" 2>/dev/null)
check "GET /api/health" "200" "$(echo "$r" | tail -1)"

# 3. 登录
echo ""
echo "🔐 3. 认证流程"
r=$(curl -s -w "\n%{http_code}" -X POST "$API/api/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' 2>/dev/null)
code=$(echo "$r" | tail -1)
body=$(echo "$r" | sed '$d')
check "POST /api/auth/login 登录" "200" "$code"
TOKEN=$(echo "$body" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])" 2>/dev/null || echo "")
REFRESH=$(echo "$body" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['refresh_token'])" 2>/dev/null || echo "")
echo "  Token: ${TOKEN:0:40}..."

# 错误密码
r=$(curl -s -w "\n%{http_code}" -X POST "$API/api/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' 2>/dev/null)
# 用不存在的用户
r=$(curl -s -w "\n%{http_code}" -X POST "$API/api/auth/login" -H "Content-Type: application/json" -d '{"username":"nouser","password":"admin123"}' 2>/dev/null)
code=$(echo "$r" | tail -1)
check "POST /api/auth/login 错误用户 → 401" "401" "$code"

# 获取用户信息
r=$(curl -s -w "\n%{http_code}" "$API/api/auth/me" -H "Authorization: Bearer $TOKEN" 2>/dev/null)
code=$(echo "$r" | tail -1); body=$(echo "$r" | sed '$d')
check "GET /api/auth/me 获取用户信息" "200" "$code"
echo "  User: $(echo $body | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(f\"{d['username']} ({d['email']})\")" 2>/dev/null)"

# 无 token
r=$(curl -s -w "\n%{http_code}" "$API/api/auth/me" 2>/dev/null)
check "GET /api/auth/me 无token → 401" "401" "$(echo "$r" | tail -1)"

# 刷新 token
r=$(curl -s -w "\n%{http_code}" -X POST "$API/api/auth/refresh" -H "Content-Type: application/json" -d "{\"refresh_token\":\"$REFRESH\"}" 2>/dev/null)
code=$(echo "$r" | tail -1)
check "POST /api/auth/refresh 刷新Token" "200" "$code"

# 4. 项目管理
echo ""
echo "📁 4. 项目管理"
r=$(curl -s -w "\n%{http_code}" -X POST "$API/api/projects" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"code":"e2e-v2","name":"E2E测试项目V2","description":"全链路验证"}' 2>/dev/null)
code=$(echo "$r" | tail -1); body=$(echo "$r" | sed '$d')
check "POST /api/projects 创建项目" "201" "$code"
PID=$(echo "$body" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")
echo "  Project ID: $PID"

r=$(curl -s -w "\n%{http_code}" "$API/api/projects" -H "Authorization: Bearer $TOKEN" 2>/dev/null)
code=$(echo "$r" | tail -1)
check "GET /api/projects 项目列表" "200" "$code"
cnt=$(echo "$r" | sed '$d' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['page_info']['total'])" 2>/dev/null)
echo "  项目总数: $cnt"

if [ -n "$PID" ] && [ "$PID" != "None" ]; then
  r=$(curl -s -w "\n%{http_code}" "$API/api/projects/$PID" -H "Authorization: Bearer $TOKEN" 2>/dev/null)
  code=$(echo "$r" | tail -1); body=$(echo "$r" | sed '$d')
  check "GET /api/projects/$PID 项目详情" "200" "$code"
  echo "  项目名: $(echo $body | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['name'])" 2>/dev/null)"

  r=$(curl -s -w "\n%{http_code}" -X PUT "$API/api/projects/$PID" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"E2E已更新"}' 2>/dev/null)
  code=$(echo "$r" | tail -1)
  check "PUT /api/projects/$PID 更新项目" "200" "$code"
fi

# 无 token 访问项目
r=$(curl -s -w "\n%{http_code}" "$API/api/projects" 2>/dev/null)
check "GET /api/projects 无token → 401" "401" "$(echo "$r" | tail -1)"

# 5. 登出
echo ""
echo "🚪 5. 登出"
r=$(curl -s -w "\n%{http_code}" -X POST "$API/api/auth/logout" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}' 2>/dev/null)
code=$(echo "$r" | tail -1)
check "POST /api/auth/logout 登出" "200" "$code"

# 6. Swagger
echo ""
echo "📖 6. API 文档"
r=$(curl -s -w "\n%{http_code}" "$API/docs/" 2>/dev/null)
check "Swagger UI 可访问" "200" "$(echo "$r" | tail -1)"

TOTAL=$((PASS+FAIL))
echo ""
echo "============================================"
echo "  🏁 结果: $PASS 通过 / $FAIL 失败 / 共 $TOTAL"
echo "============================================"
