<template>
  <div id="page-positions" class="positions-page" :data-action-trigger-count="positionsActionTriggers.length">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('student.positions.k1') }} <span class="page-title-en">Job Tracker</span></h1>
      </div>
      <div class="header-actions">
        <a-radio-group v-model:value="viewMode" button-style="solid" size="small" class="view-toggle">
          <a-radio-button value="list">
            <template #icon><UnorderedListOutlined /></template>
            {{ t('student.positions.k2') }}
          </a-radio-button>
          <a-radio-button value="drilldown">
            <template #icon><AppstoreOutlined /></template>
            {{ t('student.positions.k3') }}
          </a-radio-button>
        </a-radio-group>
        <a-button type="primary" @click="openManualAddModal">
          <template #icon><PlusOutlined /></template>
          {{ t('student.positions.k4') }}
        </a-button>
      </div>
    </div>

    <a-alert v-if="isProfileIncomplete" type="warning" show-icon class="permission-notice">
      <template #message>
        {{ t('student.positions.k5') }}
        <strong>{{ t('student.positions.k6') }}</strong> {{ t('student.positions.k7') }}
      </template>
      <template #action>
        <a-button type="primary" size="small" @click="router.push('/profile')">
          {{ t('student.positions.k8') }} <RightOutlined />
        </a-button>
      </template>
    </a-alert>
    <a-alert v-else type="info" show-icon class="permission-notice">
      <template #message>
        {{ t('student.positions.k9') }} <strong>{{ intentSummary.recruitmentCycle }}</strong> {{ t('student.positions.k10') }}
        <strong>{{ intentSummary.targetRegion }}</strong> {{ t('student.positions.k11') }}
        <strong>{{ intentSummary.primaryDirection }}</strong> {{ t('student.positions.k12') }}
      </template>
      <template #action>
        <a-button type="link" size="small" @click="router.push('/profile')">
          {{ t('student.positions.k8') }} <RightOutlined />
        </a-button>
      </template>
    </a-alert>

    <a-empty
      v-if="isProfileIncomplete"
      :description="t('student.positions.k37')"
      class="profile-incomplete-empty"
      style="padding: 60px 0"
    >
      <a-button type="primary" @click="router.push('/profile')">{{ t('student.positions.k13') }}</a-button>
    </a-empty>

    <template v-else>

    <a-card :bordered="false" class="filter-card">
      <div class="filter-controls">
        <a-select v-model:value="filters.category" :placeholder="t('student.positions.k38')" class="filter-select filter-select-category" allow-clear>
          <a-select-option v-for="option in filterOptions.categories" :key="option.value" :value="option.value">
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-select v-model:value="filters.industry" :placeholder="t('student.positions.k39')" class="filter-select filter-select-industry" allow-clear>
          <a-select-option v-for="option in filterOptions.industries" :key="option.value" :value="option.value">
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.company"
          :placeholder="t('student.positions.k40')"
          class="filter-select filter-select-company"
          allow-clear
          show-search
          option-filter-prop="label"
        >
          <a-select-option v-for="option in filterOptions.companies" :key="option.value" :value="option.value" :label="option.label">
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-select v-model:value="filters.location" :placeholder="t('student.positions.k41')" class="filter-select filter-select-location" allow-clear>
          <a-select-option v-for="option in filterOptions.locations" :key="option.value" :value="option.value">
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-input-search
          v-model:value="filters.keyword"
          :placeholder="t('student.positions.k42')"
          class="filter-search"
          search-button
        />
      </div>
    </a-card>

    <div class="content-tab-strip" role="tablist">
      <button
        type="button"
        class="content-tab-pill"
        :class="{ 'content-tab-pill--active': activeTab === 'all' }"
        role="tab"
        :aria-selected="activeTab === 'all'"
        @click="activeTab = 'all'"
      >
        <i class="mdi mdi-briefcase-search" aria-hidden="true"></i>
        <span>{{ t('student.positions.k14') }}</span>
      </button>
      <button
        type="button"
        class="content-tab-pill"
        :class="{ 'content-tab-pill--active': activeTab === 'favorites' }"
        role="tab"
        :aria-selected="activeTab === 'favorites'"
        @click="activeTab = 'favorites'"
      >
        <i class="mdi mdi-star content-tab-pill-star" aria-hidden="true"></i>
        <span>{{ t('student.positions.k15') }}</span>
        <span v-if="favoritePositions.length > 0" class="content-tab-badge">{{ favoritePositions.length }}</span>
      </button>
    </div>

    <div
      v-if="activeTab === 'all'"
      role="tabpanel"
      class="content-panel"
      aria-labelledby="positions-tab-all"
    >
      <div v-if="viewMode === 'drilldown'" class="drilldown-view">
          <div
            v-for="industry in groupedIndustries"
            :key="industry.key"
            class="industry-section"
            :class="`industry-${industry.tone}`"
          >
            <div class="industry-header" @click="toggleIndustry(industry.key)">
              <div class="industry-info">
                <RightOutlined :class="['industry-chevron', { 'rotate-icon': activeCategories.includes(industry.key) }]" />
                <i class="mdi industry-icon" :class="industry.icon" aria-hidden="true" />
                <span class="industry-name">{{ industry.label }}</span>
                <a-tag color="blue">{{ t('student.positions.k149', { n: industry.companyCount }) }}</a-tag>
                <a-tag color="green">{{ t('student.positions.k150', { n: industry.positionCount }) }}</a-tag>
              </div>
            </div>

            <div v-if="activeCategories.includes(industry.key)" class="industry-content">
              <div
                v-for="company in industry.companies"
                :key="company.companyKey"
                class="company-section"
              >
                <div class="company-header" @click="toggleCompany(company.companyKey)">
                  <div class="company-info">
                    <RightOutlined :class="{ 'rotate-icon': expandedCompanies.includes(company.companyKey) }" />
                    <div class="company-logo" :style="{ background: getCompanyBrandColor(company.companyKey) }">
                      {{ company.companyCode }}
                    </div>
                    <span class="company-name">{{ company.companyName }}</span>
                  </div>
                  <div class="company-actions">
                    <span class="company-count"><strong>{{ company.positions.length }}</strong> {{ t('student.positions.k16') }}</span>
                    <a-button
                      size="small"
                      class="company-career-link"
                      :href="company.careerUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      @click.stop
                    >
                      <template #icon><ExportOutlined /></template>
                      {{ t('student.positions.k17') }}
                    </a-button>
                  </div>
                </div>

                <div v-if="expandedCompanies.includes(company.companyKey)" class="company-content">
                  <a-table
                    :columns="positionColumns"
                    :data-source="company.positions"
                    :pagination="false"
                    size="small"
                    :row-key="(record: PositionRecord) => record.id"
                    :scroll="{ x: 1120 }"
                  >
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'title'">
                        <a :href="record.url" target="_blank" rel="noopener noreferrer" class="job-link">
                          {{ record.title }}
                          <ExportOutlined />
                        </a>
                        <div v-if="record.requirements" class="job-requirements">
                          {{ record.requirements }}
                        </div>
                      </template>

                      <template v-else-if="column.key === 'category'">
                        <a-tag :color="getCategoryColor(record.category)">{{ record.categoryText }}</a-tag>
                      </template>

                      <template v-else-if="column.key === 'actions'">
                        <a-space :size="10" wrap>
                          <a-button size="small" :type="record.favorited ? 'primary' : 'default'" @click="toggleFavorite(record)">
                            <template #icon>
                              <StarFilled v-if="record.favorited" />
                              <StarOutlined v-else />
                            </template>
                          </a-button>
                          <a-select
                            :value="record.applied ? record.progressStage : undefined"
                            :options="filterOptions.progressStages"
                            class="progress-stage-select"
                            size="small"
                            :placeholder="t('student.positions.k43')"
                            style="width: 110px"
                            @change="(val: string) => handleActionStageChange(record, val)"
                          />
                        </a-space>
                      </template>
                    </template>
                  </a-table>
                </div>
              </div>
            </div>
          </div>

          <div class="positions-summary">
            <span class="summary-total">{{ t('student.positions.k18') }} <strong>{{ filteredPositions.length }}</strong> {{ t('student.positions.k16') }}</span>
            <span class="summary-open">
              <i class="mdi mdi-circle-small" aria-hidden="true"></i>
              {{ t('student.positions.k151', { n: openPositionsCount }) }}
            </span>
            <span class="summary-closed">
              <i class="mdi mdi-circle-small" aria-hidden="true"></i>
              {{ t('student.positions.k152', { n: closedPositionsCount }) }}
            </span>
          </div>
      </div>

      <a-card v-else :bordered="false">
        <a-table
          :columns="listColumns"
          :data-source="filteredPositions"
          :pagination="{ pageSize: 10 }"
          :row-key="(record: PositionRecord) => record.id"
          :scroll="{ x: 1050 }"
          class="positions-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'title'">
              <a :href="record.url" target="_blank" rel="noopener noreferrer" class="job-link">
                {{ record.title }}
                <ExportOutlined />
              </a>
            </template>

            <template v-else-if="column.key === 'companyCell'">
              <div class="company-cell">
                <div class="company-logo-mini" :style="{ background: getCompanyBrandColor(record.companyKey) }">{{ record.companyCode }}</div>
                <a-tooltip :title="record.company" placement="topLeft">
                  <span class="company-name-text">{{ record.company }}</span>
                </a-tooltip>
              </div>
            </template>

            <template v-else-if="column.key === 'industryCell'">
              <a-tooltip :title="record.industryLabel || '-'" placement="topLeft">
                <span class="industry-pill" :class="`industry-pill--${resolveIndustryMeta(record.industry).tone}`">
                  {{ record.industryLabel || '-' }}
                </span>
              </a-tooltip>
            </template>

            <template v-else-if="column.key === 'category'">
              <a-tooltip :title="record.categoryText" placement="topLeft">
                <a-tag :color="getCategoryColor(record.category)" class="cell-tag">{{ record.categoryText }}</a-tag>
              </a-tooltip>
            </template>

            <template v-else-if="column.key === 'recruitCycleCell'">
              <a-tooltip :title="record.recruitCycle" placement="topLeft">
                <a-tag color="processing" class="cell-tag">{{ record.recruitCycle }}</a-tag>
              </a-tooltip>
            </template>

            <template v-else-if="column.key === 'regionCell'">
              <!-- RULE-E: 优先字典 label，兜底用 client-side regionDictMap 映射 location 英文 value 到中文 -->
              <span>{{ regionDisplayLabel(record.regionLabel, record.location) }}</span>
            </template>

            <template v-else-if="column.key === 'deadlineCell'">
              <span :class="deadlineToneClass(record.deadline)">{{ record.deadline || '--' }}</span>
            </template>

            <template v-else-if="column.key === 'actions'">
              <div class="action-cell">
                <a-tooltip :title="t('student.positions.k44')">
                  <a-button
                    size="small"
                    shape="circle"
                    class="action-icon-btn"
                    :class="record.favorited ? 'action-icon-btn--star' : 'action-icon-btn--star-off'"
                    @click="toggleFavorite(record)"
                  >
                    <template #icon>
                      <StarFilled v-if="record.favorited" />
                      <StarOutlined v-else />
                    </template>
                  </a-button>
                </a-tooltip>
                <a-select
                  :value="record.applied ? record.progressStage : undefined"
                  :options="filterOptions.progressStages"
                  class="progress-stage-select"
                  size="small"
                  :placeholder="t('student.positions.k43')"
                  style="width: 110px"
                  @change="(val: string) => handleActionStageChange(record, val)"
                />
              </div>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <div
      v-else
      role="tabpanel"
      class="content-panel"
      aria-labelledby="positions-tab-favorites"
    >
      <a-card :bordered="false" class="favorites-card">
        <template #title>
          <span class="favorites-card-title">
            <i class="mdi mdi-star" aria-hidden="true"></i>
            {{ t('student.positions.k19') }}
          </span>
        </template>
        <a-table
          :columns="favoriteColumns"
          :data-source="favoritePositions"
          :pagination="{ pageSize: 10 }"
          :row-key="(record: PositionRecord) => `favorite-${record.id}`"
          class="favorites-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'job'">
              <div class="favorite-job-cell">
                <div class="favorite-company">{{ record.company }}</div>
                <div class="favorite-position">{{ record.title }}</div>
              </div>
            </template>

            <template v-else-if="column.key === 'recruitCycle'">
              <a-tag color="blue">{{ record.recruitCycle }}</a-tag>
            </template>

            <template v-else-if="column.key === 'deadlineCell'">
              <span :class="deadlineToneClass(record.deadline)">{{ record.deadline || '--' }}</span>
            </template>

            <template v-else-if="column.key === 'actions'">
              <a-space :size="6" class="fav-action-cell">
                <a-tooltip :title="t('student.positions.k45')">
                  <a-button
                    type="text"
                    size="small"
                    class="fav-icon-btn fav-icon-btn--star"
                    @click="toggleFavorite(record)"
                  >
                    <i
                      class="mdi"
                      :class="record.favorited ? 'mdi-star' : 'mdi-star-outline'"
                      aria-hidden="true"
                    ></i>
                  </a-button>
                </a-tooltip>
                <a-select
                  :value="record.applied ? record.progressStage : undefined"
                  :placeholder="t('student.positions.k43')"
                  size="small"
                  class="action-stage-select"
                  style="width: 110px"
                  @change="(val: string) => handleActionStageChange(record, val)"
                >
                  <a-select-option
                    v-for="option in filterOptions.progressStages"
                    :key="`stage-${record.id}-${option.value}`"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>
    </template>

    <a-modal
      v-model:open="manualAddOpen"
      wrap-class-name="osg-modal-form"
      :title="t('student.positions.k46')"
      :ok-text="t('student.positions.k47')"
      :cancel-text="t('student.positions.k48')"
      :width="640"
      destroy-on-close
      @ok="submitManualPosition"
    >
      <a-alert
        type="info"
        show-icon
        :message="t('student.positions.k49')"
        class="manual-add-tip"
      />

      <a-form layout="vertical" class="manual-form">
        <div class="manual-section">
          <div class="manual-section-title">{{ t('student.positions.k20') }}</div>
          <div class="manual-section-grid">
            <a-form-item :label="t('student.positions.k50')" required class="manual-field manual-field--full">
              <a-input v-model:value="manualForm.title" :placeholder="t('student.positions.k51')" :maxlength="128" />
            </a-form-item>
            <a-form-item :label="t('student.positions.k52')" class="manual-field">
              <a-input v-model:value="manualForm.company" :placeholder="t('student.positions.k53')" />
            </a-form-item>
            <a-form-item :label="t('student.positions.k54')" class="manual-field">
              <a-input v-model:value="manualForm.companyType" :placeholder="t('student.positions.k55')" />
            </a-form-item>
            <a-form-item :label="t('student.positions.k56')" class="manual-field">
              <a-select v-model:value="manualForm.region" :placeholder="t('student.positions.k57')" @change="onManualRegionChange">
                <a-select-option v-for="r in regionDict" :key="r.value" :value="r.value">{{ r.label }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item :label="t('student.positions.k58')" class="manual-field">
              <a-select v-model:value="manualForm.city" :placeholder="t('student.positions.k59')" :disabled="!manualForm.region">
                <a-select-option v-for="city in manualCityOptions" :key="city.value" :value="city.value">{{ city.label }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item :label="t('student.positions.k60')" class="manual-field">
              <a-input v-model:value="manualForm.website" placeholder="https://..." />
            </a-form-item>
            <a-form-item :label="t('student.positions.k61')" required class="manual-field">
              <a-input v-model:value="manualForm.link" placeholder="https://..." />
            </a-form-item>
          </div>
        </div>

        <div class="manual-section">
          <div class="manual-section-title">{{ t('student.positions.k21') }}</div>
          <a-radio-group v-model:value="manualForm.needCoaching" class="manual-coaching-options">
            <a-radio :value="false" class="coaching-radio">{{ t('student.positions.k22') }}</a-radio>
            <a-radio :value="true" class="coaching-radio">{{ t('student.positions.k23') }}</a-radio>
          </a-radio-group>

          <div v-if="manualForm.needCoaching" class="manual-coaching-fields">
            <a-form-item :label="t('student.positions.k62')" required class="manual-field manual-field--full">
              <a-select v-model:value="manualForm.coachingStage" :placeholder="t('student.positions.k63')">
                <a-select-option value="hirevue">{{ t('student.positions.k24') }}</a-select-option>
                <a-select-option value="screening">Screening Call</a-select-option>
                <a-select-option value="first">First Round</a-select-option>
                <a-select-option value="second">Second Round</a-select-option>
                <a-select-option value="third">Third Round and Beyond</a-select-option>
                <a-select-option value="case">Case Study Round</a-select-option>
                <a-select-option value="superday">Superday / Assessment Centre / AC</a-select-option>
              </a-select>
            </a-form-item>

            <div v-if="manualCoachingIsHirevue" class="manual-hirevue-card">
              <div class="manual-hirevue-title"><span>{{ t('student.positions.k25') }}</span></div>
              <a-form-item :label="t('student.positions.k64')" required class="manual-field manual-field--full">
                <a-radio-group v-model:value="manualForm.hirevueType" class="inline-radios">
                  <a-radio value="vi">VI (Video Interview)</a-radio>
                  <a-radio value="ot">OT (Online Test)</a-radio>
                </a-radio-group>
              </a-form-item>
              <a-form-item v-if="manualForm.hirevueType === 'vi'" :label="t('student.positions.k65')" required class="manual-field manual-field--full">
                <a-input v-model:value="manualForm.viLink" :placeholder="t('student.positions.k66')" />
              </a-form-item>
              <template v-if="manualForm.hirevueType === 'ot'">
                <a-form-item :label="t('student.positions.k67')" required class="manual-field manual-field--full">
                  <a-input v-model:value="manualForm.otLink" :placeholder="t('student.positions.k68')" />
                </a-form-item>
                <div class="manual-section-grid">
                  <a-form-item :label="t('student.positions.k69')" required class="manual-field">
                    <a-input v-model:value="manualForm.otAccount" :placeholder="t('student.positions.k70')" />
                  </a-form-item>
                  <a-form-item :label="t('student.positions.k71')" required class="manual-field">
                    <a-input-password v-model:value="manualForm.otPassword" :placeholder="t('student.positions.k72')" />
                  </a-form-item>
                </div>
              </template>
              <a-form-item :label="t('student.positions.k73')" required class="manual-field manual-field--full" :extra="t('student.positions.k74')">
                <a-date-picker
                  v-model:value="manualForm.hirevueDeadline"
                  show-time
                  format="YYYY-MM-DD HH:mm"
                  value-format="YYYY-MM-DDTHH:mm"
                  style="width:100%"
                  :placeholder="t('student.positions.k75')"
                />
              </a-form-item>
              <a-form-item :label="t('student.positions.k76')" required class="manual-field manual-field--full">
                <a-upload
                  :action="uploadAction"
                  :headers="uploadHeaders"
                  name="file"
                  accept="image/*"
                  :max-count="1"
                  :file-list="manualHirevueFileList"
                  :show-upload-list="false"
                  class="upload-dropzone upload-dropzone--compact"
                  @change="handleManualHirevueUpload"
                >
                  <CloudUploadOutlined class="upload-dropzone__icon" />
                  <span class="upload-dropzone__title">{{ t('student.positions.k26') }}</span>
                  <span class="upload-dropzone__helper">{{ t('student.positions.k27') }}</span>
                  <span v-if="manualForm.inviteScreenshotName" class="upload-dropzone__file">{{ manualForm.inviteScreenshotName }}</span>
                </a-upload>
              </a-form-item>
              <a-form-item :label="t('student.positions.k77')" required class="manual-field manual-field--full">
                <a-radio-group v-model:value="manualForm.mentorHelp" class="inline-radios">
                  <a-radio value="yes">{{ t('student.positions.k28') }}</a-radio>
                  <a-radio value="no">{{ t('student.positions.k29') }}</a-radio>
                </a-radio-group>
              </a-form-item>
            </div>

            <template v-if="manualCoachingShowInterview">
              <a-form-item :label="t('student.positions.k78')" required class="manual-field manual-field--full" :extra="t('student.positions.k79')">
                <a-date-picker
                  v-model:value="manualForm.interviewTime"
                  show-time
                  format="YYYY-MM-DD HH:mm"
                  value-format="YYYY-MM-DDTHH:mm"
                  style="width:100%"
                  :placeholder="t('student.positions.k80')"
                />
              </a-form-item>
              <a-form-item :label="t('student.positions.k81')" class="manual-field manual-field--full">
                <a-select v-model:value="manualForm.mentorCount" :placeholder="t('student.positions.k57')">
                  <a-select-option v-for="option in filterOptions.mentorCounts" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>
              <div class="manual-section-grid">
                <a-form-item :label="t('student.positions.k82')" class="manual-field">
                  <a-input v-model:value="manualForm.preferMentor" :placeholder="t('student.positions.k83')" />
                </a-form-item>
                <a-form-item :label="t('student.positions.k84')" class="manual-field">
                  <a-input v-model:value="manualForm.excludeMentor" :placeholder="t('student.positions.k85')" />
                </a-form-item>
              </div>
            </template>

            <a-form-item :label="t('student.positions.k86')" class="manual-field manual-field--full">
              <a-textarea v-model:value="manualForm.note" :rows="2" :placeholder="t('student.positions.k87')" />
            </a-form-item>
          </div>
        </div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="progressModalOpen"
      wrap-class-name="osg-modal-form"
      :ok-text="t('student.positions.k88')"
      :cancel-text="t('student.positions.k48')"
      destroy-on-close
      @ok="submitProgressUpdate"
    >
      <template #title>
        <span style="display:inline-flex;align-items:center;gap:8px">
          <FileTextOutlined />
          <span>{{ t('student.positions.k30') }}</span>
        </span>
      </template>
      <div v-if="selectedPosition" class="modal-job-card progress-card">
        <div class="modal-job-title">{{ selectedPosition.company }}</div>
        <div class="modal-job-sub">{{ selectedPosition.title }} · {{ selectedPosition.location }}</div>
      </div>
      <a-form layout="vertical">
        <a-form-item :label="t('student.positions.k89')" required>
          <a-select
            v-model:value="progressForm.stage"
            show-search
            option-filter-prop="label"
            :placeholder="t('student.positions.k90')"
            :options="filterOptions.progressStages"
          />
        </a-form-item>
        <a-form-item :label="t('student.positions.k91')">
          <a-textarea v-model:value="progressForm.note" :rows="3" :placeholder="t('student.positions.k92')" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="appliedModalOpen"
      wrap-class-name="osg-modal-form"
      :ok-text="t('student.positions.k93')"
      :cancel-text="t('student.positions.k48')"
      destroy-on-close
      @ok="submitAppliedMark"
    >
      <template #title>
        <span style="display:inline-flex;align-items:center;gap:8px">
          <CheckCircleFilled style="color: #22c55e" />
          <span>{{ t('student.positions.k31') }}</span>
        </span>
      </template>
      <div v-if="selectedPosition" class="modal-job-card applied-card">
        <div class="modal-job-title">{{ selectedPosition.company }}</div>
        <div class="modal-job-sub">{{ selectedPosition.title }} · {{ selectedPosition.location }}</div>
      </div>
      <a-form layout="vertical">
        <a-form-item :label="t('student.positions.k94')" required>
          <a-date-picker v-model:value="appliedForm.date" value-format="YYYY-MM-DD" style="width:100%" :placeholder="t('student.positions.k95')" />
        </a-form-item>
        <a-form-item :label="t('student.positions.k96')" required>
          <a-select
            v-model:value="appliedForm.method"
            show-search
            option-filter-prop="label"
            :placeholder="t('student.positions.k97')"
            :options="filterOptions.applyMethods"
          />
        </a-form-item>
        <a-form-item :label="t('student.positions.k91')">
          <a-textarea v-model:value="appliedForm.note" :rows="3" :placeholder="t('student.positions.k98')" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="coachingModalOpen"
      wrap-class-name="osg-modal-form"
      :ok-text="t('student.positions.k99')"
      :cancel-text="t('student.positions.k48')"
      destroy-on-close
      :width="650"
      class="coaching-apply-modal"
      @ok="submitCoachingApplication"
    >
      <template #title>
        <span style="display:inline-flex;align-items:center;gap:8px">
          <i class="mdi mdi-briefcase-plus" aria-hidden="true" style="color: #1d4ed8; font-size: 16px"></i>
          <span>{{ t('student.positions.k32') }}</span>
        </span>
      </template>
      <div v-if="selectedPosition" class="modal-job-card coaching-card">
        <div class="modal-job-title">{{ selectedPosition.company }}</div>
        <div class="modal-job-sub">{{ selectedPosition.title }} · {{ selectedPosition.location }}</div>
      </div>
      <a-form layout="vertical">
        <a-form-item :label="t('student.positions.k62')" required>
          <a-select v-model:value="coachingForm.stage" :placeholder="t('student.positions.k63')">
            <a-select-option value="hirevue">{{ t('student.positions.k24') }}</a-select-option>
            <a-select-option value="screening">Screening Call (Phone Screen / HR Screen / Initial Call / Recruiter Call)</a-select-option>
            <a-select-option value="first">First Round</a-select-option>
            <a-select-option value="second">Second Round</a-select-option>
            <a-select-option value="third">Third Round and Beyond</a-select-option>
            <a-select-option value="case">Case Study Round</a-select-option>
            <a-select-option value="superday">Superday / Assessment Centre / AC</a-select-option>
          </a-select>
        </a-form-item>

        <div v-if="coachingIsHirevue" class="manual-hirevue-card">
          <div class="manual-hirevue-title"><span>{{ t('student.positions.k25') }}</span></div>
          <a-form-item :label="t('student.positions.k64')" required>
            <a-radio-group v-model:value="coachingForm.hirevueType" class="inline-radios">
              <a-radio value="vi">VI (Video Interview)</a-radio>
              <a-radio value="ot">OT (Online Test)</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item v-if="coachingForm.hirevueType === 'vi'" :label="t('student.positions.k65')" required>
            <a-input v-model:value="coachingForm.viLink" :placeholder="t('student.positions.k66')" />
          </a-form-item>
          <template v-if="coachingForm.hirevueType === 'ot'">
            <a-form-item :label="t('student.positions.k67')" required>
              <a-input v-model:value="coachingForm.otLink" :placeholder="t('student.positions.k68')" />
            </a-form-item>
            <div class="manual-section-grid">
              <a-form-item :label="t('student.positions.k69')" required class="manual-field">
                <a-input v-model:value="coachingForm.otAccount" :placeholder="t('student.positions.k70')" />
              </a-form-item>
              <a-form-item :label="t('student.positions.k71')" required class="manual-field">
                <a-input-password v-model:value="coachingForm.otPassword" :placeholder="t('student.positions.k72')" />
              </a-form-item>
            </div>
          </template>
          <a-form-item :label="t('student.positions.k73')" required :extra="t('student.positions.k74')">
            <a-date-picker
              v-model:value="coachingForm.hirevueDeadline"
              show-time
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm"
              style="width:100%"
              :placeholder="t('student.positions.k75')"
            />
          </a-form-item>
          <a-form-item :label="t('student.positions.k76')" required>
            <a-upload
              :action="uploadAction"
              :headers="uploadHeaders"
              name="file"
              accept="image/*"
              :max-count="1"
              :file-list="coachingHirevueFileList"
              :show-upload-list="false"
              class="upload-dropzone upload-dropzone--compact"
              @change="handleCoachingHirevueUpload"
            >
              <CloudUploadOutlined class="upload-dropzone__icon" />
              <span class="upload-dropzone__title">{{ t('student.positions.k26') }}</span>
              <span class="upload-dropzone__helper">{{ t('student.positions.k27') }}</span>
              <span v-if="coachingForm.inviteScreenshotName" class="upload-dropzone__file">{{ coachingForm.inviteScreenshotName }}</span>
            </a-upload>
          </a-form-item>
          <a-form-item :label="t('student.positions.k77')" required>
            <a-radio-group v-model:value="coachingForm.mentorHelp" class="inline-radios">
              <a-radio value="yes">{{ t('student.positions.k28') }}</a-radio>
              <a-radio value="no">{{ t('student.positions.k29') }}</a-radio>
            </a-radio-group>
          </a-form-item>
        </div>

        <template v-if="coachingShowInterview">
          <a-form-item :label="t('student.positions.k78')" required :extra="t('student.positions.k79')">
            <a-date-picker
              v-model:value="coachingForm.interviewTime"
              show-time
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm"
              style="width:100%"
              :placeholder="t('student.positions.k80')"
            />
          </a-form-item>
          <a-form-item :label="t('student.positions.k81')">
            <a-select v-model:value="coachingForm.mentorCount" :placeholder="t('student.positions.k57')" allow-clear>
              <a-select-option value="0">{{ t('student.positions.k33') }}</a-select-option>
              <a-select-option value="1">{{ t('student.positions.k34') }}</a-select-option>
              <a-select-option value="2">{{ t('student.positions.k35') }}</a-select-option>
              <a-select-option value="3">{{ t('student.positions.k36') }}</a-select-option>
            </a-select>
          </a-form-item>
          <div class="manual-section-grid">
            <a-form-item :label="t('student.positions.k82')" class="manual-field">
              <a-input v-model:value="coachingForm.preferMentor" :placeholder="t('student.positions.k83')" />
            </a-form-item>
            <a-form-item :label="t('student.positions.k84')" class="manual-field">
              <a-input v-model:value="coachingForm.excludeMentor" :placeholder="t('student.positions.k85')" />
            </a-form-item>
          </div>
          <a-alert
            type="success"
            show-icon
            :message="t('student.positions.k100')"
            class="coaching-info-alert"
          />
        </template>

        <a-form-item :label="t('student.positions.k86')">
          <a-textarea v-model:value="coachingForm.note" :rows="2" :placeholder="t('student.positions.k87')" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import type { UploadChangeParam } from 'ant-design-vue'
import {
  createStudentManualPosition,
  getStudentPositionMeta,
  listStudentPositions,
  requestStudentPositionCoaching,
  updateStudentPositionApply,
  updateStudentPositionFavorite,
  updateStudentPositionProgress,
  type StudentPositionIntentSummary,
  type StudentPositionMeta,
  type StudentPositionOption,
  type StudentPositionRecord
} from '@osg/shared/api'
import { useIndustryMeta, useDictFacade } from '@osg/shared'
import { getToken } from '@osg/shared/utils'
import {
  AppstoreOutlined,
  CheckCircleFilled,
  CloudUploadOutlined,
  ExportOutlined,
  FileTextOutlined,
  PlusOutlined,
  RightOutlined,
  StarFilled,
  StarOutlined,
  UnorderedListOutlined
} from '@ant-design/icons-vue'

const { t } = useI18n()

type ViewMode = 'drilldown' | 'list'
type TabKey = 'all' | 'favorites'
type IndustryKey = PositionRecord['industry']

interface PositionRecord extends StudentPositionRecord {}

interface CompanyGroup {
  companyKey: string
  companyName: string
  companyCode: string
  careerUrl: string
  positions: PositionRecord[]
}

interface IndustryGroup {
  key: IndustryKey
  label: string
  icon: string
  tone: string
  sort: number
  companies: CompanyGroup[]
  companyCount: number
  positionCount: number
}

const router = useRouter()

const FALLBACK_INDUSTRY_META = {
  tone: 'slate',
  icon: 'mdi-briefcase',
  label: t('student.positions.k101'),
} as const

const { meta: industryMeta, load: loadIndustryMeta } = useIndustryMeta()
const { load: loadCycleDict } = useDictFacade('osg_recruit_cycle')
const { load: loadProjectYearDict } = useDictFacade('osg_project_year')
const { items: regionDict, load: loadRegionDict } = useDictFacade('osg_region')
const { items: cityDict, load: loadCityDict } = useDictFacade('osg_city')
const { items: categoryDict, load: loadCategoryDict } = useDictFacade('osg_job_category')
const { items: companyDict, load: loadCompanyDict } = useDictFacade('osg_company_name')

/** RULE-E: 地区 value → 字典中文 label，避免 'na' / 'asia-pacific' 等英文 raw 露出 */
function regionDisplayLabel(regionLabel?: string, fallbackValue?: string): string {
  if (regionLabel) return regionLabel
  const v = (fallbackValue || '').trim()
  if (!v) return '-'
  const match = regionDict.value.find((item) => item.value === v)
  return match?.label || v
}

function resolveIndustryMeta(industryRaw: string) {
  const trimmed = industryRaw?.trim() || ''
  const match = industryMeta.value.find((m) => m.value === trimmed)
  if (match) {
    return {
      tone: match.tone ?? FALLBACK_INDUSTRY_META.tone,
      icon: match.icon ?? FALLBACK_INDUSTRY_META.icon,
      label: match.label,
    }
  }
  return {
    tone: FALLBACK_INDUSTRY_META.tone,
    icon: FALLBACK_INDUSTRY_META.icon,
    label: trimmed || FALLBACK_INDUSTRY_META.label,
  }
}

const positionsActionTriggers = [
  { actionId: 'manual-add', label: t('student.positions.k46') },
  { actionId: 'drilldown-applied-1', label: t('student.positions.k102') },
  { actionId: 'drilldown-favorite-1', label: t('student.positions.k103') },
  { actionId: 'drilldown-progress-1', label: t('student.positions.k104') },
  { actionId: 'drilldown-applied-2', label: t('student.positions.k105') },
  { actionId: 'drilldown-favorite-2', label: t('student.positions.k106') },
  { actionId: 'drilldown-coaching-2', label: t('student.positions.k107') },
  { actionId: 'drilldown-applied-3', label: t('student.positions.k108') },
  { actionId: 'drilldown-favorite-3', label: t('student.positions.k109') },
  { actionId: 'drilldown-coaching-3', label: t('student.positions.k110') },
  { actionId: 'favorite-unfavorite-1', label: t('student.positions.k111') },
  { actionId: 'favorite-apply-1', label: t('student.positions.k112') },
  { actionId: 'favorite-coaching-1', label: t('student.positions.k113') },
  { actionId: 'favorite-unfavorite-2', label: t('student.positions.k114') },
  { actionId: 'favorite-coaching-2', label: t('student.positions.k115') }
] as const

const viewMode = ref<ViewMode>('list')
const activeTab = ref<TabKey>('all')
const activeCategories = ref<string[]>([])
const expandedCompanies = ref<string[]>([])
const selectedPositionId = ref<number | null>(null)

const manualAddOpen = ref(false)
const progressModalOpen = ref(false)
const appliedModalOpen = ref(false)
const coachingModalOpen = ref(false)

const filters = ref({
  category: undefined as string | undefined,
  industry: undefined as string | undefined,
  company: undefined as string | undefined,
  location: undefined as string | undefined,
  keyword: ''
})

const positions = ref<PositionRecord[]>([])
const intentSummary = ref<StudentPositionIntentSummary>({
  recruitmentCycle: '-',
  targetRegion: '-',
  primaryDirection: '-'
})
const filterOptions = ref<StudentPositionMeta['filterOptions']>({
  categories: [],
  industries: [],
  companies: [],
  locations: [],
  applyMethods: [],
  progressStages: [],
  coachingStages: [],
  mentorCounts: []
})

// 邀请邮件截图通用上传配置（与 admin 端合同附件同款 ruoyi /common/upload 实现）。
// manualForm 与 coachingForm 共用 action/headers，fileList 各自维护避免互相覆盖。
const uploadAction = '/api/common/upload'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${getToken()}`
}))
const manualHirevueFileList = ref<any[]>([])
const coachingHirevueFileList = ref<any[]>([])

const manualForm = ref({
  title: '',
  company: '',
  companyType: '',
  region: undefined as string | undefined,
  city: undefined as string | undefined,
  website: '',
  link: '',
  needCoaching: false,
  coachingStage: undefined as string | undefined,
  hirevueType: undefined as string | undefined,
  viLink: '',
  otLink: '',
  otAccount: '',
  otPassword: '',
  hirevueDeadline: '',
  inviteScreenshotName: '',
  inviteScreenshotUrl: '',
  mentorHelp: undefined as string | undefined,
  interviewTime: '',
  mentorCount: undefined as string | undefined,
  preferMentor: '',
  excludeMentor: '',
  note: ''
})

const progressForm = ref({
  stage: 'first',
  note: ''
})

const appliedForm = ref({
  date: '',
  method: t('student.positions.k116'),
  note: ''
})

const coachingForm = ref({
  stage: undefined as string | undefined,
  hirevueType: undefined as string | undefined,
  viLink: '',
  otLink: '',
  otAccount: '',
  otPassword: '',
  hirevueDeadline: '',
  inviteScreenshotName: '',
  inviteScreenshotUrl: '',
  mentorHelp: undefined as string | undefined,
  interviewTime: '',
  mentorCount: undefined as string | undefined,
  preferMentor: '',
  excludeMentor: '',
  note: ''
})

const coachingIsHirevue = computed(() => coachingForm.value.stage === 'hirevue')
const coachingShowInterview = computed(
  () => !!coachingForm.value.stage && coachingForm.value.stage !== 'hirevue'
)

const positionColumns = [
  { title: t('student.positions.k50'), key: 'title', width: 240 },
  { title: t('student.positions.k117'), key: 'category', width: 110 },
  { title: t('student.positions.k118'), dataIndex: 'department', width: 100 },
  { title: t('student.positions.k119'), dataIndex: 'location', width: 110 },
  { title: t('student.positions.k120'), dataIndex: 'recruitCycle', width: 130 },
  { title: t('student.positions.k121'), dataIndex: 'publishDate', width: 100 },
  { title: t('student.positions.k73'), dataIndex: 'deadline', width: 100 },
  { title: t('student.positions.k122'), key: 'actions', width: 260, fixed: 'right' }
]

const listColumns = [
  { title: t('student.positions.k50'), key: 'title', width: 220, fixed: 'left' },
  { title: t('student.positions.k123'), key: 'companyCell', width: 120 },
  { title: t('student.positions.k124'), key: 'industryCell', width: 100 },
  { title: t('student.positions.k117'), key: 'category', width: 100 },
  { title: t('student.positions.k119'), key: 'regionCell', width: 90 },
  { title: t('student.positions.k120'), key: 'recruitCycleCell', width: 100 },
  { title: t('student.positions.k121'), dataIndex: 'publishDate', width: 100 },
  { title: t('student.positions.k73'), key: 'deadlineCell', width: 100 },
  { title: t('student.positions.k122'), key: 'actions', width: 220 }
]

const favoriteColumns = [
  { title: t('student.positions.k125'), key: 'job' },
  { title: t('student.positions.k118'), dataIndex: 'department', width: 110 },
  { title: t('student.positions.k119'), dataIndex: 'location', width: 100 },
  { title: t('student.positions.k120'), key: 'recruitCycle', width: 110 },
  { title: t('student.positions.k73'), key: 'deadlineCell', width: 100 },
  { title: t('student.positions.k126'), dataIndex: 'favoritedAt', width: 110 },
  { title: t('student.positions.k122'), key: 'actions', width: 160 }
]

const selectedPosition = computed(() =>
  positions.value.find((record) => record.id === selectedPositionId.value) ?? null
)

/* industryIconComponents 已删除 — icon 统一由 resolveIndustryMeta() 从字典取 MDI class */

// 城市字典按 parentValue 过滤（admin osg_city.remark = {"parentValue":"<region.value>"}）
const manualCityOptions = computed(() => {
  const region = manualForm.value.region
  if (!region) return [] as { value: string; label: string }[]
  return cityDict.value.filter((c) => c.parentValue === region)
})

const manualCoachingIsHirevue = computed(() => manualForm.value.coachingStage === 'hirevue')
const manualCoachingShowInterview = computed(() =>
  !!manualForm.value.coachingStage && manualForm.value.coachingStage !== 'hirevue'
)

function onManualRegionChange() {
  manualForm.value.city = undefined
}

function handleManualHirevueUpload(info: UploadChangeParam) {
  manualHirevueFileList.value = info.fileList.slice(-1)
  if (info.file.status === 'done') {
    const url = info.file.response?.url || info.file.response?.fileName
    if (url) {
      manualForm.value.inviteScreenshotName = info.file.name ?? ''
      manualForm.value.inviteScreenshotUrl = url
      message.success(t('student.positions.k127'))
    } else {
      message.error(t('student.positions.k128'))
    }
  } else if (info.file.status === 'error') {
    message.error(t('student.positions.k129'))
  }
}

function handleCoachingHirevueUpload(info: UploadChangeParam) {
  coachingHirevueFileList.value = info.fileList.slice(-1)
  if (info.file.status === 'done') {
    const url = info.file.response?.url || info.file.response?.fileName
    if (url) {
      coachingForm.value.inviteScreenshotName = info.file.name ?? ''
      coachingForm.value.inviteScreenshotUrl = url
      message.success(t('student.positions.k127'))
    } else {
      message.error(t('student.positions.k128'))
    }
  } else if (info.file.status === 'error') {
    message.error(t('student.positions.k129'))
  }
}

const categoryOptionsByValue = computed(() => optionMap(filterOptions.value.categories))
const industryOptionsByValue = computed(() => optionMap(filterOptions.value.industries))
const companyOptionsByValue = computed(() => optionMap(filterOptions.value.companies))

const isProfileIncomplete = computed(() => {
  const blank = (v?: string) => !v || v === '-' || v.trim() === ''
  return blank(intentSummary.value.recruitmentCycle)
    || blank(intentSummary.value.targetRegion)
    || blank(intentSummary.value.primaryDirection)
})

const filteredPositions = computed(() =>
  positions.value.filter((record) => {
    const keyword = filters.value.keyword.trim().toLowerCase()

    if (filters.value.category && record.category !== filters.value.category) {
      return false
    }

    if (filters.value.industry && record.industry !== filters.value.industry) {
      return false
    }

    if (filters.value.company && record.companyKey !== filters.value.company) {
      return false
    }

    if (filters.value.location && record.location !== filters.value.location) {
      return false
    }

    if (!keyword) {
      return true
    }

    return [record.title, record.company, record.location, record.department]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  })
)

const favoritePositions = computed(() => filteredPositions.value.filter((record) => record.favorited))
const openPositionsCount = computed(() =>
  filteredPositions.value.filter((record) => !isDeadlineClosed(record.deadline)).length
)
const closedPositionsCount = computed(() => filteredPositions.value.length - openPositionsCount.value)

const groupedIndustries = computed<IndustryGroup[]>(() => {
  const groups = new Map<IndustryKey, {
    key: IndustryKey
    label: string
    icon: string
    tone: string
    sort: number
    companies: Map<string, CompanyGroup>
  }>()

  for (const record of filteredPositions.value) {
    const optionMeta = industryOptionsByValue.value.get(record.industry)
    const resolved = resolveIndustryMeta(record.industry)
    const industryGroup = groups.get(record.industry) ?? {
      key: record.industry,
      label: optionMeta?.label ?? record.industryLabel ?? resolved.label,
      icon: resolved.icon,
      tone: resolved.tone,
      sort: Number(optionMeta?.sort ?? 999),
      companies: new Map<string, CompanyGroup>()
    }

    const currentCompany = industryGroup.companies.get(record.companyKey)
    if (currentCompany) {
      currentCompany.positions.push(record)
    } else {
      industryGroup.companies.set(record.companyKey, {
        companyKey: record.companyKey,
        companyName: record.company,
        companyCode: record.companyCode,
        careerUrl: record.careerUrl,
        positions: [record]
      })
    }

    groups.set(record.industry, industryGroup)
  }

  return Array.from(groups.values())
    .sort((left, right) => left.sort - right.sort)
    .map((group) => {
      const companies = Array.from(group.companies.values())
      return {
        key: group.key,
        label: group.label,
        icon: group.icon,
        tone: group.tone,
        sort: group.sort,
        companies,
        companyCount: companies.length,
        positionCount: companies.reduce((count, company) => count + company.positions.length, 0)
      }
    })
})

function optionMap(options: StudentPositionOption[]) {
  return new Map(options.map((option) => [option.value, option]))
}

function getCategoryColor(category: PositionRecord['category']) {
  return categoryOptionsByValue.value.get(category)?.color ?? 'blue'
}

const COMPANY_LOGO_FALLBACKS = [
  '#4F46E5', '#0369A1', '#7C3AED', '#EA4335',
  '#1E40AF', '#0F766E', '#B45309', '#DB2777',
]

function getCompanyBrandColor(companyKey: string) {
  const meta = companyOptionsByValue.value.get(companyKey)
  if (meta?.brandColor) return meta.brandColor
  const key = companyKey ?? ''
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return COMPANY_LOGO_FALLBACKS[Math.abs(hash) % COMPANY_LOGO_FALLBACKS.length]
}

function deadlineToneClass(deadline: string | undefined | null) {
  const v = (deadline ?? '').trim()
  if (!v || v === '--' || v === '-') return 'deadline-muted'
  if (isDeadlineClosed(v)) return 'deadline-closed'
  if (isDeadlineUrgent(v)) return 'deadline-urgent'
  return 'deadline-default'
}

function isDeadlineClosed(deadline: string) {
  const target = parseDeadline(deadline)
  if (target === null) return false
  return target < Date.now()
}

function isDeadlineUrgent(deadline: string) {
  const target = parseDeadline(deadline)
  if (target === null) return false
  const now = Date.now()
  const diff = target - now
  return diff > 0 && diff <= 7 * 24 * 3600 * 1000
}

function parseDeadline(deadline: string): number | null {
  if (!/^\d{2}-\d{2}$/.test(deadline)) {
    return null
  }
  const [monthText, dayText] = deadline.split('-')
  const month = Number(monthText)
  const day = Number(dayText)
  if (!Number.isInteger(month) || !Number.isInteger(day)) {
    return null
  }
  const now = new Date()
  return new Date(now.getFullYear(), month - 1, day, 23, 59, 59, 999).getTime()
}

function toggleCompany(companyKey: string) {
  const index = expandedCompanies.value.indexOf(companyKey)

  if (index >= 0) {
    expandedCompanies.value.splice(index, 1)
    return
  }

  expandedCompanies.value.push(companyKey)
}

function toggleIndustry(industryKey: string) {
  const index = activeCategories.value.indexOf(industryKey)

  if (index >= 0) {
    activeCategories.value.splice(index, 1)
    return
  }

  activeCategories.value.push(industryKey)
}

function openManualAddModal() {
  manualForm.value = {
    title: '',
    company: '',
    companyType: '',
    region: undefined,
    city: undefined,
    website: '',
    link: '',
    needCoaching: false,
    coachingStage: undefined,
    hirevueType: undefined,
    viLink: '',
    otLink: '',
    otAccount: '',
    otPassword: '',
    hirevueDeadline: '',
    inviteScreenshotName: '',
    inviteScreenshotUrl: '',
    mentorHelp: undefined,
    interviewTime: '',
    mentorCount: undefined,
    preferMentor: '',
    excludeMentor: '',
    note: ''
  }
  manualHirevueFileList.value = []
  manualAddOpen.value = true
}

async function loadPositions() {
  const records = await listStudentPositions()
  positions.value = records.map((record: StudentPositionRecord) => ({
    ...record,
    favorited: Boolean(record.favorited),
    applied: Boolean(record.applied),
    progressNote: record.progressNote || ''
  }))
}

async function loadPositionMeta() {
  const payload = await getStudentPositionMeta()
  intentSummary.value = payload.intentSummary
  filterOptions.value = payload.filterOptions

  // 字典统一：能用 admin 的全部走 admin 字典
  // record 的 category/company/location 字段值是 label（如 "Summer Analyst" / "SIG" / "New York"），
  // 因此 select option 的 value 也用 dict.label 对齐，保证筛选比对工作。
  if (categoryDict.value.length) {
    filterOptions.value.categories = categoryDict.value.map((d) => ({ value: d.label, label: d.label }))
  }
  if (companyDict.value.length) {
    filterOptions.value.companies = companyDict.value.map((d) => ({ value: d.label, label: d.label }))
  }
  if (cityDict.value.length) {
    filterOptions.value.locations = cityDict.value.map((d) => ({ value: d.label, label: d.label }))
  }

  const methodMap: Record<string, string> = {
    '官网投递': 'official', // i18n-skip-line: backend enum value
    '内推': 'referral', // i18n-skip-line: backend enum value
    '邮件投递': 'campus', // i18n-skip-line: backend enum value
  }
  filterOptions.value.applyMethods = filterOptions.value.applyMethods.map((m) => ({
    label: m.label,
    value: methodMap[m.value] ?? m.value
  }))
}

function setSelectedPosition(record: PositionRecord) {
  selectedPositionId.value = record.id
}

function openAppliedModal(record: PositionRecord) {
  setSelectedPosition(record)
  appliedForm.value = {
    date: appliedForm.value.date || '',
    method: t('student.positions.k116'),
    note: ''
  }
  appliedModalOpen.value = true
}

async function toggleFavorite(record: PositionRecord) {
  const nextFavorited = !record.favorited
  await updateStudentPositionFavorite({
    positionId: record.id,
    favorited: nextFavorited
  })
  const target = positions.value.find((p) => p.id === record.id)
  if (target) {
    target.favorited = nextFavorited
    target.favoritedAt = nextFavorited ? formatToday() : '--'
  }
  message.success(nextFavorited ? t('student.positions.k153') : t('student.positions.k130'))
}

function formatToday() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function submitManualPosition() {
  const f = manualForm.value
  if (!f.title || !f.title.trim()) {
    message.error(t('student.positions.k131'))
    return
  }
  if (!f.link) {
    message.error(t('student.positions.k132'))
    return
  }

  if (f.needCoaching) {
    if (!f.coachingStage) {
      message.error(t('student.positions.k133'))
      return
    }
    if (f.coachingStage === 'hirevue') {
      if (!f.hirevueType) {
        message.error(t('student.positions.k134'))
        return
      }
      if (f.hirevueType === 'vi' && !f.viLink) {
        message.error(t('student.positions.k135'))
        return
      }
      if (f.hirevueType === 'ot' && (!f.otLink || !f.otAccount || !f.otPassword)) {
        message.error(t('student.positions.k136'))
        return
      }
      if (!f.hirevueDeadline) {
        message.error(t('student.positions.k137'))
        return
      }
    } else {
      if (!f.interviewTime) {
        message.error(t('student.positions.k138'))
        return
      }
    }
  }

  await createStudentManualPosition({
    category: '',
    title: f.title.trim(),
    company: f.company,
    location: f.city ?? f.region ?? '',
    companyType: f.companyType || undefined,
    region: f.region,
    city: f.city,
    website: f.website || undefined,
    link: f.link,
    needCoaching: f.needCoaching,
    coachingStage: f.needCoaching ? f.coachingStage : undefined,
    mentorCount: f.needCoaching && f.coachingStage !== 'hirevue' ? (f.mentorCount || '0') : undefined,
    hirevueType: f.needCoaching && f.coachingStage === 'hirevue' ? f.hirevueType : undefined,
    viLink: f.needCoaching && f.hirevueType === 'vi' ? f.viLink : undefined,
    otLink: f.needCoaching && f.hirevueType === 'ot' ? f.otLink : undefined,
    otAccount: f.needCoaching && f.hirevueType === 'ot' ? f.otAccount : undefined,
    otPassword: f.needCoaching && f.hirevueType === 'ot' ? f.otPassword : undefined,
    hirevueDeadline: f.needCoaching && f.coachingStage === 'hirevue' ? f.hirevueDeadline : undefined,
    inviteScreenshotName: f.inviteScreenshotName || undefined,
    inviteScreenshotUrl: f.inviteScreenshotUrl || undefined,
    mentorHelp: f.needCoaching && f.coachingStage === 'hirevue' ? f.mentorHelp : undefined,
    interviewTime: f.needCoaching && f.coachingStage !== 'hirevue' ? f.interviewTime : undefined,
    preferMentor: f.needCoaching ? f.preferMentor || undefined : undefined,
    excludeMentor: f.needCoaching ? f.excludeMentor || undefined : undefined,
    note: f.note || undefined
  })
  await Promise.all([loadPositions(), loadPositionMeta()])
  manualAddOpen.value = false
  message.success(t('student.positions.k139'))
}

async function submitProgressUpdate() {
  if (!selectedPosition.value) {
    return
  }

  await updateStudentPositionProgress({
    positionId: selectedPosition.value.id,
    stage: progressForm.value.stage,
    notes: progressForm.value.note
  })
  await loadPositions()
  progressModalOpen.value = false
  message.success(t('student.positions.k140'))
}

async function handleActionStageChange(record: PositionRecord, nextStage: string) {
  if (!nextStage) return

  // 取消投递：投了又撤，清 applied，投递数 -1，从「我的求职」隐藏
  if (nextStage === 'cancelled') {
    if (!record.applied) {
      message.info(t('student.positions.k141'))
      return
    }
    try {
      await updateStudentPositionApply({
        positionId: record.id,
        applied: false
      })
      await loadPositions()
      message.success(t('student.positions.k154', { company: record.company, title: record.title }))
    } catch {
      // error handled by http layer
    }
    return
  }

  // 主动放弃：保持已投递，仅更新 progressStage='withdraw'，投递数不减
  // 已投递：直接 inline 更新求职状态
  if (record.applied) {
    if (nextStage === record.progressStage) return
    await updateProgressInline(record, nextStage)
    return
  }

  // 未投递岗位不可标记主动放弃 / 面试中 / offer / 被拒绝
  if (nextStage !== 'applied') {
    message.info(t('student.positions.k142'))
    return
  }

  // 未投递且选「已投递」：打开投递信息弹窗
  openAppliedModal(record)
}

async function updateProgressInline(record: PositionRecord, stage: string) {
  if (!stage || stage === record.progressStage) return
  try {
    await updateStudentPositionProgress({
      positionId: record.id,
      stage,
      notes: record.progressNote || ''
    })
    // 原地更新，避免重拉整个列表造成闪烁
    const target = positions.value.find((p) => p.id === record.id)
    if (target) target.progressStage = stage
    const stageLabel = filterOptions.value.progressStages.find((o) => o.value === stage)?.label || stage
    message.success(t('student.positions.k155', { label: stageLabel }))
  } catch (err) {
    // 失败时重拉恢复反馈
    await loadPositions()
  }
}

async function submitAppliedMark() {
  if (!selectedPosition.value) {
    return
  }

  if (!appliedForm.value.date) {
    message.error(t('student.positions.k143'))
    return
  }

  await updateStudentPositionApply({
    positionId: selectedPosition.value.id,
    applied: true,
    date: appliedForm.value.date,
    method: appliedForm.value.method,
    note: appliedForm.value.note
  })
  await loadPositions()
  appliedModalOpen.value = false
  message.success(t('student.positions.k144'))
}

async function submitCoachingApplication() {
  if (!selectedPosition.value) {
    return
  }

  const f = coachingForm.value

  if (!f.stage) {
    message.error(t('student.positions.k133'))
    return
  }

  if (f.stage === 'hirevue') {
    if (!f.hirevueType) {
      message.error(t('student.positions.k134'))
      return
    }
    if (f.hirevueType === 'vi' && !f.viLink) {
      message.error(t('student.positions.k135'))
      return
    }
    if (f.hirevueType === 'ot' && (!f.otLink || !f.otAccount || !f.otPassword)) {
      message.error(t('student.positions.k136'))
      return
    }
    if (!f.hirevueDeadline) {
      message.error(t('student.positions.k137'))
      return
    }
    if (!f.inviteScreenshotUrl) {
      message.error(t('student.positions.k145'))
      return
    }
    if (!f.mentorHelp) {
      message.error(t('student.positions.k146'))
      return
    }
  } else {
    if (!f.interviewTime) {
      message.error(t('student.positions.k147'))
      return
    }
  }

  await requestStudentPositionCoaching({
    positionId: selectedPosition.value.id,
    stage: f.stage,
    mentorCount: f.stage !== 'hirevue' ? (f.mentorCount || '0') : undefined,
    note: f.note || undefined,
    hirevueType: f.stage === 'hirevue' ? f.hirevueType : undefined,
    viLink: f.hirevueType === 'vi' ? f.viLink : undefined,
    otLink: f.hirevueType === 'ot' ? f.otLink : undefined,
    otAccount: f.hirevueType === 'ot' ? f.otAccount : undefined,
    otPassword: f.hirevueType === 'ot' ? f.otPassword : undefined,
    hirevueDeadline: f.stage === 'hirevue' ? f.hirevueDeadline : undefined,
    inviteScreenshotName: f.stage === 'hirevue' ? f.inviteScreenshotName || undefined : undefined,
    inviteScreenshotUrl: f.stage === 'hirevue' ? f.inviteScreenshotUrl || undefined : undefined,
    mentorHelp: f.stage === 'hirevue' ? f.mentorHelp : undefined,
    interviewTime: f.stage !== 'hirevue' ? f.interviewTime : undefined,
    preferMentor: f.preferMentor || undefined,
    excludeMentor: f.excludeMentor || undefined
  })
  await loadPositions()
  coachingModalOpen.value = false
  message.success(t('student.positions.k148'))
}

onMounted(async () => {
  // 先加载所有 admin 共享字典；loadPositionMeta 依赖 categoryDict/companyDict/cityDict 已就绪
  await Promise.all([
    loadIndustryMeta(),
    loadCycleDict(),
    loadProjectYearDict(),
    loadRegionDict(),
    loadCityDict(),
    loadCategoryDict(),
    loadCompanyDict()
  ])
  await Promise.all([loadPositions(), loadPositionMeta()])
})

watch(
  groupedIndustries,
  (industries) => {
    const industryKeys = industries.map((industry) => industry.key)
    activeCategories.value = activeCategories.value.filter((key) => industryKeys.includes(key))
    if (!activeCategories.value.length && industryKeys.length) {
      activeCategories.value = [industryKeys[0]]
    }

    const companyKeys = new Set(industries.flatMap((industry) => industry.companies.map((company) => company.companyKey)))
    expandedCompanies.value = expandedCompanies.value.filter((key) => companyKeys.has(key))
  },
  { immediate: true }
)
</script>

<style lang="scss">
.manual-add-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: 12px;
  color: #1e40af;
}

.manual-section {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 14px;
  background: #f8fafc;
}

.manual-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
  margin-bottom: 14px;
}

.manual-section-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.manual-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--span2 {
    grid-column: span 2;
  }

  &--full {
    width: 100%;
    margin-bottom: 12px;
  }
}

.manual-label {
  font-size: 12px;
  font-weight: 500;
  color: #374151;

  .req {
    color: #ef4444;
    margin-left: 2px;
  }

  .optional {
    color: #9ca3af;
    font-weight: 400;
    font-size: 11px;
  }
}

.cycle-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  min-height: 44px;
}

.cycle-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;

  input {
    width: 14px;
    height: 14px;
  }
}

.manual-coaching-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.coaching-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;

  input {
    width: 16px;
    height: 16px;
  }

  &--selected {
    border-color: #2563eb;
    background: #eff6ff;
  }
}

.manual-coaching-fields {
  border-top: 1px solid #e2e8f0;
  padding-top: 14px;
}

.manual-hirevue-card {
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
}

.manual-hirevue-title {
  font-size: 13px;
  font-weight: 600;
  color: #7c3aed;
  margin-bottom: 12px;
}

.inline-radios {
  display: flex;
  gap: 20px;

  label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    cursor: pointer;
  }

  input {
    width: 16px;
    height: 16px;
  }
}

.field-helper {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: center;

  &--compact {
    padding: 14px;
  }

  &__icon {
    font-size: 24px;
    color: #2563eb;
    margin-bottom: 6px;
  }

  &__title {
    font-size: 12px;
    color: #2563eb;
  }

  &__helper {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
  }

  &__file {
    font-size: 11px;
    color: #059669;
    margin-top: 4px;
  }
}
</style>

<style scoped lang="scss">
.positions-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
  }

  .page-title {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }

  .page-title-en {
    margin-left: 4px;
    color: #94a3b8;
    font-size: 14px;
    font-weight: 400;
  }

  .page-sub {
    margin: 4px 0 0;
    color: #64748b;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .view-toggle {
    :deep(.ant-radio-group) {
      display: inline-flex;
      gap: 4px;
      padding: 3px;
      border-radius: 6px;
      background: #f1f5f9;
    }

    :deep(.ant-radio-button-wrapper) {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 30px;
      padding: 0 12px;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: #334155;
      box-shadow: none;
      font-size: 12px;
      font-weight: 600;
    }

    :deep(.ant-radio-button-wrapper:not(:first-child)::before) {
      display: none;
    }

    :deep(.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)) {
      background: #2563eb;
      color: #fff;
    }
  }

  .permission-notice {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 12px 16px;
    background: #eff6ff;
    color: #1e40af;
    font-size: 13px;
  }

  .modify-intent {
    margin-left: auto;
  }

  .filter-card,
  .favorites-card {
    margin-bottom: 16px;
  }

  .filter-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .filter-select {
    width: 100px;
  }

  .filter-select-company {
    width: 110px;
  }

  .filter-search {
    width: 160px;
    margin-left: auto;
  }

  .filter-card {
    :deep(.ant-card-body) {
      padding: 12px 16px;
    }

    :deep(.ant-select-selector),
    :deep(.ant-input-affix-wrapper),
    :deep(.ant-input-group-addon .ant-btn) {
      height: 32px;
      border-radius: 6px;
      font-size: 11px;
    }

    :deep(.ant-select-selector) {
      padding-inline: 8px;
    }

    :deep(.ant-input-affix-wrapper) {
      padding-inline: 8px;
    }

    :deep(.ant-input-search-button) {
      width: 32px;
      padding-inline: 0;
      border-radius: 0 6px 6px 0;
    }
  }

  .content-tab-strip {
    display: inline-flex;
    gap: 4px;
    background: #f3f4f6;
    padding: 3px;
    border-radius: 6px;
    width: fit-content;
    margin-bottom: 16px;
  }

  .content-tab-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text, #1f2937);
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    line-height: 1.4;
    transition: background 0.15s ease, color 0.15s ease;

    .mdi {
      font-size: 14px;
      line-height: 1;
    }

    &:hover {
      background: rgba(15, 23, 42, 0.06);
    }
  }

  .content-tab-pill--active {
    background: var(--primary, #7399c6);
    color: #fff;

    &:hover {
      background: var(--primary-dark, #5a7ba3);
    }
  }

  .content-tab-pill-star {
    color: #f59e0b;
  }

  .content-tab-badge {
    display: inline-flex;
    align-items: center;
    background: #f59e0b;
    color: #fff;
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
    margin-left: 4px;
    line-height: 1.4;
  }

  // ----- 列表视图色调（与原型对齐） -----
  .company-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .company-logo-mini {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 10px;
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
  }

  .company-name-text {
    font-weight: 500;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
  }

  .industry-tag {
    font-size: 11px;
    font-weight: 600;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cell-tag {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
  }

  .industry-pill {
    display: inline-block;
    max-width: 100%;
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
    background: #f1f5f9;
    color: #475569;
  }

  .industry-pill--gold   { background: #fef3c7; color: #92400e; }
  .industry-pill--violet { background: #ede9fe; color: #6d28d9; }
  .industry-pill--blue   { background: #dbeafe; color: #1d4ed8; }
  .industry-pill--amber  { background: #fef3c7; color: #b45309; }
  .industry-pill--teal   { background: #ccfbf1; color: #0f766e; }
  .industry-pill--indigo { background: #e0e7ff; color: #4338ca; }
  .industry-pill--slate  { background: #f1f5f9; color: #475569; }

  .deadline-default {
    color: var(--text);
    font-weight: 500;
  }

  .deadline-muted {
    color: var(--muted);
  }

  .deadline-closed {
    color: var(--muted);
    text-decoration: line-through;
  }

  .deadline-urgent {
    color: #dc2626;
    font-weight: 600;
  }

  .favorites-card {
    :deep(.ant-card-head) {
      background: #fef3c7;
      border-bottom: 1px solid #fde68a;
      min-height: 40px;
      padding-inline: 16px;
    }

    :deep(.ant-card-head-title) {
      padding-block: 8px;
    }
  }

  .favorites-card-title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #92400e;
    font-weight: 600;
    font-size: 14px;

    .mdi {
      color: #f59e0b;
      font-size: 16px;
      line-height: 1;
    }
  }

  .favorites-table :deep(.ant-table-cell) {
    font-size: 13px;
  }

  .fav-action-cell {
    display: inline-flex;
    align-items: center;
  }

  .fav-icon-btn {
    padding: 0 4px;
    height: 24px;
    line-height: 1;
    vertical-align: middle;

    .mdi {
      font-size: 18px;
      line-height: 1;
    }
  }

  .fav-icon-btn--star {
    color: #f59e0b;

    &:hover,
    &:focus {
      color: #d97706;
      background: transparent;
    }
  }

  .fav-icon-btn--apply {
    color: var(--muted, #6b7280);

    &:hover,
    &:focus {
      color: #16a34a;
      background: transparent;
    }
  }

  .fav-icon-btn--applied {
    color: #16a34a;

    &:hover,
    &:focus {
      color: #15803d;
      background: transparent;
    }
  }

  .fav-coaching-btn {
    padding-inline: 10px;
    font-size: 12px;
  }

  .applied-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .applied-btn--on {
    background: #22c55e !important;
    border-color: #22c55e !important;
    color: #fff !important;

    &:hover,
    &:focus {
      background: #16a34a !important;
      border-color: #16a34a !important;
      color: #fff !important;
    }
  }

  .applied-btn--off {
    background: #fff;
    border-color: #d1d5db;
    color: #6b7280;

    &:hover,
    &:focus {
      border-color: #22c55e;
      color: #22c55e;
    }
  }

  .fav-btn--on {
    background: #f59e0b !important;
    border-color: #f59e0b !important;
    color: #fff !important;

    &:hover,
    &:focus {
      background: #d97706 !important;
      border-color: #d97706 !important;
      color: #fff !important;
    }
  }

  .fav-btn--off {
    background: #fff !important;
    border-color: #f59e0b !important;
    color: #f59e0b !important;

    &:hover,
    &:focus {
      background: #fff7ed !important;
      border-color: #d97706 !important;
      color: #d97706 !important;
    }
  }

  .coaching-btn {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important;
    border-color: #7c3aed !important;
    color: #fff !important;

    &:hover,
    &:focus {
      background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
      border-color: #6d28d9 !important;
      color: #fff !important;
    }

    .mdi {
      color: #fff;
    }
  }

  .positions-table {
    :deep(.ant-table-cell-fix-right-first::after) {
      box-shadow: inset 10px 0 8px -8px rgba(0, 0, 0, 0.08);
    }
  }

  .action-cell {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .action-text-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.18s ease;
    white-space: nowrap;

    &:hover {
      transform: translateY(-1px);
    }

    &--default {
      background: #ffffff;
      border-color: #d1d5db;
      color: #6b7280;

      &:hover {
        border-color: #22c55e;
        color: #22c55e;
        box-shadow: 0 2px 6px rgba(34, 197, 94, 0.15);
      }
    }

    &--applied {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      border-color: #16a34a;
      color: #ffffff;

      &:hover {
        background: linear-gradient(135deg, #16a34a, #15803d);
        box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
      }
    }
  }

  .action-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    padding: 0;
    font-size: 14px;
    transition: all 0.18s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    &--star-off {
      background: #ffffff;
      border-color: #f59e0b;
      color: #f59e0b;

      &:hover {
        background: #fef3c7;
      }
    }

    &--star {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      border-color: #d97706;
      color: #ffffff;
    }
  }

  .action-coaching-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s ease;
    white-space: nowrap;

    &:hover {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.25);
    }

    .mdi {
      font-size: 14px;
    }
  }

  .progress-stage-select {
    min-width: 132px;

    :deep(.ant-select-selector) {
      background: #fef3c7 !important;
      border: 1px solid #f59e0b !important;
      color: #92400e !important;
      font-weight: 600;
      font-size: 12px;
      border-radius: 6px !important;
      padding: 0 28px 0 12px !important;
      height: 28px !important;
      line-height: 26px !important;
      display: flex;
      align-items: center;
      box-shadow: 0 1px 2px rgba(245, 158, 11, 0.15);
    }

    :deep(.ant-select-arrow) {
      color: #92400e;
      right: 10px;
    }

    :deep(.ant-select-selection-item) {
      color: #92400e !important;
      line-height: 26px !important;
    }

    &:hover :deep(.ant-select-selector) {
      border-color: #d97706 !important;
      background: #fde68a !important;
    }
  }

  .industry-section {
    margin-bottom: 12px;
    background: #ffffff;
    border-radius: 8px;
    overflow: hidden;
  }

  .industry-header {
    width: 100%;
    border: 0;
    padding: 12px 16px;
    text-align: left;
    cursor: pointer;
  }

  .industry-gold .industry-header,
  .industry-violet .industry-header,
  .industry-blue .industry-header,
  .industry-amber .industry-header,
  .industry-teal .industry-header,
  .industry-indigo .industry-header,
  .industry-slate .industry-header {
    background: #f3f4f6;
    color: #4b5563;
  }

  .industry-info {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
  }

  .industry-icon {
    font-size: 15px;
  }

  .industry-name {
    font-size: 15px;
  }

  .industry-content {
    margin-top: 8px;
    padding-left: 20px;
  }

  .company-section {
    margin-bottom: 8px;
  }

  .company-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #dbe4f0;
    border-radius: 8px;
    padding: 10px 14px;
    background: #fff;
    cursor: pointer;
  }

  .company-info,
  .company-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .rotate-icon {
    transform: rotate(90deg);
    transition: transform 0.2s ease;
  }

  .company-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
  }

  .company-name {
    font-size: 14px;
    font-weight: 600;
  }

  .company-count {
    font-size: 12px;
  }

  .company-count strong {
    color: #4f46e5;
  }

  .company-career-link {
    height: 24px;
    padding: 0 8px;
    border-radius: 4px;
    border-color: #dbe4f0;
    background: #fff;
    color: #64748b;
    font-size: 10px;
    box-shadow: none;
  }

  .company-career-link:hover,
  .company-career-link:focus {
    border-color: #bfdbfe;
    color: #4f46e5;
  }

  .company-content {
    margin-top: 6px;
    margin-left: 42px;
  }

  .positions-summary {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 16px;
    color: #6b7280;
    font-size: 13px;
    font-weight: 500;
  }

  .summary-open {
    color: #22c55e;
  }

  .summary-closed {
    color: #94a3b8;
  }

  .summary-total strong {
    color: #111827;
  }

  .summary-open,
  .summary-closed {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .job-link {
    color: #4f46e5;
    font-weight: 500;
  }

  .job-requirements {
    margin-top: 2px;
    color: #f59e0b;
    font-size: 10px;
  }

  .favorite-job-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .favorite-company {
    font-weight: 600;
  }

  .favorite-position {
    color: #64748b;
    font-size: 12px;
  }

  .modal-intro,
  .modal-job-card {
    margin-bottom: 16px;
    border-radius: 10px;
    padding: 14px 16px;
  }

  .modal-intro {
    background: #eff6ff;
    color: #1d4ed8;
  }

  .modal-job-title {
    font-size: 15px;
    font-weight: 600;
  }

  .modal-job-sub {
    margin-top: 4px;
    color: #475569;
    font-size: 13px;
  }

  .progress-card {
    background: #f8fafc;
  }

  .applied-card {
    background: #f0fdf4;
  }

  .coaching-card {
    background: #f5f3ff;
  }
}

@media (max-width: 900px) {
  .positions-page {
    .page-header {
      flex-direction: column;
      align-items: stretch;
    }

    .header-actions {
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .permission-notice {
      flex-wrap: wrap;
    }

    .modify-intent {
      margin-left: 0;
    }

    .company-content {
      margin-left: 0;
    }
  }
}
</style>
