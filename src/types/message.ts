// 私信系统类型定义

export interface ConversationUser {
  id: number
  username: string
  nickname: string
  avatar: string
}

export interface Conversation {
  id: number
  other_user: ConversationUser
  last_message: string
  last_message_time: string | null
  unread_count: number
  created_at: string
}

export interface ConversationsListResponse {
  conversations: Conversation[]
  total_unread: number
}

export interface PrivateMessage {
  id: number
  conversation_id: number
  sender: ConversationUser
  receiver: ConversationUser
  content: string
  is_read: boolean
  is_self: boolean
  created_at: string
}

export interface MessagesListResponse {
  messages: PrivateMessage[]
  total: number
}

export interface SendMessageRequest {
  receiver_id: number
  content: string
}

export interface SendMessageResponse {
  message_id: number
  conversation_id: number
}

export interface StartConversationResponse {
  conversation_id: number
}
