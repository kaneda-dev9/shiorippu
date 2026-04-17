export const shioriKeys = {
  all: () => ['shiori'] as const,
  list: () => ['shiori', 'list'] as const,
  detail: (id: string) => ['shiori', 'detail', id] as const,
}

export const publicShioriKeys = {
  all: () => ['public-shiori'] as const,
  detail: (id: string) => ['public-shiori', 'detail', id] as const,
}

export const chatKeys = {
  all: () => ['chat'] as const,
  messages: (shioriId: string) => ['chat', 'messages', shioriId] as const,
}
