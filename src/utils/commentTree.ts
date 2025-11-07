export interface ThreadComment<T> {
  id: number
  parent_id: number
  replies?: T[]
  reply_count?: number
}

export function upsertRootComment<T extends ThreadComment<T>>(comments: T[], newComment: T): [T[], boolean] {
  const index = comments.findIndex(comment => comment.id === newComment.id)
  if (index >= 0) {
    const next = [...comments]
    next.splice(index, 1, newComment)
    return [next, false]
  }

  return [[newComment, ...comments], true]
}

export function insertReplyIntoTree<T extends ThreadComment<T>>(comments: T[], reply: T): [T[], boolean] {
  let changed = false

  const updateReplies = (list: T[]): T[] => {
    return list.map(item => {
      if (item.id === reply.parent_id) {
        const existingReplies = Array.isArray(item.replies) ? [...item.replies] : []
        const childIndex = existingReplies.findIndex(child => child.id === reply.id)

        let nextReplies: T[]
        if (childIndex >= 0) {
          nextReplies = [...existingReplies]
          nextReplies.splice(childIndex, 1, reply)
        } else {
          nextReplies = [...existingReplies, reply]
        }

        changed = true
        return {
          ...item,
          replies: nextReplies,
          reply_count: nextReplies.length,
        }
      }

      if (Array.isArray(item.replies) && item.replies.length > 0) {
        const [nextReplies, childChanged] = insertReplyIntoTree(item.replies, reply)
        if (childChanged) {
          changed = true
          return {
            ...item,
            replies: nextReplies,
            reply_count: nextReplies.length,
          }
        }
      }

      return item
    })
  }

  const nextComments = updateReplies(comments)
  return [changed ? nextComments : comments, changed]
}

export function removeCommentById<T extends ThreadComment<T>>(comments: T[], commentId: number): [T[], boolean] {
  let changed = false

  const remove = (list: T[]): T[] => {
    const result: T[] = []

    for (const item of list) {
      if (item.id === commentId) {
        changed = true
        continue
      }

      let nextItem = item
      if (Array.isArray(item.replies) && item.replies.length > 0) {
        const [nextReplies, childChanged] = removeCommentById(item.replies, commentId)
        if (childChanged) {
          changed = true
          nextItem = {
            ...item,
            replies: nextReplies,
            reply_count: nextReplies.length,
          }
        }
      }

      result.push(nextItem)
    }

    return result
  }

  const nextComments = remove(comments)
  return [changed ? nextComments : comments, changed]
}

export function countComments<T extends ThreadComment<T>>(comments: T[]): number {
  return comments.reduce((total, comment) => {
    const children = Array.isArray(comment.replies) ? countComments(comment.replies) : 0
    return total + 1 + children
  }, 0)
}
