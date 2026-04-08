<script setup lang="ts">
import type { Shiori, CollaboratorWithProfile } from '~~/types/database'

const props = defineProps<{
  shiori: Shiori
  isOwner: boolean
}>()

const isOpen = defineModel<boolean>('show', { required: true })

const emit = defineEmits<{
  'updated': [isPublic: boolean]
}>()

const { authFetch } = useAuthFetch()
const toast = useToast()

const isPublic = ref(props.shiori.is_public)
const toggling = ref<boolean>(false)
const inviteEnabled = ref(props.shiori.invite_enabled)
const inviteToken = ref(props.shiori.invite_token)
const inviteToggling = ref<boolean>(false)
const collaborators = ref<CollaboratorWithProfile[]>([])
const loadingCollaborators = ref<boolean>(false)
const kickingId = ref<string | null>(null)

// props変更に追従（1つのwatchにまとめる）
watch(
  () => [props.shiori.is_public, props.shiori.invite_enabled, props.shiori.invite_token] as const,
  ([pub, inv, tok]) => {
    isPublic.value = pub
    inviteEnabled.value = inv
    inviteToken.value = tok
  },
)

// モーダル開閉時にコラボレーター一覧を取得
watch(isOpen, (open) => {
  if (open) {
    fetchCollaborators()
  }
})

const shareUrl = computed(() => {
  if (import.meta.client) {
    return `${window.location.origin}/s/${props.shiori.id}`
  }
  return `/s/${props.shiori.id}`
})

const inviteUrl = computed(() => {
  if (!inviteToken.value) return ''
  if (import.meta.client) {
    return `${window.location.origin}/invite/${inviteToken.value}`
  }
  return `/invite/${inviteToken.value}`
})

/** 公開/非公開を切り替え */
async function togglePublic(value: boolean) {
  toggling.value = true
  try {
    await authFetch(`/api/shiori/${props.shiori.id}`, {
      method: 'PUT',
      body: { is_public: value },
    })
    isPublic.value = value
    emit('updated', value)
    toast.add({
      title: value ? 'しおりを公開しました' : 'しおりを非公開にしました',
      color: 'success',
    })
  }
  catch {
    isPublic.value = !value
    toast.add({ title: '設定の変更に失敗しました', color: 'error' })
  }
  finally {
    toggling.value = false
  }
}

/** 招待リンクの有効化/無効化 */
async function toggleInvite(value: boolean) {
  inviteToggling.value = true
  try {
    const data = await authFetch<Shiori>(`/api/shiori/${props.shiori.id}/invite`, {
      method: 'PUT',
      body: { invite_enabled: value },
    })
    inviteEnabled.value = data.invite_enabled
    inviteToken.value = data.invite_token
    toast.add({
      title: value ? '招待リンクを有効にしました' : '招待リンクを無効にしました',
      color: 'success',
    })
  }
  catch {
    inviteEnabled.value = !value
    toast.add({ title: '招待設定の変更に失敗しました', color: 'error' })
  }
  finally {
    inviteToggling.value = false
  }
}



/** コラボレーター一覧を取得 */
async function fetchCollaborators() {
  loadingCollaborators.value = true
  try {
    collaborators.value = await authFetch<CollaboratorWithProfile[]>(
      `/api/shiori/${props.shiori.id}/collaborators`,
    )
  }
  catch {
    // エラー時は空配列（サイレント）
    collaborators.value = []
  }
  finally {
    loadingCollaborators.value = false
  }
}

// キック確認ダイアログ
const kickTarget = ref<CollaboratorWithProfile | null>(null)
const showKickConfirm = ref<boolean>(false)

/** キック確認ダイアログを開く */
function confirmKick(collab: CollaboratorWithProfile) {
  kickTarget.value = collab
  showKickConfirm.value = true
}

/** コラボレーターをキック */
async function kickCollaborator() {
  if (!kickTarget.value) return
  const collaboratorId = kickTarget.value.id
  kickingId.value = collaboratorId
  try {
    await authFetch(`/api/shiori/${props.shiori.id}/collaborators/${collaboratorId}`, {
      method: 'DELETE',
    })
    collaborators.value = collaborators.value.filter((c) => c.id !== collaboratorId)
    toast.add({ title: 'コラボレーターを削除しました', color: 'success' })
  }
  catch {
    toast.add({ title: 'コラボレーターの削除に失敗しました', color: 'error' })
  }
  finally {
    kickingId.value = null
    showKickConfirm.value = false
    kickTarget.value = null
  }
}

/** ロール表示名 */
function roleLabel(role: string) {
  return role === 'owner' ? 'オーナー' : '編集者'
}
</script>

<template>
  <UModal v-model:open="isOpen" title="共有設定">
    <template #title>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-share-2" class="size-5 text-amber-700 dark:text-amber-400" />
        <span class="font-semibold">共有設定</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- 公開トグル（オーナーのみ） -->
        <div v-if="isOwner" class="flex items-center justify-between">
          <div>
            <p class="font-medium text-stone-900 dark:text-stone-50">
              リンクで公開
            </p>
            <p class="mt-0.5 text-sm text-stone-500">
              URLを知っている人なら誰でも閲覧できます
            </p>
          </div>
          <USwitch
            :model-value="isPublic"
            :disabled="toggling"
            @update:model-value="togglePublic"
          />
        </div>

        <!-- 共有URL（公開時のみ表示） -->
        <div v-if="isPublic" class="space-y-3">
          <AtomsCopyableInput
            :value="shareUrl"
            icon="i-lucide-link"
            toast-message="URLをコピーしました"
          />
          <p class="text-xs text-stone-400">
            ログインなしで閲覧専用ページとして表示されます
          </p>
        </div>

        <!-- 区切り線 -->
        <USeparator v-if="isOwner" />

        <!-- 招待リンク（オーナーのみ） -->
        <div v-if="isOwner">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-stone-900 dark:text-stone-50">
                共同編集の招待
              </p>
              <p class="mt-0.5 text-sm text-stone-500">
                リンクで他のユーザーを編集者として招待
              </p>
            </div>
            <USwitch
              :model-value="inviteEnabled"
              :disabled="inviteToggling"
              @update:model-value="toggleInvite"
            />
          </div>

          <!-- 招待URL（有効時のみ） -->
          <div v-if="inviteEnabled && inviteToken" class="mt-3 space-y-2">
            <AtomsCopyableInput
              :value="inviteUrl"
              icon="i-lucide-user-plus"
              toast-message="招待URLをコピーしました"
            />
            <p class="text-xs text-stone-400">
              このリンクを共有すると、ログインしたユーザーが編集者として参加できます
            </p>
          </div>
        </div>

        <!-- 区切り線 -->
        <USeparator />

        <!-- コラボレーター一覧 -->
        <div>
          <h4 class="mb-3 flex items-center gap-2 text-sm font-medium text-stone-900 dark:text-stone-50">
            <UIcon name="i-lucide-users" class="size-4" />
            メンバー
            <UBadge v-if="collaborators.length > 0" variant="subtle" size="xs">
              {{ collaborators.length }}
            </UBadge>
          </h4>

          <div v-if="loadingCollaborators" class="space-y-3">
            <div v-for="i in 2" :key="i" class="flex items-center gap-3">
              <USkeleton class="size-8 rounded-full" />
              <div class="flex-1">
                <USkeleton class="mb-1 h-4 w-24" />
                <USkeleton class="h-3 w-16" />
              </div>
            </div>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="collab in collaborators"
              :key="collab.id"
              class="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              <!-- アバター -->
              <div class="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-50 dark:bg-amber-900/20">
                <img
                  v-if="collab.profile?.avatar_url"
                  :src="collab.profile.avatar_url"
                  :alt="collab.profile?.display_name || ''"
                  width="32"
                  height="32"
                  class="size-full object-cover"
                >
                <UIcon v-else name="i-lucide-user" class="size-4 text-amber-700 dark:text-amber-400" />
              </div>

              <!-- 名前とロール -->
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                  {{ collab.profile?.display_name || 'ゲストユーザー' }}
                </p>
                <p class="text-xs text-stone-400">
                  {{ roleLabel(collab.role) }}
                </p>
              </div>

              <!-- キックボタン（オーナーのみ、自分以外のeditorに表示） -->
              <UButton
                v-if="isOwner && collab.role !== 'owner'"
                icon="i-lucide-x"
                variant="ghost"
                size="xs"
                aria-label="メンバーを削除"
                class="text-stone-400 hover:!text-error-500"
                @click="confirmKick(collab)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton variant="ghost" @click="isOpen = false">
          閉じる
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- キック確認ダイアログ -->
  <AtomsConfirmModal
    v-model:show="showKickConfirm"
    title="メンバーを削除"
    :description="`「${kickTarget?.profile?.display_name || 'ゲストユーザー'}」をこのしおりから削除しますか？`"
    :loading="kickingId !== null"
    @confirm="kickCollaborator"
  />
</template>
