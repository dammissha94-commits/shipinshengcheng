/**
 * 服务层统一错误类
 * 
 * 提供结构化的错误处理，方便 UI 层根据错误码显示不同的错误信息。
 * 
 * @example
 * // 抛出权限错误
 * throw new ServiceError('PERMISSION_DENIED', '无权限访问该家族数据');
 * 
 * @example
 * // 捕获并处理错误
 * try {
 *   await listFamilyPersons(familyId);
 * } catch (e) {
 *   if (e instanceof ServiceError) {
 *     if (e.code === 'PERMISSION_DENIED') {
 *       // 重定向到登录页
 *     }
 *   }
 * }
 */
export class ServiceError extends Error {
  constructor(
    public code: ServiceErrorCode,
    message: string,
    public originalError?: unknown,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ServiceError';
    
    // 维护正确的原型链（TypeScript 类继承问题）
    Object.setPrototypeOf(this, ServiceError.prototype);
  }

  /**
   * 判断是否为指定错误码
   */
  is(code: ServiceErrorCode): boolean {
    return this.code === code;
  }

  /**
   * 转换为用户友好的错误信息
   */
  toUserMessage(): string {
    switch (this.code) {
      case 'PERMISSION_DENIED':
        return '无权限访问该数据，请先登录';
      case 'NOT_FOUND':
        return '请求的数据不存在';
      case 'VALIDATION_ERROR':
        return '输入数据格式错误，请检查后重试';
      case 'DATABASE_ERROR':
        return '数据库操作失败，请稍后重试';
      case 'NETWORK_ERROR':
        return '网络连接失败，请检查网络后重试';
      case 'UNKNOWN_ERROR':
      default:
        return '未知错误，请稍后重试或联系管理员';
    }
  }

  /**
   * 从 Supabase 错误创建 ServiceError
   */
  static fromSupabaseError(error: { code?: string; message: string; details?: string }): ServiceError {
    const codeMap: Record<string, ServiceErrorCode> = {
      'PGRST116': 'PERMISSION_DENIED',  // RLS 阻止访问
      'PGRST204': 'VALIDATION_ERROR',    // 无效的查询参数
      '23505': 'VALIDATION_ERROR',        // 唯一约束违反
      '23503': 'VALIDATION_ERROR',        // 外键约束违反
      '42P01': 'DATABASE_ERROR',         // 表不存在
      '42501': 'PERMISSION_DENIED',      // 权限不足
    };

    const code = codeMap[error.code ?? ''] ?? 'DATABASE_ERROR';
    const message = error.message || '数据库操作失败';
    
    return new ServiceError(code, message, error);
  }
}

/**
 * 服务层错误码
 */
export type ServiceErrorCode =
  | 'PERMISSION_DENIED'     // 权限不足
  | 'NOT_FOUND'              // 数据不存在
  | 'VALIDATION_ERROR'       // 输入验证失败
  | 'DATABASE_ERROR'         // 数据库操作失败
  | 'NETWORK_ERROR'          // 网络错误
  | 'UNKNOWN_ERROR';         // 未知错误

/**
 * 统一错误处理函数
 * 
 * @param error - 捕获的错误
 * @param context - 错误发生的上下文（如服务名、函数名）
 * @returns ServiceError 实例
 * 
 * @example
 * try {
 *   await supabase.from('person_profiles').select('*');
 * } catch (error) {
 *   throw handleServiceError(error, 'person-service/listFamilyPersons');
 * }
 */
export function handleServiceError(error: unknown, context: string): ServiceError {
  // 如果已经是 ServiceError，直接返回
  if (error instanceof ServiceError) {
    console.error(`[${context}] ServiceError:`, error);
    return error;
  }

  // 处理 Supabase 错误
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const serviceError = ServiceError.fromSupabaseError(error as { code?: string; message: string });
    console.error(`[${context}] Supabase error:`, error);
    return serviceError;
  }

  // 处理标准 Error
  if (error instanceof Error) {
    console.error(`[${context}] Error:`, error.message, error.stack);
    return new ServiceError('UNKNOWN_ERROR', error.message, error);
  }

  // 处理其他类型错误
  console.error(`[${context}] Unknown error:`, error);
  return new ServiceError('UNKNOWN_ERROR', '未知错误', error);
}
