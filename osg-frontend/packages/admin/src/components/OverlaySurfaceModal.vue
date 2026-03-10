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
          <div data-content-part="title" class="overlay-surface-modal__title">
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
          data-content-part="action-row"
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

    :deep(.ant-form) {
      width: 100%;
    }

    :deep(.ant-form-item) {
      margin-bottom: 8px;
    }

    :deep(.ant-form-item:last-child) {
      margin-bottom: 0;
    }

    :deep(.ant-form-item-label) {
      padding-bottom: 0;
    }

    :deep(.ant-form-item-label > label) {
      min-height: 0;
      color: var(--text, #1E293B);
      font-size: 14px;
      font-weight: 600;
      line-height: 20px;
    }

    :deep(.ant-input),
    :deep(.ant-input-affix-wrapper),
    :deep(.ant-input-number),
    :deep(textarea.ant-input) {
      padding: 12px 14px;
      border: 2px solid var(--border, #E2E8F0);
      border-radius: 10px;
      background: #fff;
      box-shadow: none;
      color: var(--text, #1E293B);
      font-size: 14px;
      line-height: 20px;
    }

    :deep(.ant-input:hover),
    :deep(.ant-input:focus),
    :deep(.ant-input-affix-wrapper:hover),
    :deep(.ant-input-affix-wrapper:focus),
    :deep(.ant-input-affix-wrapper-focused),
    :deep(.ant-input-number:hover),
    :deep(.ant-input-number-focused),
    :deep(textarea.ant-input:hover),
    :deep(textarea.ant-input:focus) {
      border-color: var(--primary, #6366F1);
      box-shadow: none;
    }

    :deep(.ant-input-affix-wrapper) {
      min-height: 44px;
    }

    :deep(.ant-input-affix-wrapper > input.ant-input) {
      padding: 0;
      border: 0;
      border-radius: 0;
      box-shadow: none;
      background: transparent;
    }

    :deep(.ant-input-prefix),
    :deep(.ant-input-password-icon),
    :deep(.ant-input-suffix) {
      color: var(--text-secondary, #64748B);
    }

    :deep(.ant-select-single:not(.ant-select-customize-input) .ant-select-selector),
    :deep(.ant-picker),
    :deep(.ant-input-number) {
      min-height: 44px;
      padding: 12px 14px;
      border: 2px solid var(--border, #E2E8F0);
      border-radius: 10px;
      box-shadow: none;
      align-items: center;
    }

    :deep(.ant-select-selector) {
      padding: 12px 14px;
    }

    :deep(.ant-select-single .ant-select-selection-item),
    :deep(.ant-select-single .ant-select-selection-placeholder) {
      line-height: 20px;
    }

    :deep(.ant-select-arrow) {
      color: var(--text-secondary, #64748B);
    }
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 18px 26px;
    border-top: 1px solid var(--border, #E2E8F0);
    background: #fff;
    flex-shrink: 0;

    :deep(.overlay-surface-modal__footer .ant-btn) {
      min-width: 80px;
      height: 40px;
      padding: 0 16px;
      border-radius: 10px;
      box-shadow: none;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    :deep(.overlay-surface-modal__footer .ant-btn-default) {
      border: 1px solid var(--border, #E2E8F0);
      background: #fff;
      color: var(--text-secondary, #64748B);
    }

    :deep(.overlay-surface-modal__footer .ant-btn-primary) {
      border: none;
      background: var(
        --primary-gradient,
        linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)
      );
      color: #fff;
    }
  }

  &--accent {
    .overlay-surface-modal__shell {
      border-radius: 20px;
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
