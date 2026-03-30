<template>
  <div id="page-positions" class="positions-page" :data-action-trigger-count="positionsActionTriggers.length">
    <div class="page-header">
      <div>
        <h1 class="page-title">岗位信息 <span class="page-title-en">Job Tracker</span></h1>
        <p class="page-sub">追踪各大公司招聘岗位信息，记录您的申请进度</p>
      </div>
      <div class="header-actions">
        <a-radio-group v-model:value="viewMode" button-style="solid" size="small" class="view-toggle">
          <a-radio-button value="drilldown">
            <template #icon><AppstoreOutlined /></template>
            下钻视图
          </a-radio-button>
          <a-radio-button value="list">
            <template #icon><UnorderedListOutlined /></template>
            列表视图
          </a-radio-button>
        </a-radio-group>
        <a-button type="primary" @click="openManualAddModal">
          <template #icon><PlusOutlined /></template>
          手动添加
        </a-button>
      </div>
    </div>

    <div class="permission-notice">
      <InfoCircleOutlined />
      <span>
        根据您的求职意向，当前展示 <strong>{{ intentSummary.recruitmentCycle }}</strong> 招聘周期、
        <strong>{{ intentSummary.targetRegion }}</strong> 地区、
        <strong>{{ intentSummary.primaryDirection }}</strong> 主攻方向的岗位信息
      </span>
      <a class="modify-intent" @click="router.push('/profile')">
        修改求职意向 <RightOutlined />
      </a>
    </div>

    <a-card :bordered="false" class="filter-card">
      <div class="filter-controls">
        <a-select v-model:value="filters.category" placeholder="全部分类" class="filter-select filter-select-category" allow-clear>
          <a-select-option v-for="option in filterOptions.categories" :key="option.value" :value="option.value">
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-select v-model:value="filters.industry" placeholder="全部行业" class="filter-select filter-select-industry" allow-clear>
          <a-select-option v-for="option in filterOptions.industries" :key="option.value" :value="option.value">
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-select v-model:value="filters.company" placeholder="全部公司" class="filter-select filter-select-company" allow-clear>
          <a-select-option v-for="option in filterOptions.companies" :key="option.value" :value="option.value">
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-select v-model:value="filters.location" placeholder="全部地区" class="filter-select filter-select-location" allow-clear>
          <a-select-option v-for="option in filterOptions.locations" :key="option.value" :value="option.value">
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-input-search
          v-model:value="filters.keyword"
          placeholder="搜索岗位名称..."
          class="filter-search"
          search-button
        />
      </div>
    </a-card>

    <div class="content-tab-strip" role="tablist" aria-label="岗位内容切换">
      <button
        id="positions-tab-all"
        type="button"
        role="tab"
        class="content-tab-trigger"
        :class="{ 'content-tab-trigger--active': activeTab === 'all' }"
        :aria-selected="activeTab === 'all'"
        @click="activeTab = 'all'"
      >
        <BankOutlined />
        <span>全部岗位</span>
      </button>
      <button
        id="positions-tab-favorites"
        type="button"
        role="tab"
        class="content-tab-trigger"
        :class="{ 'content-tab-trigger--active': activeTab === 'favorites' }"
        :aria-selected="activeTab === 'favorites'"
        @click="activeTab = 'favorites'"
      >
        <StarOutlined />
        <span>我的收藏</span>
        <span class="content-tab-badge">{{ favoritePositions.length }}</span>
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
            :class="`industry-${industry.key}`"
          >
            <button class="industry-header" type="button" @click="toggleIndustry(industry.key)">
              <div class="industry-info">
                <RightOutlined :class="['industry-chevron', { 'rotate-icon': activeCategories.includes(industry.key) }]" />
                <component :is="industry.icon" class="industry-icon" />
                <span class="industry-name">{{ industry.label }}</span>
                <a-tag color="blue">{{ industry.companyCount }} 家公司</a-tag>
                <a-tag color="green">{{ industry.positionCount }} 个岗位</a-tag>
              </div>
            </button>

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
                    <span class="company-count"><strong>{{ company.positions.length }}</strong> 个岗位</span>
                    <a-button
                      size="small"
                      class="company-career-link"
                      :href="company.careerUrl"
                      target="_blank"
                      @click.stop
                    >
                      <template #icon><ExportOutlined /></template>
                      官网
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
                        <a :href="record.url" target="_blank" class="job-link">
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
                        <a-space :size="6" wrap>
                          <a-button
                            size="small"
                            :type="record.applied ? 'primary' : 'default'"
                            @click="handleAppliedButton(record)"
                          >
                            <template #icon>
                              <CheckCircleFilled v-if="record.applied" />
                              <CheckOutlined v-else />
                            </template>
                            {{ record.applied ? '已投递' : '未投递' }}
                          </a-button>
                          <a-button size="small" :type="record.favorited ? 'primary' : 'default'" @click="toggleFavorite(record)">
                            <template #icon>
                              <StarFilled v-if="record.favorited" />
                              <StarOutlined v-else />
                            </template>
                          </a-button>
                          <a-button size="small" @click="record.applied ? openProgressModal(record) : openCoachingModal(record)">
                            <template #icon><FileTextOutlined /></template>
                            {{ record.applied ? '进度' : '申请辅导' }}
                          </a-button>
                        </a-space>
                      </template>
                    </template>
                  </a-table>
                </div>
              </div>
            </div>
          </div>

          <div class="positions-summary">
            <span class="summary-total">共 <strong>{{ filteredPositions.length }}</strong> 个岗位</span>
            <span class="summary-open">
              <i class="mdi mdi-circle-small" aria-hidden="true"></i>
              开放中 {{ openPositionsCount }}
            </span>
            <span class="summary-closed">
              <i class="mdi mdi-circle-small" aria-hidden="true"></i>
              已关闭 {{ closedPositionsCount }}
            </span>
          </div>
      </div>

      <a-card v-else :bordered="false">
        <a-table
          :columns="listColumns"
          :data-source="filteredPositions"
          :pagination="{ pageSize: 10 }"
          :row-key="(record: PositionRecord) => record.id"
          :scroll="{ x: 1100 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'title'">
              <a :href="record.url" target="_blank" class="job-link">
                {{ record.title }}
                <ExportOutlined />
              </a>
            </template>

            <template v-else-if="column.key === 'category'">
              <a-tag :color="getCategoryColor(record.category)">{{ record.categoryText }}</a-tag>
            </template>

            <template v-else-if="column.key === 'actions'">
              <a-space :size="6">
                <a-button size="small" :type="record.applied ? 'primary' : 'default'" @click="handleAppliedButton(record)">
                  {{ record.applied ? '已投递' : '投递' }}
                </a-button>
                <a-button size="small" @click="openProgressModal(record)">进度</a-button>
              </a-space>
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
        <a-table
          :columns="favoriteColumns"
          :data-source="favoritePositions"
          :pagination="false"
          :row-key="(record: PositionRecord) => `favorite-${record.id}`"
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

            <template v-else-if="column.key === 'actions'">
              <a-space :size="6">
                <a-button size="small" @click="toggleFavorite(record)">取消收藏</a-button>
                <a-button size="small" :type="record.applied ? 'primary' : 'default'" @click="handleAppliedButton(record)">
                  {{ record.applied ? '已投递' : '投递' }}
                </a-button>
                <a-button type="primary" size="small" @click="openCoachingModal(record)">申请辅导</a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <a-modal
      v-model:open="manualAddOpen"
      title="手动添加岗位"
      ok-text="添加岗位"
      cancel-text="取消"
      :width="640"
      @ok="submitManualPosition"
    >
      <div class="manual-add-tip">
        <InfoCircleOutlined />
        找不到想申请的岗位？填写以下信息手动添加到您的求职列表
      </div>

      <div class="manual-section">
        <div class="manual-section-title">基本信息</div>
        <div class="manual-section-grid">
          <div class="manual-field">
            <label class="manual-label">岗位分类 <span class="req">*</span></label>
            <a-select v-model:value="manualForm.category" placeholder="请选择" style="width:100%">
              <a-select-option v-for="option in filterOptions.categories" :key="option.value" :value="option.value">
                {{ option.label }}
              </a-select-option>
            </a-select>
          </div>
          <div class="manual-field">
            <label class="manual-label">岗位名称 <span class="req">*</span></label>
            <a-input v-model:value="manualForm.title" placeholder="如：IB Analyst" />
          </div>
          <div class="manual-field">
            <label class="manual-label">部门 <span class="optional">（选填）</span></label>
            <a-input v-model:value="manualForm.department" placeholder="如：IBD / S&T" />
          </div>
          <div class="manual-field manual-field--span2">
            <label class="manual-label">招聘周期 <span class="req">*</span></label>
            <div class="cycle-checkboxes">
              <label v-for="cycle in RECRUITMENT_CYCLES" :key="cycle" class="cycle-checkbox">
                <input v-model="manualForm.recruitmentCycles" type="checkbox" :value="cycle" />
                {{ cycle }}
              </label>
            </div>
          </div>
          <div class="manual-field">
            <label class="manual-label">项目时间 <span class="req">*</span></label>
            <a-select v-model:value="manualForm.projectYear" placeholder="请选择" style="width:100%">
              <a-select-option v-for="year in PROJECT_YEARS" :key="year" :value="year">{{ year }}</a-select-option>
            </a-select>
          </div>
          <div class="manual-field">
            <label class="manual-label">截止日期 <span class="optional">（选填）</span></label>
            <a-input v-model:value="manualForm.deadline" type="date" style="width:100%" />
          </div>
        </div>
      </div>

      <div class="manual-section">
        <div class="manual-section-title">公司信息</div>
        <div class="manual-section-grid">
          <div class="manual-field">
            <label class="manual-label">公司名称 <span class="req">*</span></label>
            <a-input v-model:value="manualForm.company" placeholder="如：Goldman Sachs" />
          </div>
          <div class="manual-field">
            <label class="manual-label">公司类别 <span class="req">*</span></label>
            <a-select v-model:value="manualForm.companyType" placeholder="请选择" style="width:100%">
              <a-select-option v-for="t in COMPANY_TYPES" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
            </a-select>
          </div>
          <div class="manual-field">
            <label class="manual-label">大区 <span class="req">*</span></label>
            <a-select v-model:value="manualForm.region" placeholder="请选择" style="width:100%" @change="onManualRegionChange">
              <a-select-option v-for="r in REGIONS" :key="r.value" :value="r.value">{{ r.label }}</a-select-option>
            </a-select>
          </div>
          <div class="manual-field">
            <label class="manual-label">城市 <span class="req">*</span></label>
            <a-select v-model:value="manualForm.city" placeholder="请先选择大区" style="width:100%" :disabled="!manualForm.region">
              <a-select-option v-for="city in manualCityOptions" :key="city" :value="city">{{ city }}</a-select-option>
            </a-select>
          </div>
          <div class="manual-field">
            <label class="manual-label">公司官网 <span class="req">*</span></label>
            <a-input v-model:value="manualForm.website" placeholder="https://..." />
          </div>
          <div class="manual-field">
            <label class="manual-label">岗位链接 <span class="req">*</span></label>
            <a-input v-model:value="manualForm.link" placeholder="https://..." />
          </div>
        </div>
      </div>

      <div class="manual-section">
        <div class="manual-section-title">辅导需求</div>
        <div class="manual-coaching-options">
          <label class="coaching-radio" :class="{ 'coaching-radio--selected': !manualForm.needCoaching }">
            <input v-model="manualForm.needCoaching" type="radio" :value="false" />
            暂不需要辅导，仅添加到追踪列表
          </label>
          <label class="coaching-radio" :class="{ 'coaching-radio--selected': manualForm.needCoaching }">
            <input v-model="manualForm.needCoaching" type="radio" :value="true" />
            需要辅导，同时申请导师辅导
          </label>
        </div>

        <div v-if="manualForm.needCoaching" class="manual-coaching-fields">
          <div class="manual-field manual-field--full">
            <label class="manual-label">你现在处于什么阶段？ <span class="req">*</span></label>
            <a-select v-model:value="manualForm.coachingStage" placeholder="请选择面试阶段" style="width:100%">
              <a-select-option value="hirevue">HireVue or Online Test（在线测试）</a-select-option>
              <a-select-option value="screening">Screening Call</a-select-option>
              <a-select-option value="first">First Round</a-select-option>
              <a-select-option value="second">Second Round</a-select-option>
              <a-select-option value="third">Third Round and Beyond</a-select-option>
              <a-select-option value="case">Case Study Round</a-select-option>
              <a-select-option value="superday">Superday / Assessment Centre / AC</a-select-option>
            </a-select>
          </div>

          <div v-if="manualCoachingIsHirevue" class="manual-hirevue-card">
            <div class="manual-hirevue-title"><span>HireVue / Online Test 信息</span></div>
            <div class="manual-field manual-field--full">
              <label class="manual-label">请选择类型 <span class="req">*</span></label>
              <div class="inline-radios">
                <label><input v-model="manualForm.hirevueType" type="radio" value="vi" /> VI (Video Interview)</label>
                <label><input v-model="manualForm.hirevueType" type="radio" value="ot" /> OT (Online Test)</label>
              </div>
            </div>
            <div v-if="manualForm.hirevueType === 'vi'" class="manual-field manual-field--full">
              <label class="manual-label">VI 链接 <span class="req">*</span></label>
              <a-input v-model:value="manualForm.viLink" placeholder="请输入 Video Interview 链接" />
            </div>
            <template v-if="manualForm.hirevueType === 'ot'">
              <div class="manual-field manual-field--full">
                <label class="manual-label">OT 链接 <span class="req">*</span></label>
                <a-input v-model:value="manualForm.otLink" placeholder="请输入 Online Test 链接" />
              </div>
              <div class="manual-section-grid">
                <div class="manual-field">
                  <label class="manual-label">登录账号 <span class="req">*</span></label>
                  <a-input v-model:value="manualForm.otAccount" placeholder="账号" />
                </div>
                <div class="manual-field">
                  <label class="manual-label">登录密码 <span class="req">*</span></label>
                  <a-input v-model:value="manualForm.otPassword" placeholder="密码" />
                </div>
              </div>
            </template>
            <div class="manual-field manual-field--full">
              <label class="manual-label">截止时间 <span class="req">*</span></label>
              <a-input v-model:value="manualForm.hirevueDeadline" type="datetime-local" style="width:100%" />
              <span class="field-helper">请填写 VI/OT 的截止时间</span>
            </div>
            <div class="manual-field manual-field--full">
              <label class="manual-label">上传邀请邮件截图 <span class="req">*</span></label>
              <input id="manual-hirevue-upload" type="file" accept="image/*" style="display:none" @change="handleManualHirevueUpload" />
              <label class="upload-dropzone upload-dropzone--compact" for="manual-hirevue-upload">
                <CloudUploadOutlined class="upload-dropzone__icon" />
                <span class="upload-dropzone__title">点击上传截图</span>
                <span class="upload-dropzone__helper">支持 JPG、PNG 格式</span>
                <span v-if="manualForm.inviteScreenshotName" class="upload-dropzone__file">{{ manualForm.inviteScreenshotName }}</span>
              </label>
            </div>
            <div class="manual-field manual-field--full">
              <label class="manual-label">是否需要导师协助？ <span class="req">*</span></label>
              <div class="inline-radios">
                <label><input v-model="manualForm.mentorHelp" type="radio" value="yes" /> 是，需要导师协助</label>
                <label><input v-model="manualForm.mentorHelp" type="radio" value="no" /> 否，仅需题库权限</label>
              </div>
            </div>
          </div>

          <template v-if="manualCoachingShowInterview">
            <div class="manual-field manual-field--full">
              <label class="manual-label">该阶段的面试时间 <span class="req">*</span></label>
              <a-input v-model:value="manualForm.interviewTime" type="datetime-local" style="width:100%" />
              <span class="field-helper">请填写该阶段面试的具体时间，方便导师安排辅导</span>
            </div>
            <div class="manual-section-grid">
              <div class="manual-field">
                <label class="manual-label">意向导师 <span class="optional">（选填）</span></label>
                <a-input v-model:value="manualForm.preferMentor" placeholder="如有特别想要的导师，请填写导师姓名" />
              </div>
              <div class="manual-field">
                <label class="manual-label">排除导师 <span class="optional">（选填）</span></label>
                <a-input v-model:value="manualForm.excludeMentor" placeholder="如有不想选择的导师，请填写导师姓名" />
              </div>
            </div>
          </template>

          <div class="manual-field manual-field--full">
            <label class="manual-label">备注说明 <span class="optional">（选填）</span></label>
            <a-textarea v-model:value="manualForm.note" :rows="2" placeholder="如有其他需求或说明，请在此填写..." />
          </div>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="progressModalOpen"
      title="记录岗位进度"
      ok-text="保存进度"
      cancel-text="取消"
      @ok="submitProgressUpdate"
    >
      <div v-if="selectedPosition" class="modal-job-card progress-card">
        <div class="modal-job-title">{{ selectedPosition.company }}</div>
        <div class="modal-job-sub">{{ selectedPosition.title }} · {{ selectedPosition.location }}</div>
      </div>
      <a-form layout="vertical">
        <a-form-item label="当前阶段">
          <a-select v-model:value="progressForm.stage">
            <a-select-option v-for="option in filterOptions.progressStages" :key="option.value" :value="option.value">
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="progressForm.note" :rows="3" placeholder="记录这一轮的关键进展或提醒" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="appliedModalOpen"
      title="标记已投递"
      ok-text="确认投递"
      cancel-text="取消"
      @ok="submitAppliedMark"
    >
      <div v-if="selectedPosition" class="modal-job-card applied-card">
        <div class="modal-job-title">{{ selectedPosition.company }}</div>
        <div class="modal-job-sub">{{ selectedPosition.title }} · {{ selectedPosition.location }}</div>
      </div>
      <a-form layout="vertical">
        <a-form-item label="投递日期">
          <a-input v-model:value="appliedForm.date" type="date" />
        </a-form-item>
        <a-form-item label="投递方式">
          <a-select v-model:value="appliedForm.method">
            <a-select-option v-for="option in filterOptions.applyMethods" :key="option.value" :value="option.value">
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="appliedForm.note" :rows="3" placeholder="如：投递了哪个部门或是否有内推" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="coachingModalOpen"
      title="申请面试辅导"
      ok-text="提交申请"
      cancel-text="取消"
      @ok="submitCoachingApplication"
    >
      <div v-if="selectedPosition" class="modal-job-card coaching-card">
        <div class="modal-job-title">{{ selectedPosition.company }}</div>
        <div class="modal-job-sub">{{ selectedPosition.title }} · {{ selectedPosition.location }}</div>
      </div>
      <a-form layout="vertical">
        <a-form-item label="当前面试阶段">
          <a-select v-model:value="coachingForm.stage" placeholder="请选择当前阶段">
            <a-select-option v-for="option in filterOptions.coachingStages" :key="option.value" :value="option.value">
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="导师数量">
          <a-select v-model:value="coachingForm.mentorCount" placeholder="请选择导师数量">
            <a-select-option v-for="option in filterOptions.mentorCounts" :key="option.value" :value="option.value">
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注说明">
          <a-textarea v-model:value="coachingForm.note" :rows="3" placeholder="如有特殊辅导需求，请在这里补充" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
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
import {
  AppstoreOutlined,
  BankOutlined,
  BulbOutlined,
  CheckCircleFilled,
  CheckOutlined,
  CloudUploadOutlined,
  CodeOutlined,
  ExportOutlined,
  FileTextOutlined,
  FundOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  RightOutlined,
  StarFilled,
  StarOutlined,
  UnorderedListOutlined
} from '@ant-design/icons-vue'

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
  icon: unknown
  sort: number
  companies: CompanyGroup[]
  companyCount: number
  positionCount: number
}

const router = useRouter()

const positionsActionTriggers = [
  { actionId: 'manual-add', label: '手动添加岗位' },
  { actionId: 'drilldown-applied-1', label: 'Goldman Sachs / IB Analyst / 已投递' },
  { actionId: 'drilldown-favorite-1', label: 'Goldman Sachs / IB Analyst / 收藏' },
  { actionId: 'drilldown-progress-1', label: 'Goldman Sachs / IB Analyst / 进度' },
  { actionId: 'drilldown-applied-2', label: 'JP Morgan / S&T Analyst / 未投递' },
  { actionId: 'drilldown-favorite-2', label: 'JP Morgan / S&T Analyst / 收藏' },
  { actionId: 'drilldown-coaching-2', label: 'JP Morgan / S&T Analyst / 申请辅导' },
  { actionId: 'drilldown-applied-3', label: 'McKinsey / Business Analyst / 未投递' },
  { actionId: 'drilldown-favorite-3', label: 'McKinsey / Business Analyst / 收藏' },
  { actionId: 'drilldown-coaching-3', label: 'McKinsey / Business Analyst / 申请辅导' },
  { actionId: 'favorite-unfavorite-1', label: 'JP Morgan / 取消收藏' },
  { actionId: 'favorite-apply-1', label: 'JP Morgan / 投递' },
  { actionId: 'favorite-coaching-1', label: 'JP Morgan / 申请辅导' },
  { actionId: 'favorite-unfavorite-2', label: 'McKinsey / 取消收藏' },
  { actionId: 'favorite-coaching-2', label: 'McKinsey / 申请辅导' }
] as const

const viewMode = ref<ViewMode>('drilldown')
const activeTab = ref<TabKey>('all')
const activeCategories = ref(['ib'])
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

const RECRUITMENT_CYCLES = ['2024 Summer', '2024 Full-time', '2025 Summer', '2025 Full-time', '2026 Summer', '2026 Full-time']

const CITY_OPTIONS: Record<string, string[]> = {
  na: ['New York', 'San Francisco', 'Houston', 'Boston', 'Toronto'],
  eu: ['London', 'Paris', 'Frankfurt', 'Zurich'],
  ap: ['Hong Kong', 'Singapore', 'Tokyo', 'Sydney'],
  cn: ['Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou']
}

const COMPANY_TYPES = [
  { value: 'ib', label: 'Investment Bank' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'tech', label: 'Tech' },
  { value: 'pe', label: 'PE' },
  { value: 'vc', label: 'VC' },
  { value: 'other', label: 'Other' }
]

const REGIONS = [
  { value: 'na', label: '🌎 北美' },
  { value: 'eu', label: '🌍 欧洲' },
  { value: 'ap', label: '🌏 亚太' },
  { value: 'cn', label: '🇨🇳 中国大陆' }
]

const PROJECT_YEARS = ['2024', '2025', '2026', '2027']

const manualForm = ref({
  category: undefined as string | undefined,
  title: '',
  department: '',
  recruitmentCycles: [] as string[],
  projectYear: undefined as string | undefined,
  deadline: '',
  company: '',
  companyType: undefined as string | undefined,
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
  method: '官网投递',
  note: ''
})

const coachingForm = ref({
  stage: undefined as string | undefined,
  mentorCount: undefined as string | undefined,
  note: ''
})

const positionColumns = [
  { title: '岗位名称', key: 'title', width: 240 },
  { title: '岗位分类', key: 'category', width: 110 },
  { title: '部门', dataIndex: 'department', width: 100 },
  { title: '地区', dataIndex: 'location', width: 110 },
  { title: '招聘周期', dataIndex: 'recruitCycle', width: 130 },
  { title: '发布时间', dataIndex: 'publishDate', width: 100 },
  { title: '截止时间', dataIndex: 'deadline', width: 100 },
  { title: '操作', key: 'actions', width: 240, fixed: 'right' }
]

const listColumns = [
  { title: '岗位名称', key: 'title', width: 220 },
  { title: '公司', dataIndex: 'company', width: 150 },
  { title: '岗位分类', key: 'category', width: 110 },
  { title: '地区', dataIndex: 'location', width: 110 },
  { title: '截止时间', dataIndex: 'deadline', width: 120 },
  { title: '操作', key: 'actions', width: 180 }
]

const favoriteColumns = [
  { title: '公司/岗位', key: 'job' },
  { title: '部门', dataIndex: 'department', width: 120 },
  { title: '地区', dataIndex: 'location', width: 120 },
  { title: '招聘周期', key: 'recruitCycle', width: 140 },
  { title: '截止时间', dataIndex: 'deadline', width: 120 },
  { title: '收藏时间', dataIndex: 'publishDate', width: 120 },
  { title: '操作', key: 'actions', width: 240 }
]

const selectedPosition = computed(() =>
  positions.value.find((record) => record.id === selectedPositionId.value) ?? null
)

const industryIconComponents: Record<string, unknown> = {
  bank: BankOutlined,
  bulb: BulbOutlined,
  code: CodeOutlined,
  fund: FundOutlined
}

const manualCityOptions = computed(() =>
  manualForm.value.region ? (CITY_OPTIONS[manualForm.value.region] ?? []) : []
)

const manualCoachingIsHirevue = computed(() => manualForm.value.coachingStage === 'hirevue')
const manualCoachingShowInterview = computed(() =>
  !!manualForm.value.coachingStage && manualForm.value.coachingStage !== 'hirevue'
)

function onManualRegionChange() {
  manualForm.value.city = undefined
}

function handleManualHirevueUpload(event: Event) {
  const input = event.target as HTMLInputElement
  manualForm.value.inviteScreenshotName = input.files?.[0]?.name ?? ''
}

const categoryOptionsByValue = computed(() => optionMap(filterOptions.value.categories))
const industryOptionsByValue = computed(() => optionMap(filterOptions.value.industries))
const companyOptionsByValue = computed(() => optionMap(filterOptions.value.companies))
const locationOptionsByValue = computed(() => optionMap(filterOptions.value.locations))

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
const manualPositionsCount = computed(() =>
  filteredPositions.value.filter((record) => record.sourceType === 'manual').length
)
const openPositionsCount = computed(() =>
  filteredPositions.value.filter((record) => !isDeadlineClosed(record.deadline)).length
)
const closedPositionsCount = computed(() => filteredPositions.value.length - openPositionsCount.value)

const groupedIndustries = computed<IndustryGroup[]>(() => {
  const groups = new Map<IndustryKey, {
    key: IndustryKey
    label: string
    icon: unknown
    sort: number
    companies: Map<string, CompanyGroup>
  }>()

  for (const record of filteredPositions.value) {
    const meta = industryOptionsByValue.value.get(record.industry)
    const industryGroup = groups.get(record.industry) ?? {
      key: record.industry,
      label: meta?.label ?? record.industryLabel ?? record.industry,
      icon: iconForIndustry(meta?.iconKey ?? record.industryIconKey),
      sort: Number(meta?.sort ?? 999),
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

  const order: IndustryKey[] = ['ib', 'consulting', 'tech', 'pevc']

  return Array.from(groups.values())
    .sort((left, right) => {
      const leftOrder = order.indexOf(left.key)
      const rightOrder = order.indexOf(right.key)
      if (leftOrder >= 0 || rightOrder >= 0) {
        return leftOrder - rightOrder
      }
      return left.sort - right.sort
    })
    .map((group) => {
      const companies = Array.from(group.companies.values())
      return {
        key: group.key,
        label: group.label,
        icon: group.icon,
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

function getCompanyBrandColor(companyKey: string) {
  return companyOptionsByValue.value.get(companyKey)?.brandColor ?? '#4F46E5'
}

function iconForIndustry(iconKey?: string) {
  return industryIconComponents[iconKey ?? 'bank'] ?? BankOutlined
}

function isDeadlineClosed(deadline: string) {
  if (!/^\d{2}-\d{2}$/.test(deadline)) {
    return false
  }

  const [monthText, dayText] = deadline.split('-')
  const month = Number(monthText)
  const day = Number(dayText)
  if (!Number.isInteger(month) || !Number.isInteger(day)) {
    return false
  }

  const now = new Date()
  const deadlineDate = new Date(now.getFullYear(), month - 1, day, 23, 59, 59, 999)
  return deadlineDate.getTime() < now.getTime()
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
    category: undefined,
    title: '',
    department: '',
    recruitmentCycles: [],
    projectYear: undefined,
    deadline: '',
    company: '',
    companyType: undefined,
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
    mentorHelp: undefined,
    interviewTime: '',
    mentorCount: undefined,
    preferMentor: '',
    excludeMentor: '',
    note: ''
  }
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

  const methodMap: Record<string, string> = {
    '官网投递': 'official',
    '内推': 'referral',
    '邮件投递': 'campus'
  }
  filterOptions.value.applyMethods = filterOptions.value.applyMethods.map((m) => ({
    label: m.label,
    value: methodMap[m.value] ?? m.value
  }))
}

function setSelectedPosition(record: PositionRecord) {
  selectedPositionId.value = record.id
}

function openProgressModal(record: PositionRecord) {
  setSelectedPosition(record)
  progressForm.value = {
    stage: record.progressStage || 'applied',
    note: record.progressNote
  }
  progressModalOpen.value = true
}

function openAppliedModal(record: PositionRecord) {
  setSelectedPosition(record)
  appliedForm.value = {
    date: appliedForm.value.date || '2026-03-15',
    method: '官网投递',
    note: ''
  }
  appliedModalOpen.value = true
}

function openCoachingModal(record: PositionRecord) {
  setSelectedPosition(record)
  coachingForm.value = {
    stage: undefined,
    mentorCount: undefined,
    note: ''
  }
  coachingModalOpen.value = true
}

async function handleAppliedButton(record: PositionRecord) {
  if (record.applied) {
    await updateStudentPositionApply({
      positionId: record.id,
      applied: false
    })
    await loadPositions()
    message.success(`已取消 ${record.company} ${record.title} 的投递标记`)
    return
  }

  openAppliedModal(record)
}

async function toggleFavorite(record: PositionRecord) {
  const nextFavorited = !record.favorited
  await updateStudentPositionFavorite({
    positionId: record.id,
    favorited: nextFavorited
  })
  const target = positions.value.find((p) => p.id === record.id)
  if (target) target.favorited = nextFavorited
  message.success(nextFavorited ? '已收藏！可在“我的收藏”中查看。' : '已取消收藏')
}

async function submitManualPosition() {
  const f = manualForm.value
  if (!f.category || !f.title || !f.company || !f.city) {
    message.error('请完整填写岗位分类、岗位名称、公司名称和城市')
    return
  }

  if (f.needCoaching) {
    if (!f.coachingStage) {
      message.error('请选择当前面试阶段')
      return
    }
    if (f.coachingStage === 'hirevue') {
      if (!f.hirevueType) {
        message.error('请选择 VI 或 OT 类型')
        return
      }
      if (f.hirevueType === 'vi' && !f.viLink) {
        message.error('请填写 VI 链接')
        return
      }
      if (f.hirevueType === 'ot' && (!f.otLink || !f.otAccount || !f.otPassword)) {
        message.error('请完整填写 OT 链接、账号和密码')
        return
      }
      if (!f.hirevueDeadline) {
        message.error('请填写截止时间')
        return
      }
    } else {
      if (!f.interviewTime) {
        message.error('请填写面试时间')
        return
      }
    }
  }

  await createStudentManualPosition({
    category: f.category,
    title: f.title,
    company: f.company,
    location: f.city,
    recruitmentCycle: f.recruitmentCycles.join(', ') || undefined,
    projectYear: f.projectYear,
    companyType: f.companyType,
    region: f.region,
    city: f.city,
    website: f.website || undefined,
    link: f.link || undefined,
    deadline: f.deadline || undefined,
    needCoaching: f.needCoaching,
    coachingStage: f.needCoaching ? f.coachingStage : undefined,
    mentorCount: f.needCoaching && f.coachingStage !== 'hirevue' ? f.mentorCount : undefined,
    hirevueType: f.needCoaching && f.coachingStage === 'hirevue' ? f.hirevueType : undefined,
    viLink: f.needCoaching && f.hirevueType === 'vi' ? f.viLink : undefined,
    otLink: f.needCoaching && f.hirevueType === 'ot' ? f.otLink : undefined,
    otAccount: f.needCoaching && f.hirevueType === 'ot' ? f.otAccount : undefined,
    otPassword: f.needCoaching && f.hirevueType === 'ot' ? f.otPassword : undefined,
    hirevueDeadline: f.needCoaching && f.coachingStage === 'hirevue' ? f.hirevueDeadline : undefined,
    inviteScreenshotName: f.inviteScreenshotName || undefined,
    mentorHelp: f.needCoaching && f.coachingStage === 'hirevue' ? f.mentorHelp : undefined,
    interviewTime: f.needCoaching && f.coachingStage !== 'hirevue' ? f.interviewTime : undefined,
    preferMentor: f.needCoaching ? f.preferMentor || undefined : undefined,
    excludeMentor: f.needCoaching ? f.excludeMentor || undefined : undefined,
    note: f.note || undefined
  })
  await Promise.all([loadPositions(), loadPositionMeta()])
  manualAddOpen.value = false
  message.success('岗位已添加到您的追踪列表')
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
  message.success('岗位进度已更新')
}

async function submitAppliedMark() {
  if (!selectedPosition.value) {
    return
  }

  if (!appliedForm.value.date) {
    message.error('请选择投递日期')
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
  message.success('已标记为已投递')
}

async function submitCoachingApplication() {
  if (!selectedPosition.value) {
    return
  }

  if (!coachingForm.value.stage) {
    message.error('请选择当前面试阶段')
    return
  }

  if (!coachingForm.value.mentorCount) {
    message.error('请选择导师数量')
    return
  }

  await requestStudentPositionCoaching({
    positionId: selectedPosition.value.id,
    stage: coachingForm.value.stage,
    mentorCount: coachingForm.value.mentorCount,
    note: coachingForm.value.note
  })
  await loadPositions()
  coachingModalOpen.value = false
  message.success('辅导申请已提交')
}

onMounted(() => {
  void Promise.all([loadPositions(), loadPositionMeta()])
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
    align-items: center;
    gap: 4px;
    margin-bottom: 16px;
    border-radius: 6px;
    padding: 3px;
    background: #f1f5f9;
  }

  .content-tab-trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    border-radius: 4px;
    padding: 6px 14px;
    background: transparent;
    color: #334155;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .content-tab-trigger--active {
    background: #2563eb;
    color: #fff;
  }

  .content-tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 6px;
    border-radius: 8px;
    background: #f59e0b;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }

  .content-tab-trigger--active .content-tab-badge {
    background: rgba(255, 255, 255, 0.2);
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

  .industry-ib .industry-header {
    background: linear-gradient(135deg, #eef2ff, #dde7ff);
    color: #4567b7;
  }

  .industry-consulting .industry-header {
    background: linear-gradient(135deg, #f3e8ff, #ead8ff);
    color: #7c3aed;
  }

  .industry-tech .industry-header {
    background: linear-gradient(135deg, #dbeafe, #c7dcff);
    color: #2563eb;
  }

  .industry-pevc .industry-header {
    background: linear-gradient(135deg, #dcfce7, #c9f6d4);
    color: #15803d;
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
