/**
 * 动态数据脱敏工具 (Data Masking)
 *
 * 针对 PII (个人可识别信息) 进行脱敏遮罩：
 * - 手机号: 138****8888
 * - 邮箱: a***b@domain.com
 * - 身份证: 110101********1234
 * - 姓名: 张* / 李*四
 */

export function maskPhone(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}

export function maskEmail(email?: string | null): string {
  if (!email) return '';
  const atIndex = email.indexOf('@');
  if (atIndex <= 2) return `***${email.slice(atIndex)}`;
  const username = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  return `${username[0]}***${username[username.length - 1]}${domain}`;
}

export function maskName(name?: string | null): string {
  if (!name) return '';
  if (name.length <= 2) return `${name[0]}*`;
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
}

/**
 * 递归遍历对象并自动脱敏敏感字段
 */
export function maskSensitiveFields<T>(obj: T, role?: string): T {
  // 管理员账号全量明文展示
  if (role === 'admin' || role === 'SUPER_ADMIN') return obj;
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveFields(item, role)) as unknown as T;
  }

  const maskedObj: any = { ...obj };
  for (const [key, value] of Object.entries(maskedObj)) {
    const lowerKey = key.toLowerCase();
    if (typeof value === 'string') {
      if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
        maskedObj[key] = maskPhone(value);
      } else if (lowerKey.includes('email')) {
        maskedObj[key] = maskEmail(value);
      }
    } else if (typeof value === 'object' && value !== null) {
      maskedObj[key] = maskSensitiveFields(value, role);
    }
  }

  return maskedObj as T;
}
