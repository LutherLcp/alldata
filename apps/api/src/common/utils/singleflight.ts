/**
 * Singleflight 并发收敛工具
 *
 * 防止高并发下相同 QueryHash 的聚合查询并发击穿数据库。
 * 多个并发的相同 key 请求只执行一次实际查询，结果广播共享。
 */

interface Call<T> {
  promise: Promise<T>;
}

export class Singleflight {
  private calls = new Map<string, Call<any>>();

  /**
   * 执行带有 Singleflight 保护的异步操作
   *
   * @param key - 唯一的请求指纹标识（如 QueryHash 或 URL+Params）
   * @param fn - 实际执行的查询函数
   */
  async do<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existingCall = this.calls.get(key);
    if (existingCall) {
      return existingCall.promise;
    }

    const promise = (async () => {
      try {
        return await fn();
      } finally {
        this.calls.delete(key);
      }
    })();

    this.calls.set(key, { promise });
    return promise;
  }

  /**
   * 清除特定 key 的状态
   */
  forget(key: string): void {
    this.calls.delete(key);
  }

  /**
   * 获取当前排队中的并发请求数量
   */
  size(): number {
    return this.calls.size;
  }
}

export const globalSingleflight = new Singleflight();
