import { Model } from '@/app/components/ModelSelector'

// 可用的模型列表（支持多个提供商）
// 模型 ID 格式：provider:modelName
// - Google Gemini: https://ai.google.dev/gemini-api/docs/models?hl=zh-cn
// - 通义千问: https://help.aliyun.com/zh/dashscope/developer-reference/model-square
export const availableModels: Model[] = [
  // Google Gemini 模型
  {
    id: 'google:gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    description: '最强大的 Gemini 3 预览版，顶级性能和推理能力',
  },
  {
    id: 'google:gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    description: 'Gemini 3 快速预览版，高性能与快速响应的平衡',
  },
  {
    id: 'google:gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: '强大的多模态模型，平衡性能与速度',
  },
  {
    id: 'google:gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: '快速响应，适合日常对话',
  },
  {
    id: 'google:gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: '超快速的轻量级模型',
  },
  // 通义千问模型（OpenAI 兼容模式）
  {
    id: 'openai:qwen3-max',
    name: '通义千问 3 Max',
    description: '最新 Qwen3 旗舰模型，超强推理能力',
  },
  {
    id: 'openai:qwen-plus',
    name: '通义千问 Plus',
    description: '平衡性能与成本的高性能模型',
  },
  {
    id: 'openai:qwen-flash',
    name: '通义千问 Flash',
    description: '快速响应，高性价比',
  },
  {
    id: 'openai:qwen3-vl-plus',
    name: '通义千问 3 VL Plus',
    description: '多模态视觉语言模型，支持图文理解',
  },
  // DeepSeek 模型（OpenAI 兼容模式）
  {
    id: 'openai:deepseek-v3.2',
    name: 'DeepSeek V3.2',
    description: 'DeepSeek 最新模型，强大的推理能力',
  },
]
