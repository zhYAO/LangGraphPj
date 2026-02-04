/**
 * 统一的 API 请求工具
 * Cookie 由浏览器自动携带，无需手动处理 token
 */

/**
 * 发送认证的 API 请求
 * @param url - 请求 URL
 * @param options - fetch 选项
 * @returns fetch Response
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  // 构建请求头
  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')

  // 发送请求（Cookie 由浏览器自动携带）
  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * GET 请求
 */
export async function get<T = any>(
  url: string,
  options?: Omit<RequestInit, 'method' | 'body'>,
): Promise<T> {
  const response = await fetchWithAuth(url, { ...options, method: 'GET' })

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * POST 请求
 */
export async function post<T = any>(
  url: string,
  data?: any,
  options?: Omit<RequestInit, 'method' | 'body'>,
): Promise<T> {
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * PUT 请求
 */
export async function put<T = any>(
  url: string,
  data?: any,
  options?: Omit<RequestInit, 'method' | 'body'>,
): Promise<T> {
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * PATCH 请求
 */
export async function patch<T = any>(
  url: string,
  data?: any,
  options?: Omit<RequestInit, 'method' | 'body'>,
): Promise<T> {
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * DELETE 请求
 */
export async function del<T = any>(
  url: string,
  data?: any,
  options?: Omit<RequestInit, 'method' | 'body'>,
): Promise<T> {
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined,
  })

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * 流式 POST 请求
 * 用于聊天等流式响应场景
 */
export async function streamPost(
  url: string,
  data?: any,
  options?: Omit<RequestInit, 'method' | 'body'>,
): Promise<Response> {
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`)
  }

  return response
}
