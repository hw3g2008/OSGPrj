<template>
  <div class="direction-cascade" data-field-name="主攻方向">
    <div class="direction-cascade__header">
      <div>
        <span class="direction-cascade__label">
          主攻方向
          <span class="direction-cascade__required">*</span>
        </span>
        <p>可多选，系统会根据所选方向动态过滤可选子方向。</p>
      </div>
      <span class="direction-cascade__badge">{{ selectedCount }} 个方向</span>
    </div>

    <div class="direction-cascade__grid">
      <button
        v-for="option in directionOptions"
        :key="option.value"
        type="button"
        :class="['direction-cascade__chip', { 'direction-cascade__chip--active': isSelected(option.value) }]"
        @click="toggleDirection(option.value)"
      >
        <strong>{{ option.label }}</strong>
        <span>{{ option.description }}</span>
      </button>
    </div>

    <div class="direction-cascade__sub" data-field-name="子方向">
      <span class="direction-cascade__label">
        子方向
        <span class="direction-cascade__required">*</span>
      </span>
      <a-select
        :value="subDirection"
        :options="subDirectionOptions"
        :disabled="!subDirectionOptions.length"
        placeholder="请先选择主攻方向"
        show-search
        @update:value="handleSubDirectionChange"
      />
      <p class="direction-cascade__hint">
        {{ hintText }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  majorDirections?: string[]
  subDirection?: string
}>(), {
  majorDirections: () => [],
  subDirection: undefined
})

const emit = defineEmits<{
  'update:majorDirections': [value: string[]]
  'update:subDirection': [value?: string]
}>()

const directionOptions = [
  { value: 'Finance', label: 'Finance / 金融', description: 'IB / PE / VC / S&T / AM / ER' },
  { value: 'Consulting', label: 'Consulting / 咨询', description: 'Strategy / Ops / Growth' },
  { value: 'Tech', label: 'Tech / 科技', description: 'PM / Data / SWE / AI' },
  { value: 'Quant', label: 'Quant / 量化', description: 'Research / Trading / Dev' }
] as const

const subDirectionMap: Record<string, { label: string; value: string }[]> = {
  Finance: [
    { label: 'IB', value: 'IB' },
    { label: 'PE', value: 'PE' },
    { label: 'VC', value: 'VC' },
    { label: 'S&T', value: 'S&T' },
    { label: 'AM', value: 'AM' },
    { label: 'ER', value: 'ER' }
  ],
  Consulting: [
    { label: 'Strategy', value: 'Strategy' },
    { label: 'Operations', value: 'Operations' },
    { label: 'Transformation', value: 'Transformation' }
  ],
  Tech: [
    { label: 'Product', value: 'Product' },
    { label: 'Data', value: 'Data' },
    { label: 'Software', value: 'Software' },
    { label: 'AI', value: 'AI' }
  ],
  Quant: [
    { label: 'Quant Research', value: 'Quant Research' },
    { label: 'Quant Trading', value: 'Quant Trading' },
    { label: 'Quant Dev', value: 'Quant Dev' }
  ]
}

const selectedCount = computed(() => props.majorDirections.length)
const subDirectionOptions = computed(() => {
  const seen = new Set<string>()
  const merged: { label: string; value: string }[] = []
  props.majorDirections.forEach((direction) => {
    const options = subDirectionMap[direction] ?? []
    options.forEach((option) => {
      if (seen.has(option.value)) {
        return
      }
      seen.add(option.value)
      merged.push(option)
    })
  })
  return merged
})

const hintText = computed(() => {
  if (!props.majorDirections.length) {
    return '选择主攻方向后，这里会自动显示对应的子方向。'
  }
  return `当前已开放 ${subDirectionOptions.value.length} 个子方向选项。`
})

watch(
  () => [props.majorDirections.join(','), props.subDirection],
  () => {
    if (!props.subDirection) {
      return
    }
    const valid = subDirectionOptions.value.some((option) => option.value === props.subDirection)
    if (!valid) {
      emit('update:subDirection', undefined)
    }
  }
)

const isSelected = (value: string) => props.majorDirections.includes(value)

const toggleDirection = (value: string) => {
  const next = isSelected(value)
    ? props.majorDirections.filter((item) => item !== value)
    : directionOptions
        .map((option) => option.value)
        .filter((option) => option === value || props.majorDirections.includes(option))
  emit('update:majorDirections', next)
}

const handleSubDirectionChange = (value?: string) => {
  emit('update:subDirection', value)
}
</script>

<style scoped lang="scss">
.direction-cascade {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid #dbeafe;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 1));
}

.direction-cascade__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  p {
    margin: 4px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.5;
  }
}

.direction-cascade__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.direction-cascade__required {
  color: #dc2626;
}

.direction-cascade__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
}

.direction-cascade__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.direction-cascade__chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 16px;
  background: #fff;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  strong {
    color: #0f172a;
    font-size: 14px;
  }

  span {
    color: #64748b;
    font-size: 12px;
    line-height: 1.5;
    text-align: left;
  }

  &:hover {
    transform: translateY(-1px);
    border-color: #93c5fd;
  }
}

.direction-cascade__chip--active {
  border-color: #60a5fa;
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.96), rgba(224, 242, 254, 0.9));
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.28);
}

.direction-cascade__sub {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.direction-cascade__hint {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 720px) {
  .direction-cascade__header {
    flex-direction: column;
  }

  .direction-cascade__grid {
    grid-template-columns: 1fr;
  }
}
</style>
