/** 密码规则：6-12 位，只能包含英文、数字和符号（不含中文与空格） */

export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 12;

export const PASSWORD_HINT = "密码 6-12 位，只能包含英文、数字和符号";

/** 给 <input pattern> 用：可打印 ASCII 去掉空格，即 ! 到 ~ 这个区间 */
export const PASSWORD_PATTERN = "[!-~]+";

const PASSWORD_RE = /^[\x21-\x7e]+$/;

/** 校验通过返回 null，否则返回给用户看的原因 */
export function validatePassword(pw: string): string | null {
  if (!pw) return "请输入密码";
  if (pw.length < PASSWORD_MIN) return `密码至少 ${PASSWORD_MIN} 位`;
  if (pw.length > PASSWORD_MAX) return `密码最多 ${PASSWORD_MAX} 位`;
  if (!PASSWORD_RE.test(pw)) {
    return "密码只能包含英文、数字和符号（不能有中文或空格）";
  }
  return null;
}
