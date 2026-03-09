<template>
  <Teleport to="body">
    <div
      v-if="open"
      :data-surface-id="surfaceId"
      class="overlay-surface-modal"
      :class="[
        `overlay-surface-modal--${variant}`,
        { 'overlay-surface-modal--non-closable': !closable },
      ]"
      role="dialog"
      aria-modal="true"
    >
      <div
        data-surface-part="backdrop"
        class="overlay-surface-modal__backdrop"
        @click="handleBackdropClick"
      />

      <div
        data-surface-part="shell"
        class="overlay-surface-modal__shell"
        :class="shellClass"
        :style="shellStyle"
      >
        <div data-surface-part="header" class="overlay-surface-modal__header">
          <div class="overlay-surface-modal__title">
            <slot name="title">
              <span>{{ title }}</span>
            </slot>
          </div>
          <button
            type="button"
            data-surface-part="close-control"
            class="overlay-surface-modal__close"
            :class="{ 'overlay-surface-modal__close--placeholder': !closable }"
            :aria-hidden="closable ? 'false' : 'true'"
            :tabindex="closable ? 0 : -1"
            @click="handleCloseClick"
          >
            <span class="overlay-surface-modal__close-text" aria-hidden="true">×</span>
          </button>
        </div>

        <div
          data-surface-part="body"
          class="overlay-surface-modal__body"
          :class="bodyClass"
        >
          <slot />
        </div>

        <div
          v-if="showFooter && hasFooter"
          data-surface-part="footer"
          class="overlay-surface-modal__footer"
          :class="footerClass"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, useSlots, watch } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  surfaceId: string
  title?: string
  width?: string | number
  maxHeight?: string | number
  variant?: 'default' | 'accent'
  showFooter?: boolean
  closable?: boolean
  maskClosable?: boolean
  keyboard?: boolean
  shellClass?: string | string[] | Record<string, boolean>
  bodyClass?: string | string[] | Record<string, boolean>
  footerClass?: string | string[] | Record<string, boolean>
}>(), {
  title: '',
  width: 520,
  maxHeight: '90vh',
  variant: 'default',
  showFooter: true,
  closable: true,
  maskClosable: true,
  keyboard: true,
  shellClass: undefined,
  bodyClass: undefined,
  footerClass: undefined,
})

const emit = defineEmits<{
  cancel: []
}>()

const slots = useSlots()
const hasFooter = computed(() => Boolean(slots.footer))

const shellStyle = computed(() => {
  const maxWidth = typeof props.width === 'number' ? `${props.width}px` : props.width
  const maxHeight = typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight
  return { width: '90%', maxWidth, maxHeight }
})

const emitCancel = () => emit('cancel')

const handleBackdropClick = () => {
  if (props.maskClosable) emitCancel()
}

const handleCloseClick = () => {
  if (props.closable) emitCancel()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.open || !props.keyboard || event.key !== 'Escape') return
  if (props.closable || props.maskClosable) emitCancel()
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      window.addEventListener('keydown', handleKeydown)
      return
    }
    window.removeEventListener('keydown', handleKeydown)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped lang="scss">
.overlay-surface-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
  }

  &__shell {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 20px;
    box-shadow: none;
    overflow: hidden;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 22px 26px;
    border-bottom: 1px solid var(--border, #E2E8F0);
    background: #fff;
    flex-shrink: 0;
  }

  &__title {
    color: var(--text, #1E293B);
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
    display: inline-flex;
    align-items: center;
  }

  &__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: var(--bg, #F8FAFC);
    color: var(--text-secondary, #64748B);
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
    flex-shrink: 0;

    &:hover {
      background: var(--primary-light, #EEF2FF);
      color: var(--primary, #6366F1);
    }

    &--placeholder {
      opacity: 0;
      pointer-events: none;
    }
  }

  &__close-text {
    font-size: 20px;
    line-height: 1;
    font-weight: 400;
  }

  &__body {
    padding: 26px;
    background: #fff;
    overflow-y: auto;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 18px 26px;
    border-top: 1px solid var(--border, #E2E8F0);
    background: #fff;
    flex-shrink: 0;
  }

  &--accent {
    .overlay-surface-modal__shell {
      border-radius: 16px;
    }

    .overlay-surface-modal__header {
      background: var(--primary-gradient, linear-gradient(135deg, #4F46E5, #8B5CF6));
      border-bottom: none;
    }

    .overlay-surface-modal__title {
      color: #fff;
    }

    .overlay-surface-modal__close {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;

      &:hover {
        background: rgba(255, 255, 255, 0.28);
        color: #fff;
      }
    }
  }
}
</style>
